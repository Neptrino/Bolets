# Cloudflare zone

The Emma Labs / bolets.app zone (`aa8a5464264b387259c80be019eca1d3`) hosts the
site's DNS. Since 2026-09-19 the website records are **DNS-only**; the zone
keeps the proxy configuration so it can be switched back on during an attack.
No paid service is enabled.

## Records

- `bolets.app` and `www.bolets.app`: DNS-only A records to `51.255.40.179`.
- `api.bolets.app`, `analytics.bolets.app`: DNS-only, unchanged.
- `grafana.bolets.app`: Grafana Cloud, which sits behind Cloudflare itself.
- Mail and verification records: unchanged.

Caddy terminates TLS with its own Let's Encrypt certificates and serves HTTP/3
directly; port 80 answers ACME challenges and redirects to HTTPS.

## Why the website is not proxied

Spanish ISPs intercept Cloudflare's address ranges during football matches
(the LaLiga blocking orders). Visitors then see a self-signed middlebox
certificate (`CN=core1.netops.test`) or `ERR_QUIC_PROTOCOL_ERROR`, while the
DNS-only hostnames on the same network keep working. Observed on mobile on
2026-09-17 and on desktop Wi-Fi on 2026-09-19. The block keys on Cloudflare's
IP ranges, not on this zone, so nothing in the zone can prevent it.

Measured on 2026-09-19 from Barcelona (origin RTT 33–39 ms), the proxy was
not buying performance either:

- HTML and API responses are never edge-cached; through the proxy they cost
  about 70 ms more than the direct 123–133 ms first byte, of which roughly
  15 ms is application time.
- Cached static assets answered in 106 ms from the edge against 105 ms direct
  on a cold connection; on an open connection each round is one origin RTT.
  All of them are immutable and served by the service worker on return visits.
- Caddy already serves HTTP/3, and Brotli now comes from sidecars written at
  export time (`scripts/export-static-assets.mjs`), which are smaller than any
  on-the-fly edge encoding: 227.7 KB against 268.3 KB gzip for the homepage's
  HTML, scripts and styles.

What the proxy did provide, and is given up while DNS-only: the emergency
Under Attack mode and WAF. OVH's network-level DDoS protection and the
application's abuse rate limits remain.

## Client addressing in both states

Caddy trusts `CF-Connecting-IP` only when the TCP peer is inside Cloudflare's
published ranges (`trusted_proxies static` in the Caddyfile, checked
2026-09-19), always sets `X-Real-IP` from its own verdict and strips any
client-supplied `CF-Connecting-IP`. `requestIp()` in
`src/lib/abuse-rate-limit.server.ts` reads `X-Real-IP` only. Rate limits and
Turnstile therefore see the visitor's address whether the records are proxied
or not, and a direct request to the origin cannot assert an address.
`scripts/verify-caddy-performance.mjs` exercises both states.

Refresh the ranges from <https://www.cloudflare.com/ips/> whenever the zone is
re-proxied; a stale list would make every visitor share the edge's address in
the rate limiter.

## Re-proxying during an attack

1. Cloudflare dashboard → DNS → toggle the proxy on for `bolets.app` and
   `www.bolets.app`. Nothing else needs to change: TLS mode stays
   **Full (strict)** and the two cache rules below are still in the zone.
2. Wait for the 300 s proxied TTL, then confirm `cf-ray` is present on the
   normal hostname and `CF-Cache-Status: HIT` appears on a repeat static asset.
3. Grafana's Caddy charts now measure origin traffic only: cached asset hits
   never reach the VPS. Do not compare request counts across the switch.
4. Toggle the proxy off again once the attack is over; the Spanish blocks
   return with the proxy.

### Cache rules kept in the zone

The two rules have disjoint matches, scoped to the website hostnames. They are
inert while DNS-only.

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
must always come from the application and its freshness-aware caches.

## Verifying the DNS-only state

```bash
dig +short bolets.app A                       # 51.255.40.179, no Cloudflare range
curl -sSI https://bolets.app/ | grep -i -E "^HTTP|cf-ray|alt-svc"   # no cf-ray, alt-svc h3
echo | openssl s_client -connect bolets.app:443 -servername bolets.app 2>/dev/null \
  | openssl x509 -noout -issuer -dates            # Let's Encrypt, renewed by Caddy
curl -sS -o /dev/null -D - -H "Accept-Encoding: br" \
  "https://bolets.app/_next/static/chunks/<chunk>.js" | grep -i content-encoding   # br
```

Caddy's Grafana charts again cover all website traffic.

## History

- 2026-09-05: apex and www proxied with Full (strict) TLS and the two cache
  rules above; verified through the Madrid edge (static HIT after MISS,
  dynamic paths DYNAMIC, private paths bypassed).
- 2026-09-17 and 2026-09-19: Spanish ISP interception of Cloudflare ranges
  made the site unreachable for local visitors during matches.
- 2026-09-19: records switched to DNS-only; Caddy given `trusted_proxies`,
  `X-Real-IP` and Brotli sidecars so both states behave the same.
