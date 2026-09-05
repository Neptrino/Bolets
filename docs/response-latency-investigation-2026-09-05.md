# Intermittent response latency — 5 September 2026

The reported image navigation showed a 4.47 s network fetch and 4.70 s total
service-worker navigation, followed by 353 ms and 570 ms respectively. The
screenshot does not separate connection setup, time to first byte and body
transfer, so the original network delay remains unattributed.

## Production measurements

Read-only checks during the investigation found:

- Homepage, current conditions and map page: 135–180 ms to first byte.
- The exact image, `/media/optimized/v11/contributed/boletus-pinophilus-field-aleix-20250913.w1920.webp`:
  four HTTP 200 responses, 128–182 ms to first byte, 312–399 ms total, 354,586 bytes.
- VPS: load average 0.30/0.58/0.73, about 7.5 GiB available memory, no active
  swapping during the sample, no kernel OOM events in the preceding two days,
  and no restart of the current app container. September 4's system activity
  samples averaged about 91% idle CPU; these averages cannot exclude short spikes.
- No non-idle database sessions at the instant sampled.

## Fixed service-worker behavior

`public/sw.js` awaited `Cache.put` before returning successful network responses.
Since cache writes consume the body, this delayed delivery until the full
response had downloaded and been stored. Cache-write failures could also send
network-first requests into the offline fallback despite a successful fetch.
Direct image navigations used the network-first document path even though the
versioned image URL is immutable.

Cache writes now run under a synchronously registered `FetchEvent.waitUntil`
promise, separate from response delivery. Write failures leave the successful
network response intact. Versioned optimized WebPs use the asset cache before
the navigation handler, for both embedded images and direct visits. Existing
cache names remain compatible; no cache-format change requires eviction.
Live predictions still use network-first with a timestamped offline fallback,
and private routes remain excluded.

Verification:

- 24 tests across service-worker, contributor-access and operational-status tests passed.
- Type check, focused ESLint and production build passed (257 static pages generated).
- Chromium with a deliberately delayed body: headers delivered in 6.9 ms,
  full body in 705.5 ms, cached repeat in 0.9 ms. Only one network image request;
  direct navigation to that image offline returned HTTP 200 through the worker.
- Full lint's source-size step is blocked by the pre-existing, untracked
  `video/InstagramMapCampaign.tsx` (1,486 lines, above the 1,000-line limit).

This removes unnecessary buffering and repeat network requests. It does not
prove the cause of the original 4.47 s network fetch or eliminate first-load
network delays. The change requires the normal tested-main deployment and
activation of the updated service worker; production was not modified.

## Separate findings

- Five-day forecast environment payloads repeatedly exceeded Next.js's 2 MiB
  Data Cache entry limit (logged entries approximately 2.12–2.26 MB). The same
  combined-map forecast bucket took 1.26 s and 1.04 s on successive requests;
  the current-date bucket took 2.89 s cold and 0.18 s warm. Forecast response
  caching merits a separate change with scoring/freshness regression coverage.
- Generated species field cards took about 3 s to first byte in two probes.
  Proxy warnings included cancelled card/image/video responses, but those
  warnings alone do not establish event-loop contention or server overload.
- Caddy currently has no complete access-timing log, so the existing warning
  log cannot reconstruct successful slow requests. If the first network load
  remains slow, capture the browser request's Timing panel (and HTTP protocol)
  alongside an exact timestamp to distinguish connection, server and transfer delay.


## Implemented follow-up

The subsequent performance release addresses the separate findings above:

- Release-local, content-keyed field-card storage with atomic writes, shared
  concurrent requests and serialized cold rendering.
- Compressed validated forecast environments below the Next.js cache limit,
  separately cached scored frames, explicit age checks and stable cache keys.
- Direct Caddy serving from allowlisted candidate-image static exports.
- Publication-aware, bounded warming of public 5 km and 10 km map buckets.
- Sanitized public timing logs and independently scraped process runtime metrics.

Local verification passed under production's Node 24: 1,162 tests passed, eight
were skipped; type checking, lint including source-size checks and production
build passed in the isolated release checkout. The earlier lint blockage belongs
to unrelated uncommitted video work and is excluded from this release. A Node 25
run hit pre-existing jsdom/localStorage incompatibilities, resolved by running
with production's Node 24 rather than changing unrelated application code.

An isolated Caddy 2.10.2 test verified direct static responses, gzip, immutable
headers, public upstream timings, private-route/referrer and Do Not Track
exclusions, and absence of a synthetic secret in logs. That test uncovered the
upstream precompressed-sidecar HTTP 206 regression; the release retains Caddy's
on-the-fly compression instead. The pinned production Alloy validator accepted
the new independent runtime scrape. Local card repeats returned first bytes in
4–6 ms; production timings must be checked after rollout.
