import {
  AROME_DIRECT_NATIVE_RESOLUTION_DEGREES,
  AROME_DIRECT_WCS_BASE_URL,
  type AromeCoverageBounds,
  type AromeCoverageDescription,
  type AromeDirectVariable,
} from "./arome-direct.ts";

export const AROME_SHADOW_BUCKET = "environment-shadow";
export const AROME_SHADOW_SCHEMA = "arome-shadow-v1";
export const AROME_SHADOW_MAX_OBJECT_BYTES = 8 * 1024 * 1024;
export const AROME_SHADOW_MAX_XML_BYTES = 8 * 1024 * 1024;
export const AROME_SHADOW_PROVIDER_TIMEOUT_MS = 20_000;

/**
 * Fixed WGS84 operating envelope for Catalonia. Requests are snapped outward
 * to the native AROME grid and must remain inside this envelope.
 */
export const CATALONIA_AROME_SCOPE = Object.freeze({
  minLatitude: 40.5,
  maxLatitude: 42.9,
  minLongitude: 0.1,
  maxLongitude: 3.35,
});

const MAX_SUBSET_SPAN_DEGREES = 0.25;
const VARIABLES = new Set<AromeDirectVariable>([
  "temperature_2m",
  "relative_humidity_2m",
  "wind_speed_10m",
]);
const REQUEST_KEYS = new Set(["action", "variable", "runAt", "validAt", "bounds"]);
const BOUNDS_KEYS = new Set([
  "minLatitude",
  "maxLatitude",
  "minLongitude",
  "maxLongitude",
]);
const BASE_URL = new URL(AROME_DIRECT_WCS_BASE_URL);

export type AromeShadowAction = "probe" | "stage";

export type AromeShadowRequest = {
  action: AromeShadowAction;
  variable: AromeDirectVariable;
  runAt?: string;
  validAt?: string;
  bounds?: AromeCoverageBounds;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: Set<string>, label: string) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new TypeError(`${label} contains unsupported fields`);
}

function canonicalInstant(value: unknown, label: string) {
  if (typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    throw new TypeError(`${label} must be an ISO 8601 UTC instant`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${label} must be an ISO 8601 UTC instant`);
  return new Date(parsed).toISOString();
}

function finiteNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number`);
  }
  return value;
}

function snapDown(value: number) {
  return Number((Math.floor((value + 1e-10) / AROME_DIRECT_NATIVE_RESOLUTION_DEGREES) *
    AROME_DIRECT_NATIVE_RESOLUTION_DEGREES).toFixed(2));
}

function snapUp(value: number) {
  return Number((Math.ceil((value - 1e-10) / AROME_DIRECT_NATIVE_RESOLUTION_DEGREES) *
    AROME_DIRECT_NATIVE_RESOLUTION_DEGREES).toFixed(2));
}

export function normalizeAromeShadowBounds(value: unknown): AromeCoverageBounds {
  const input = record(value, "AROME shadow bounds");
  exactKeys(input, BOUNDS_KEYS, "AROME shadow bounds");
  const raw = {
    minLatitude: finiteNumber(input.minLatitude, "minimum latitude"),
    maxLatitude: finiteNumber(input.maxLatitude, "maximum latitude"),
    minLongitude: finiteNumber(input.minLongitude, "minimum longitude"),
    maxLongitude: finiteNumber(input.maxLongitude, "maximum longitude"),
  };
  if (raw.minLatitude >= raw.maxLatitude || raw.minLongitude >= raw.maxLongitude) {
    throw new RangeError("AROME shadow bounds must have increasing limits");
  }
  if (raw.minLatitude < CATALONIA_AROME_SCOPE.minLatitude ||
    raw.maxLatitude > CATALONIA_AROME_SCOPE.maxLatitude ||
    raw.minLongitude < CATALONIA_AROME_SCOPE.minLongitude ||
    raw.maxLongitude > CATALONIA_AROME_SCOPE.maxLongitude) {
    throw new RangeError("AROME shadow bounds must remain inside the fixed Catalonia scope");
  }
  const bounds = {
    minLatitude: snapDown(raw.minLatitude),
    maxLatitude: snapUp(raw.maxLatitude),
    minLongitude: snapDown(raw.minLongitude),
    maxLongitude: snapUp(raw.maxLongitude),
  };
  const latitudeSpan = bounds.maxLatitude - bounds.minLatitude;
  const longitudeSpan = bounds.maxLongitude - bounds.minLongitude;
  if (latitudeSpan <= 0 || longitudeSpan <= 0 ||
    latitudeSpan > MAX_SUBSET_SPAN_DEGREES + 1e-9 ||
    longitudeSpan > MAX_SUBSET_SPAN_DEGREES + 1e-9) {
    throw new RangeError("AROME shadow bounds may cover at most 0.25 degrees per axis");
  }
  return bounds;
}

