/**
 * Offline worker for Bolets Atles.
 *
 * The guiding rule is that a forager in the forest must never be shown a stale
 * fruiting score as if it were today's. Prediction responses are therefore
 * served from the network whenever the network answers, and only fall back to
 * the cache with the date they were stored, so the interface can say how old
 * they are. Habitat and terrain answers carry their model version in the URL,
 * so they are safe to serve from cache outright.
 *
 * Basemap tiles are only ever kept opportunistically, as the user pans over
 * them. Nothing here bulk-downloads tiles: the OpenStreetMap tile usage policy
 * forbids it.
 */

const VERSION = "v4";
const SHELL_CACHE = `bolets-shell-${VERSION}`;
const ASSET_CACHE = `bolets-assets-${VERSION}`;
const DATA_CACHE = `bolets-data-${VERSION}`;
const TILE_CACHE = `bolets-tiles-${VERSION}`;
// Client map code owns this short-lived, bounded cache. Keep it when the
// service worker rotates its own caches.
const MAP_BUCKET_CACHE = "bolets-map-buckets-v2";
const CURRENT_CACHES = [
  SHELL_CACHE,
  ASSET_CACHE,
  DATA_CACHE,
  TILE_CACHE,
  MAP_BUCKET_CACHE,
];

const OFFLINE_URL = "/offline";

/** Header stamped on cached data so the interface can report its age. */
const CACHED_AT_HEADER = "x-bolets-cached-at";

/** Basemap hosts whose tiles may be kept as the user pans over them. */
const TILE_HOSTS = new Set([
  "geoserveis.icgc.cat",
  "server.arcgisonline.com",
  "tile.openstreetmap.org",
]);

/**
 * Tiles are uniform enough that a count is a good proxy for bytes: roughly
 * 10-25 KB each, so this bound sits in the tens of megabytes.
 */
const TILE_CACHE_LIMIT = 2000;
/** Trimming on every write would thrash; a bounded overshoot is cheaper. */
const TILE_TRIM_SLACK = 120;

async function precacheShellDocument(path) {
  const response = await fetch(path, { cache: "reload" });
  if (!response.ok) throw new Error(`Could not precache ${path}`);
  const shell = await caches.open(SHELL_CACHE);
  await shell.put(path, response.clone());
  const html = await response.text();
  const assetPaths = new Set(
    [...html.matchAll(/(?:src|href)="([^"?]*\/_next\/static\/[^"?]+)(?:\?[^"?]*)?"/g)]
      .map((match) => match[1]),
  );
  const assets = await caches.open(ASSET_CACHE);
  await Promise.all([...assetPaths].map(async (assetPath) => {
    const asset = await fetch(assetPath, { cache: "reload" });
    if (asset.ok) await assets.put(assetPath, asset);
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([precacheShellDocument(OFFLINE_URL), precacheShellDocument("/troballes/nova")]),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("bolets-") && !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

/** Stores a response with the time it was stored, leaving the body untouched. */
async function putStamped(cacheName, request, response) {
  const headers = new Headers(response.headers);
  headers.set(CACHED_AT_HEADER, new Date().toISOString());
  const stamped = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  const cache = await caches.open(cacheName);
  await cache.put(request, stamped);
}

async function trimTileCache() {
  const cache = await caches.open(TILE_CACHE);
  const keys = await cache.keys();
  if (keys.length <= TILE_CACHE_LIMIT + TILE_TRIM_SLACK) return;
  // Cache Storage keeps insertion order, so the front of the list is the
  // least recently added. Tiles are cheap to fetch again, so approximating
  // least-recently-used by insertion order is good enough and needs no index.
  const excess = keys.length - TILE_CACHE_LIMIT;
  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}

/** Cache first: the answer cannot go stale without its URL changing. */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await putStamped(cacheName, request, response.clone());
  return response;
}

/** Opportunistic tile caching, bounded, never pre-fetched. */
async function tileFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(TILE_CACHE);
    await cache.put(request, response.clone());
    await trimTileCache();
  }
  return response;
}

/**
 * Network first: today's scores when the network answers, yesterday's clearly
 * dated copy when it does not.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) await putStamped(cacheName, request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

/** Navigations fall back to the last copy of that page, then to the shell. */
async function navigate(request) {
  try {
    const response = await fetch(request);
    if (response.ok) await putStamped(SHELL_CACHE, request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only GET is cacheable by URL. The prediction-history chart posts its cell,
  // so it stays online-only and degrades through its own unavailable state.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (
    TILE_HOSTS.has(url.hostname)
    || url.pathname.startsWith("/api/map-tiles/icgc/")
  ) {
    event.respondWith(tileFirst(request));
    return;
  }

  // Everything else this worker handles is same-origin.
  if (url.origin !== self.location.origin) return;

  // Contributor detail is private and online-only. Do not let an expiring or
  // revoked 1 km/250 m response survive in either service-worker cache.
  if (
    (url.pathname === "/api/predictions" || url.pathname === "/api/habitat")
    && Number(url.searchParams.get("resolution")) < 2500
  ) return;

  // Private operational, account and personal-data pages must never enter an
  // offline cache. The report form is public shell; its unsent content lives
  // only in IndexedDB and is never placed in Cache Storage.
  const privatePath = url.pathname === "/admin"
    || url.pathname.startsWith("/admin/")
    || url.pathname === "/acces"
    || url.pathname.startsWith("/compte")
    || url.pathname.startsWith("/les-meves-troballes")
    || url.pathname.startsWith("/moderacio")
    || url.pathname.startsWith("/api/me/")
    || url.pathname.startsWith("/api/moderation/");
  if (privatePath) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (url.pathname === "/api/predictions") {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (url.pathname === "/api/findings") {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (url.pathname === "/api/habitat" || url.pathname === "/api/occurrences") {
    // Both carry their model version in the URL, so a cached answer can only
    // be the answer for that version.
    event.respondWith(cacheFirst(request, DATA_CACHE));
  }
});
