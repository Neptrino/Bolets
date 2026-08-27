export type OpenMeteoLocation = {
  latitude?: number;
  longitude?: number;
  elevation?: number;
  utc_offset_seconds?: number;
  current?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
};

export type RequestProfile = "complete" | "atmosphere" | "soil";
export type OpenMeteoEgressLane = "aws" | "cloudflare" | "direct";

export type FetchOpenMeteoOptions = {
  attempts?: number;
  egressLane?: OpenMeteoEgressLane;
};

export class OpenMeteoRequestError extends Error {
  readonly status: number;
  readonly egressLane: OpenMeteoEgressLane;
  readonly retryAfterSeconds?: number;

  constructor(
    context: string,
    status: number,
    egressLane: OpenMeteoEgressLane,
    retryAfterSeconds?: number,
  ) {
    super(`Open-Meteo ${context} request returned ${status}`);
    this.name = "OpenMeteoRequestError";
    this.status = status;
    this.egressLane = egressLane;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const FORECAST_HORIZON_HOURS = [24, 48, 72, 96, 120] as const;
export const FORECAST_BASELINE_HOURS = 0 as const;
export const FORECAST_OUTPUT_HOURS = [FORECAST_BASELINE_HOURS, ...FORECAST_HORIZON_HOURS] as const;
// Portable hydrothermal-v1 thresholds. Species vary the decay/half-life of
// these exposures in the scorer, while ingestion keeps one stable contract.
export const RAINFALL_DAY_THRESHOLD_MM = 1;
export const HEAT_HOUR_THRESHOLD_C = 27;

export const finiteNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function parseRetryAfterSeconds(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(86_400, Math.ceil(seconds));
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return undefined;
  return Math.min(86_400, Math.max(1, Math.ceil((date - Date.now()) / 1_000)));
}

// A stalled provider connection must fail fast: without a deadline, a hung
// request keeps its worker alive until the platform kills it, the run stays
// "running" forever, and overlapping cron ticks pile more concurrent
// connections onto the provider's per-IP guard.
const OPEN_METEO_REQUEST_TIMEOUT_MS = 45_000;

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signRelayRequest(secret: string, timestamp: string, upstreamUrl: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}\n${upstreamUrl}`),
  ));
}

function edgeEnvironmentValue(name: string) {
  const deno = Reflect.get(globalThis, "Deno");
  if (!deno || typeof deno !== "object") return undefined;
  const environment = Reflect.get(deno, "env");
  if (!environment || typeof environment !== "object") return undefined;
  const get = Reflect.get(environment, "get");
  if (typeof get !== "function") return undefined;
  const value: unknown = Reflect.apply(get, environment, [name]);
  return typeof value === "string" ? value : undefined;
}

async function fetchOpenMeteoResponse(url: URL, egressLane: OpenMeteoEgressLane) {
  if (egressLane === "direct") {
    return fetch(url, {
      headers: { "User-Agent": "Bolets-Atles/1.0" },
      signal: AbortSignal.timeout(OPEN_METEO_REQUEST_TIMEOUT_MS),
    });
  }

  const relayUrlName = egressLane === "aws"
    ? "OPEN_METEO_AWS_RELAY_URL"
    : "OPEN_METEO_CF_RELAY_URL";
  const relaySecretName = egressLane === "aws"
    ? "OPEN_METEO_AWS_RELAY_HMAC_SECRET"
    : "OPEN_METEO_RELAY_HMAC_SECRET";
  const relayUrl = edgeEnvironmentValue(relayUrlName);
  const relaySecret = edgeEnvironmentValue(relaySecretName);
  if (!relayUrl || !relaySecret) {
    throw new Error(`${egressLane} Open-Meteo relay is not configured`);
  }
  const relayTarget = new URL(relayUrl);
  if (relayTarget.protocol !== "https:") {
    throw new Error(`${egressLane} Open-Meteo relay must use HTTPS`);
  }
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const upstreamUrl = url.toString();
  const signature = await signRelayRequest(relaySecret, timestamp, upstreamUrl);
  return fetch(relayTarget, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bolets-Relay-Timestamp": timestamp,
      "X-Bolets-Relay-Signature": signature,
    },
    body: JSON.stringify({ url: upstreamUrl }),
    signal: AbortSignal.timeout(OPEN_METEO_REQUEST_TIMEOUT_MS),
  });
}

export async function fetchOpenMeteoLocations(
  url: URL,
  context: string,
  options: FetchOpenMeteoOptions = {},
) {
  const attempts = options.attempts ?? 3;
  const egressLane = options.egressLane ?? "direct";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchOpenMeteoResponse(url, egressLane);
      if (response.ok) {
        const payload = await response.json() as OpenMeteoLocation | OpenMeteoLocation[];
        return Array.isArray(payload) ? payload : [payload];
      }
      const retryable = response.status === 429 || response.status >= 500;
      const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get("retry-after"));
      if (!retryable || attempt === attempts) {
        throw new OpenMeteoRequestError(context, response.status, egressLane, retryAfterSeconds);
      }
      await wait(retryAfterSeconds !== undefined
        ? Math.min(retryAfterSeconds * 1000, 15_000)
        : attempt * 1500);
    } catch (error) {
      if (error instanceof OpenMeteoRequestError) throw error;
      if (attempt === attempts) {
        const reason = error instanceof Error ? error.message : "unknown transport error";
        throw new Error(`Open-Meteo ${context} request failed: ${reason}`);
      }
      await wait(attempt * 1500);
    }
  }
  throw new Error(`Open-Meteo ${context} request failed`);
}