export function normalizeAromeShadowRequest(value: unknown): AromeShadowRequest {
  const input = record(value, "AROME shadow request");
  exactKeys(input, REQUEST_KEYS, "AROME shadow request");
  const action = input.action ?? "probe";
  if (action !== "probe" && action !== "stage") {
    throw new TypeError("AROME shadow action must be probe or stage");
  }
  if (typeof input.variable !== "string" ||
    !VARIABLES.has(input.variable as AromeDirectVariable)) {
    throw new TypeError("AROME shadow variable is unsupported");
  }
  const runAt = input.runAt === undefined
    ? undefined
    : canonicalInstant(input.runAt, "requested AROME run");
  const validAt = input.validAt === undefined
    ? undefined
    : canonicalInstant(input.validAt, "requested AROME valid time");

  if (action === "probe") {
    if (validAt !== undefined || input.bounds !== undefined) {
      throw new TypeError("AROME metadata probes do not accept validAt or bounds");
    }
    return {
      action,
      variable: input.variable as AromeDirectVariable,
      ...(runAt ? { runAt } : {}),
    };
  }
  if (input.bounds === undefined) {
    throw new TypeError("AROME staging requires bounded Catalonia coordinates");
  }
  return {
    action,
    variable: input.variable as AromeDirectVariable,
    ...(runAt ? { runAt } : {}),
    ...(validAt ? { validAt } : {}),
    bounds: normalizeAromeShadowBounds(input.bounds),
  };
}

export function selectAromeShadowValidAt(
  description: Pick<AromeCoverageDescription, "runAt" | "availableLeadSeconds">,
  requestedValidAt?: string,
  now = new Date(),
) {
  if (requestedValidAt) return canonicalInstant(requestedValidAt, "requested AROME valid time");
  const available = description.availableLeadSeconds
    .map((seconds) => Date.parse(description.runAt) + seconds * 1000)
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (!available.length) throw new Error("AROME coverage has no valid times");
  const notFuture = available.filter((instant) => instant <= now.getTime());
  const selected = notFuture.at(-1);
  if (selected === undefined) {
    throw new Error("AROME coverage has no available non-future lead; validAt must be explicit");
  }
  return new Date(selected).toISOString();
}

function assertProviderUrl(value: URL) {
  if (value.protocol !== "https:" || value.origin !== BASE_URL.origin ||
    !value.pathname.startsWith(`${BASE_URL.pathname}/`)) {
    throw new Error("AROME provider URL is outside the pinned WCS endpoint");
  }
}

async function boundedResponseBytes(response: Response, maximumBytes: number) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("AROME provider response exceeds the size limit");
  }
  if (!response.body) throw new Error("AROME provider returned an empty body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new Error("AROME provider response exceeds the size limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!total) throw new Error("AROME provider returned an empty body");
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}

