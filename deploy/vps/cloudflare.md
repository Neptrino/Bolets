# Cloudflare website proxy

Configured on 2026-09-05 in the existing Emma Labs / bolets.app zone
(`aa8a5464264b387259c80be019eca1d3`). No paid service was enabled.

## Traffic and TLS

- `bolets.app` and `www.bolets.app`: proxied A records targeting `51.255.40.179`.
- TLS mode: **Full (strict)**, replacing automatic mode previously using Full.
- Existing publicly trusted Caddy certificates remain responsible for origin TLS.
- `api.bolets.app`, `analytics.bolets.app`, and `grafana.bolets.app` retain their
  existing DNS-only routes. Mail and verification records are unchanged.

## Cache rules

The two rules have disjoint matches, scoped to the website hostnames.

1. **Bolets: bypass dynamic and private responses**
   (`4fdb13f13b0d4bbb8fb5952ddee08c97`): bypass edge cache.

```text
(http.host in {"bolets.app" "www.bolets.app"} and not (starts_with(http.request.uri.path, "/media/optimized/") or starts_with(http.request.uri.path, "/_next/static/") or starts_with(http.request.uri.path, "/icons/")))
```

2. **Bolets: cache public static assets**
   (`03079c875f8f4e7a8ba492f387639fd8`): eligible for cache, use origin
   Cache-Control and bypass caching when that header is absent, and respect
   origin browser TTL. Keep the default query-string-aware cache key.

```text
(http.host in {"bolets.app" "www.bolets.app"} and (starts_with(http.request.uri.path, "/media/optimized/") or starts_with(http.request.uri.path, "/_next/static/") or starts_with(http.request.uri.path, "/icons/")))
```

Do not introduce a blanket Cache Everything rule. HTML, RSC, authentication,
private pages, generated cards, live map endpoints and other dynamic requests
continue through the application and its existing freshness-aware caches.
Versioned static URLs make normal application releases independent of purging.

## Verification

Requests sent through Cloudflare's Madrid edge verified:

- Optimized WebP, JavaScript and CSS: HTTP 200, then `CF-Cache-Status: HIT` on
  repeat requests; origin Cache-Control lifetimes retained.
- Reported WebP: first-byte 195 ms on the initial MISS and 106 ms on the HIT;
  total download 376 ms then 252 ms. These are samples, not an availability SLO.
- Homepage, login, health and prediction API: HTTP 200 / DYNAMIC.
- Unauthenticated `/admin`: HTTP 307 to login, private/no-store, DYNAMIC.
- Private internal metrics: HTTP 404 / DYNAMIC.
- Missing optimized asset: HTTP 404 / BYPASS on both requests.
- `www` redirects to the canonical apex via HTTP 308 through Cloudflare.
- The interactive map loaded its base tiles, controls and prediction overlay.
- No Rocket Loader rewriting was present in the returned homepage.

Some resolver/browser caches may continue to use the previous origin address
until the DNS TTL expires. Test the normal hostname after propagation; use
current authoritative DNS results with curl --resolve for controlled edge tests.

## Reading observability after the cutover

Grafana's existing Caddy charts measure **origin traffic**. Cloudflare cache hits
never reach Caddy and therefore disappear from its request counts and timings.
Caddy response durations now include transfer to Cloudflare, not necessarily
transfer to the visitor. Use Cloudflare Cache Analytics for edge hits and request
coverage; use Grafana for application waiting, resource usage and origin errors.
Do not compare raw pre/post-cutover Caddy request counts as total site traffic.

## Rollback

If an edge-specific issue is confirmed, switch only the apex and www A records
back to DNS-only, retaining their existing VPS target. Caddy's public certificate
continues to work directly. Leave the strict TLS mode and scoped cache rules in
place while investigating; no application or database rollback is required.
