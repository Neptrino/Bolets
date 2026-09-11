# Umami performance investigation — 10 September 2026

> Dated investigation, not a deployment receipt. Measurements describe production on 10 September, approximately 21:00–21:12 UTC. No runtime code or production settings were changed. Follow-up work below is proposed and unimplemented.

Production revision: `52841b0fcc9f77c29248eb070d622c3abbbddb5d`. Stack: Next.js 16.3.0, React 19.2.8, MapLibre 6.3.0, self-hosted Umami 3.3.1 and Supabase Edge Runtime 1.74.0. Sources: the native [Umami performance report](https://analytics.bolets.app/websites/ce97249f-b2de-44bd-899c-56f8fc05cb54/performance?date=7day), read-only PostgreSQL aggregates, timestamped container logs, deployed router configuration and Chrome DevTools traces. [Aggregate evidence](umami-performance-investigation-2026-09-10.json) contains no session identifiers or environmental source records.

## Confirmed operational failure

At **20:51:35 Madrid time (18:51:35 UTC)** the Edge Runtime logged `memory limit reached for the worker`. The surrounding ten-second interval contained 110 `read-spatial-environment` dispatches and 74 worker-request cancellations. Caddy recorded 51 map-data HTTP 503 responses between 18:51:35.798 and 18:51:35.894 UTC. Application logs in that interval reported failed spatial timeline-frame and environment reads.

The deployed router's worker memory limit was **150 MB**. This was an isolate memory failure, not a container OOM/restart: the container had started at 16:45:03 UTC, had restart count zero and `OOMKilled=false`. Another worker-memory-limit event occurred at 16:48:25 UTC. Its visitor impact was not established.

At the initial recovery check, 2,894 map-data requests after 19:00 UTC contained no 5xx responses. This establishes recovery for that sampled interval, not a permanent fix. The logs do not identify which client initiated the burst, or prove that warming caused it.

### Code paths that explain the exposure

- `src/lib/prediction-environment-frame.ts` deduplicates identical pending keys, but different bucket/offset keys call the service immediately. There is no shared concurrency bound here.
- `src/lib/prediction-response-cache.ts` likewise deduplicates identical scored frames without bounding distinct cold computations.
- A combined timeline computation starts frame and current habitat/environment reads together in `src/lib/prediction-map-timeline.ts`.
- `readSpatialTimelineFrame` in `supabase/functions/read-spatial-environment/index.ts` reads four days of atmospheric/soil history, then loads a station scorer for the atmospheric rows before choosing each cell's target date. Its point chunks also use `Promise.all`.
- `loadStationTemperatureScorer` loads and expands frozen windows independently on each call. The four latest v3 windows each contain approximately **88,000 populated station-hours**. Their packed JSON is about 883 kB per window; unpacking creates individual hour objects and the scorer creates indexed maps. Packed JSON size is not an estimate of peak heap usage.
- Current-cell reads already use `cachedStationTemperatureValues`; timeline frame reads invoke `loadStationTemperatureScorer` directly. Existing current-cell caching therefore does not remove this timeline work.

The memory-limit failure is confirmed. Overlapping, independently expanded station windows are a strong code-backed explanation for memory pressure, but no heap profile was captured at the incident, so the exact allocation breakdown remains unproven.

## Browser measurements and report interpretation

For the native Last 7 days preset, matching SQL used **3 September 00:00 Europe/Madrid through the inspection time on 10 September**. At the snapshot, Umami contained 6,323 performance events, but only 1,896 had LCP and 1,973 had INP. Umami's displayed sample count uses all performance events; it is not the number of observations for the selected metric. Confirmed against upstream v3.3.1 `getPerformance.ts` and `getPerformanceMetrics.ts`.

The weekly p75 LCP was 1.14 s, p95 LCP 3.57 s, p75 TTFB 418 ms and p75 INP 200 ms. Percentiles exclude missing values; timings for different metrics may come from different events and cannot simply be subtracted as if paired.

| Page | LCP samples | p75 LCP | p95 LCP | LCP >4 s |
| --- | ---: | ---: | ---: | ---: |
| `/` | 492 | 1.274 s | 5.033 s | 32 |
| `/map` | 321 | 1.364 s | 4.240 s | 18 |
| `/bolets-avui` | 593 | 0.896 s | 2.472 s | 10 |
| `/bolets/pinetell` | 2, one session | 36.340 s | 43.108 s | 2 |
| `/bolets/moixero` | 1 | 31.916 s | 31.916 s | 1 |
| `/zones/solsones/sant-llorenc-de-morunys/ceps` | 1 | 10.068 s | 10.068 s | 1 |

The pinetell samples occurred on September 5 and the moixeró sample on September 6. The recorded moixeró TTFB was 31.318 s, so that sample primarily waited before receiving the document. A slow pinetell TTFB of 38.163 s was also present in the affected session/day. These historical waits cannot be attributed to today's fast origin measurements. The Sant Llorenç sample had FCP 1.236 s and LCP 10.068 s, pointing to a different delay after initial paint. Original browser traces are unavailable.

### Map responsiveness improved

All `/map%` routes, per Madrid calendar day:

| Day | INP samples | p75 INP | p95 INP |
| --- | ---: | ---: | ---: |
| September 7 | 150 | 656 ms | 1,904 ms |
| September 8 | 166 | 792 ms | 1,486 ms |
| September 9 | 378 | 168 ms | 840 ms |
| September 10, partial | 254 | 144 ms | 294 ms |

This coincides with map-rendering changes on September 9, including `70e85a1` and `620e22d`. It is an association, not a controlled attribution: device mix, interactions and traffic also changed. Weekly map INP still includes the earlier slow days.

### Controlled browser checks

Chrome DevTools used a 390×844 viewport, DPR 3, Fast 4G and 4× CPU slowdown. Fresh contexts were used for pinetell and homepage first visits. DNT was set in both the request header and navigator for these navigations, so these checks exclude analytics collection and may omit analytics-related work. They are single lab observations, not field percentiles.

| Page | LCP | TTFB | CLS | Qualification |
| --- | ---: | ---: | ---: | --- |
| Pinetell | 1.259 s | 352 ms | 0 | Fresh context, first navigation |
| Homepage | 1.284 s | 245 ms | 0 | Fresh context, first navigation |
| Sant Llorenç guide | 373 ms | 115 ms | 0 | Reload with potentially warm caches |

Pinetell's LCP was the existing preloaded WebP photograph. Its resource-load delay was 33 ms, load duration 703 ms and render delay 170 ms. Discovery was immediate and it was not lazy-loaded; the trace flagged missing explicit high fetch priority. Image-size insights estimated byte savings but **zero LCP savings**, so they do not explain the 30-second outliers or justify a broad image rewrite. Responsive images and immutable asset caching already exist.

The guide's lab LCP was text. Its warm reload cannot rule out a cold-load or later-paint problem.

The homepage trace also surfaced CrUX p75 INP of 975 ms, LCP 1,768 ms and CLS 0.02 for the URL. The tool did not supply collection dates or device segmentation; this is a separate historical Chrome field dataset and must not be substituted for Umami's selected interval.

The interactive-map trace did not complete normally: navigation/profiler inspection stalled, and the test tab was closed. There is no usable map trace from this run and no basis to call that tool failure a reproduced user-facing freeze. A separate DNT HTTP probe returned `/map` with HTTP 200, 259 ms TTFB and 305 ms total. Test tabs were closed or returned to blank and CPU throttling was cleared.

## Prioritized follow-up

1. **Bound expensive environment work across requests.** Add a shared queue for distinct cold timeline/environment reads, retaining same-key coalescing and reserving capacity for visible current-map requests. Bound queue length and wait time; avoid holding response bodies outside the bound. A browser's per-view gate and the warmer's two-worker limit do not bound total server concurrency.
2. **Avoid repeating frozen station expansion for timeline frames.** Load only the required immutable target windows, reuse validated inputs with strict memory bounds, and evaluate reusing the existing cell-temperature cache for matching timeline targets. Preserve all scoring inputs, version identities, optional-evidence fallback and publication freshness. Do not solve the incident merely by increasing the memory limit.
3. **Validate before deployment.** Compare scored outputs on identical frozen inputs, exercise distinct concurrent buckets and forecast offsets in staging, measure worker peak memory and cancellation behavior, and verify that failures do not publish incomplete/stale frames. Do not deliberately reproduce an OOM against production.
4. **Continue targeted browser diagnosis of slow outliers.** Obtain a successful controlled map-interaction trace and compare an early interaction during cold load against a settled map. Keep historical CrUX and current Umami windows separate. Explicit image fetch priority is a small candidate, not the primary demonstrated problem.

No change was made to the prediction model, data, caches, runtime limits or production deployment in this investigation. No implementation tests were run because the only repository changes are this report, its aggregate evidence and the archive index.