export async function fetchAromeShadowResource(
  url: URL,
  credential: string,
  options: {
    maximumBytes?: number;
    timeoutMs?: number;
    fetchImpl?: FetchLike;
  } = {},
) {
  assertProviderUrl(url);
  if (!credential || credential.length > 4096 || /\s/.test(credential)) {
    throw new Error("AROME server credential is invalid");
  }
  const maximumBytes = options.maximumBytes ?? AROME_SHADOW_MAX_XML_BYTES;
  const timeoutMs = options.timeoutMs ?? AROME_SHADOW_PROVIDER_TIMEOUT_MS;
  if (!Number.isInteger(maximumBytes) || maximumBytes < 1 || maximumBytes > AROME_SHADOW_MAX_XML_BYTES ||
    !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > AROME_SHADOW_PROVIDER_TIMEOUT_MS) {
    throw new RangeError("AROME provider limits are invalid");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credential}`,
        Accept: "application/xml, application/wmo-grib, application/octet-stream",
        "User-Agent": "Bolets-Atles-AROME-Shadow/1.0",
      },
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`AROME provider returned HTTP ${response.status}`);
    }
    return {
      bytes: await boundedResponseBytes(response, maximumBytes),
      contentType: response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "",
    };
  } catch (error) {
    if (controller.signal.aborted) throw new Error("AROME provider request timed out");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function decodeAromeShadowXml(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("AROME provider metadata is not valid UTF-8 XML");
  }
}

function gribMessageLength(bytes: Uint8Array, offset: number) {
  let length = 0n;
  for (let index = offset + 8; index < offset + 16; index += 1) {
    length = (length << 8n) | BigInt(bytes[index]);
  }
  if (length > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("AROME GRIB message is too large");
  return Number(length);
}

/**
 * Checks only GRIB2 transport/container framing. It does not decode sections
 * or prove that the requested variable, level, grid, bounds or valid time are
 * present in the message.
 */
export function validateSingleAromeShadowGrib2Container(bytes: Uint8Array) {
  let offset = 0;
  let messages = 0;
  while (offset < bytes.byteLength) {
    if (bytes.byteLength - offset < 20 ||
      bytes[offset] !== 0x47 || bytes[offset + 1] !== 0x52 ||
      bytes[offset + 2] !== 0x49 || bytes[offset + 3] !== 0x42 ||
      bytes[offset + 7] !== 2) {
      throw new Error("AROME coverage is not a GRIB2 payload");
    }
    const length = gribMessageLength(bytes, offset);
    if (length < 20 || offset + length > bytes.byteLength ||
      bytes[offset + length - 4] !== 0x37 || bytes[offset + length - 3] !== 0x37 ||
      bytes[offset + length - 2] !== 0x37 || bytes[offset + length - 1] !== 0x37) {
      throw new Error("AROME coverage contains an invalid GRIB2 message");
    }
    offset += length;
    messages += 1;
  }
  if (!messages) throw new Error("AROME coverage is empty");
  if (messages !== 1) {
    throw new Error("AROME shadow staging requires exactly one GRIB2 message");
  }
  return { messages, bytes: bytes.byteLength };
}

export async function sha256Hex(bytes: Uint8Array) {
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", input.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function compactInstant(value: string) {
  return value.replace(/[-:]/g, "").replace(/\.000Z$/, "Z");
}

export function buildAromeShadowObjectPath(input: {
  variable: AromeDirectVariable;
  runAt: string;
  validAt: string;
  sha256: string;
}) {
  const runAt = canonicalInstant(input.runAt, "AROME model run");
  const validAt = canonicalInstant(input.validAt, "AROME valid time");
  if (!VARIABLES.has(input.variable) || !/^[a-f0-9]{64}$/.test(input.sha256)) {
    throw new TypeError("AROME shadow object identity is invalid");
  }
  return [
    AROME_SHADOW_SCHEMA,
    compactInstant(runAt),
    compactInstant(validAt),
    input.variable,
    `${input.sha256.slice(0, 32)}.grib2`,
  ].join("/");
}

export function aromeShadowDescriptionSummary(description: AromeCoverageDescription) {
  return {
    schema: AROME_SHADOW_SCHEMA,
    scoringEnabled: false,
    variable: description.variable,
    coverageId: description.coverageId,
    runAt: description.runAt,
    validFrom: description.validFrom,
    validUntil: description.validUntil,
    availableLeadHours: description.availableLeadSeconds.map((seconds) => seconds / 3600),
    level: description.level,
    value: description.value,
    extent: description.extent,
    nativeGrid: description.nativeGrid,
    provenance: description.provenance,
  };
}
