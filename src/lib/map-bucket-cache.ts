import type { BucketPayload } from "@/src/lib/bucket-loader";

export const MAP_BUCKET_CACHE_NAME = "bolets-map-buckets-v2";
export const MAP_BUCKET_CACHE_TTL_MS = 60 * 60 * 1_000;

export const TIMELINE_BUCKET_CACHE_TTL_MS = 60_000;

const CACHED_AT_HEADER = "x-bolets-cached-at";
const MAP_BUCKET_CACHE_LIMIT = 600;
const MAP_BUCKET_TRIM_INTERVAL = 50;
let writesSinceTrim = 0;

function cacheStorage() {
  return typeof window !== "undefined" && "caches" in window
    ? window.caches
    : null;
}

function requestFor(url: string) {
  return new Request(url, { method: "GET" });
}

export function isPublicMapBucketUrl(url: string) {
  try {
    const parsed = new URL(url, "https://bolets.local");
    const resolution = Number(parsed.searchParams.get("resolution"));
    return (parsed.pathname === "/api/predictions" || parsed.pathname === "/api/habitat")
      && Number.isInteger(resolution)
      && resolution >= 2500;
  } catch {
    return false;
  }
}

export async function readMapBucketPayload<T>(
  url: string,
  now = Date.now(),
): Promise<BucketPayload<T> | null> {
  const storage = cacheStorage();
  if (!storage || !isPublicMapBucketUrl(url)) return null;

  try {
    const cache = await storage.open(MAP_BUCKET_CACHE_NAME);
    const request = requestFor(url);
    const response = await cache.match(request);
    if (!response?.ok) return null;
    const cachedAt = Date.parse(response.headers.get(CACHED_AT_HEADER) ?? "");
    const timeline = new URL(url, "https://bolets.local").searchParams.has("time");
    const ttl = timeline ? TIMELINE_BUCKET_CACHE_TTL_MS : MAP_BUCKET_CACHE_TTL_MS;
    if (!Number.isFinite(cachedAt) || cachedAt - now > 5_000 || now - cachedAt > ttl) {
      await cache.delete(request);
      return null;
    }
    const payload = await response.json() as BucketPayload<T>;
    return payload.truncated ? null : payload;
  } catch {
    // Cache Storage can be unavailable in private browsing or under quota
    // pressure. The network loader remains the source of truth.
    return null;
  }
}

async function trimMapBucketCache(cache: Cache) {
  const keys = await cache.keys();
  if (keys.length <= MAP_BUCKET_CACHE_LIMIT) return;
  await Promise.all(
    keys
      .slice(0, keys.length - MAP_BUCKET_CACHE_LIMIT)
      .map((request) => cache.delete(request)),
  );
}

export async function writeMapBucketPayload<T>(
  url: string,
  payload: BucketPayload<T>,
  now = Date.now(),
) {
  const storage = cacheStorage();
  if (!storage || !isPublicMapBucketUrl(url) || payload.truncated) return;

  try {
    const cache = await storage.open(MAP_BUCKET_CACHE_NAME);
    await cache.put(
      requestFor(url),
      new Response(JSON.stringify(payload), {
        headers: {
          "Content-Type": "application/json",
          [CACHED_AT_HEADER]: new Date(now).toISOString(),
        },
      }),
    );
    writesSinceTrim += 1;
    if (writesSinceTrim >= MAP_BUCKET_TRIM_INTERVAL) {
      writesSinceTrim = 0;
      await trimMapBucketCache(cache);
    }
  } catch {
    // A cache write must never turn a successful public map response into an
    // application error.
  }
}
