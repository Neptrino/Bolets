const MAX_BODY_BYTES = 8_192;
const MAX_CLOCK_SKEW_SECONDS = 120;
const UPSTREAM_TIMEOUT_MS = 45_000;
const ALLOWED_PATHS = new Set(["/v1/forecast", "/v1/meteofrance", "/v1/ecmwf"]);
const ALLOWED_PARAMETERS = new Set([
  "latitude",
  "longitude",
  "elevation",
  "past_hours",
  "forecast_hours",
  "current",
  "hourly",
  "daily",
  "models",
  "timezone",
  "timeformat",
]);
const ALLOWED_MODELS = new Set(["arome_france", "meteofrance_seamless", "ecmwf_ifs"]);

export type RelayDependencies = {
  egress?: "aws" | "cloudflare";
  fetcher?: typeof fetch;
  now?: () => number;
};

// Encrypted secrets intentionally do not appear in wrangler.jsonc, so this
// binding complements Wrangler's generated runtime declarations.
type WorkerEnv = { RELAY_HMAC_SECRET: string };

function errorResponse(error: string, status: number) {
  return Response.json({ error }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function parseNumberList(value: string | null, minimum: number, maximum: number) {
  if (!value) return undefined;
  const values = value.split(",").map((entry) => Number(entry));
  if (!values.length || values.some((entry) => !Number.isFinite(entry) || entry < minimum || entry > maximum)) {
    return undefined;
  }
  return values;
}

function validateUpstreamUrl(rawUrl: string) {
  if (rawUrl.length > MAX_BODY_BYTES) return undefined;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "api.open-meteo.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    !ALLOWED_PATHS.has(url.pathname)
  ) return undefined;

  const seen = new Set<string>();
  for (const key of url.searchParams.keys()) {
    if (!ALLOWED_PARAMETERS.has(key) || seen.has(key)) return undefined;
    seen.add(key);
  }
  const latitudes = parseNumberList(url.searchParams.get("latitude"), -90, 90);
  const longitudes = parseNumberList(url.searchParams.get("longitude"), -180, 180);
  if (
    !latitudes ||
    !longitudes ||
    latitudes.length !== longitudes.length ||
    latitudes.length > 100
  ) return undefined;
  const elevations = url.searchParams.get("elevation")
    ? parseNumberList(url.searchParams.get("elevation"), -500, 9_000)
    : undefined;
  if (elevations && elevations.length !== 1 && elevations.length !== latitudes.length) return undefined;

  for (const key of ["past_hours", "forecast_hours"] as const) {
    const raw = url.searchParams.get(key);
    if (raw !== null && (!/^\d{1,4}$/.test(raw) || Number(raw) > 1_000)) return undefined;
  }
  const models = url.searchParams.get("models")?.split(",").filter(Boolean) ?? [];
  if (models.some((model) => !ALLOWED_MODELS.has(model))) return undefined;
  const timezone = url.searchParams.get("timezone");
  if (timezone && timezone !== "Europe/Madrid" && timezone !== "UTC") return undefined;
  const timeformat = url.searchParams.get("timeformat");
  if (timeformat && timeformat !== "unixtime" && timeformat !== "iso8601") return undefined;
  return url;
}

function hexBytes(value: string) {
  if (!/^[a-f0-9]{64}$/i.test(value)) return undefined;
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function verifySignature(secret: string, timestamp: string, rawUrl: string, signature: string) {
  const signatureBytes = hexBytes(signature);
  if (!signatureBytes) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(`${timestamp}\n${rawUrl}`),
  );
}

export async function createRelaySignature(secret: string, timestamp: string, rawUrl: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}\n${rawUrl}`),
  ));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readRelayBody(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return undefined;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return undefined;
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    const rawUrl = Reflect.get(value, "url");
    return typeof rawUrl === "string" ? rawUrl : undefined;
  } catch {
    return undefined;
  }
}

export async function handleRelayRequest(
  request: Request,
  env: WorkerEnv,
  dependencies: RelayDependencies = {},
) {
  const egress = dependencies.egress ?? "cloudflare";
  const requestUrl = new URL(request.url);
  if (request.method === "GET" && requestUrl.pathname === "/health") {
    return Response.json({ ok: true, service: "bolets-open-meteo-relay" }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (request.method !== "POST" || requestUrl.pathname !== "/v1/fetch") {
    return errorResponse("Not found", 404);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return errorResponse("Expected JSON", 415);
  }

  const rawUrl = await readRelayBody(request);
  if (!rawUrl) return errorResponse("Invalid request body", 400);
  const timestamp = request.headers.get("x-bolets-relay-timestamp");
  const signature = request.headers.get("x-bolets-relay-signature");
  const timestampSeconds = timestamp && /^\d{10}$/.test(timestamp) ? Number(timestamp) : Number.NaN;
  const nowMilliseconds = (dependencies.now ?? Date.now)();
  if (
    !signature ||
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Math.floor(nowMilliseconds / 1_000) - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS ||
    !await verifySignature(env.RELAY_HMAC_SECRET, timestamp!, rawUrl, signature)
  ) return errorResponse("Unauthorized", 401);

  const upstreamUrl = validateUpstreamUrl(rawUrl);
  if (!upstreamUrl) return errorResponse("Open-Meteo request is not allowed", 403);

  const startedAt = Date.now();
  try {
    const upstream = await (dependencies.fetcher ?? fetch)(upstreamUrl, {
      headers: { "User-Agent": "Bolets-Atles/1.0" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      console.warn(JSON.stringify({
        message: "Open-Meteo relay rejected an upstream redirect",
        egress,
        path: upstreamUrl.pathname,
        status: upstream.status,
        durationMs: Date.now() - startedAt,
      }));
      return errorResponse("Unexpected upstream redirect", 502);
    }
    console.log(JSON.stringify({
      message: "Open-Meteo relay request completed",
      egress,
      path: upstreamUrl.pathname,
      locations: upstreamUrl.searchParams.get("latitude")?.split(",").length ?? 0,
      status: upstream.status,
      durationMs: Date.now() - startedAt,
    }));
    const headers = new Headers({
      "Cache-Control": "no-store",
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "X-Bolets-Egress": egress,
      "X-Content-Type-Options": "nosniff",
    });
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) headers.set("Retry-After", retryAfter);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    console.error(JSON.stringify({
      message: "Open-Meteo relay request failed",
      egress,
      path: upstreamUrl.pathname,
      error: error instanceof Error ? error.message : "Unknown relay error",
      durationMs: Date.now() - startedAt,
    }));
    return errorResponse("Upstream request failed", 502);
  }
}

export default {
  fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleRelayRequest(request, env);
  },
} satisfies {
  fetch(request: Request, env: WorkerEnv): Promise<Response>;
};
