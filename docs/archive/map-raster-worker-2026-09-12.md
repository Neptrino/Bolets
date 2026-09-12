# Prediction raster worker — 12 September 2026

Implementation and local verification receipt; the preceding [live report](map-page-performance-live-2026-09-12.md) is the production baseline.

The map and Avui still spent 1,530 ms and 1,050 ms in desktop Lighthouse blocking time after the first optimization. A fresh production CPU profile again identified raster interpolation as application-owned main-thread work.

## Change

- Project public cells on the main thread, then calculate Gaussian interpolation and RGBA pixels in a bundled worker. The browser worker, synchronous fallback and signed server maps call the same pure pixel function; scoring, coverage, cutoffs and geographic sampling are unchanged.
- Bound each map to one active job and one replaceable pending frame, transfer the result buffer, reject stale results and settle waiting promises when navigation disposes the worker. Worker creation/runtime failures or a 10-second stalled job use the shared synchronous fallback.
- Cache the latest raster for an unchanged ordered cell snapshot, camera and dimensions. Selection and duplicate bucket publication reuse its pixels and uploaded canvas. North-up pans/zooms transform the last image while the new viewport is calculated; species/day changes cannot paint an obsolete result.
- Await the final paint before publishing final viewport coverage. Keep timeline bucket loading atomic and preserve map controls, geographic clipping, detail limits and restored viewport behavior.

## Measurement

A browser harness recorded the current public prediction responses, then replayed the same bodies with 60 ms response pacing at 1,350×940 and 4× CPU slowdown. Three alternating runs measured main-thread blocking above 50 ms:

| Run | Production baseline | Local production build |
| --- | ---: | ---: |
| 1 | 477 ms | 160 ms |
| 2 | 426 ms | 149 ms |
| 3 | 425 ms | 152 ms |

Median blocking fell from 426 to 152 ms (64%). This controlled-data comparison still uses different document/asset origins and is not a Lighthouse score or real-user improvement claim. Live PageSpeed verification follows deployment.

## Verification

- The full 1,546-test suite passes (12 skipped), plus the added final-paint settlement regression; build/type checks, lint and source-size checks pass.
- Eight production-build browser scenarios pass: shared worker pixel SHA-256 parity, MapLibre worker delivery, species priority, timeline buffering and restored camera/geolocation behavior.
- Four additional smoothing/access browser scenarios pass, including the 250 m authorized view and restoration of the public floor on expiry.
- Unit coverage includes bounded coalescing, stale result rejection, cleanup, blocked/hung worker fallback, unchanged-data cache reuse and geographic placement during pan.
- Local profiles, fixtures, comparison results and logs are in `artifacts/map-worker-performance-2026-09-12/`.

## Live verification

Release `ca382a81fd8443425b97dfc2bb93a0f45b60341f` passed [CI and deployment](https://github.com/Neptrino/Bolets/actions/runs/34719062803). The VPS release symlink and healthy application image revision both match. The retained source archive is 100,917,988 bytes, below the 256 MiB transport limit.

Two fresh PageSpeed runs per page produced mixed results. All runs are retained in [the results file](map-raster-worker-live-2026-09-12.json); ranges must not be presented as consistent gains or real-user measurements.

| Page | Mobile baseline → runs | Desktop baseline → runs | Desktop blocking baseline → runs |
| --- | --- | --- | --- |
| Map | 74 → 78, 52 | 66 → 67, 70 | 1,530 → 1,150, 730 ms |
| Avui | 79 → 67, 65 | 70 → 73, 86 | 1,050 → 710, 320 ms |

Reports: Map [first](https://pagespeed.web.dev/analysis/https-bolets-app-map/n0mhr1j54a) and [second](https://pagespeed.web.dev/analysis/https-bolets-app-map/ifldcwpmy9); Avui [first](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-avui/i4gllmcxwc) and [second](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-avui/lwd7bmqayp).

Desktop blocking decreased in both runs, but mobile scores did not consistently improve. Avui's mobile runs were both worse than the baseline. Map mobile LCP varied from 3.3 to 6.2 seconds; Avui from 4.0 to 4.7 seconds. The remaining main-thread work is concentrated in MapLibre (about 1.86 seconds of desktop main-thread time in the first reports, predominantly categorized as Other), alongside React and application initialization. This supports investigating map startup and first-paint competition; it does not identify a specific native graphics operation as the cause. Shared render-blocking CSS is another measured candidate. Neither library patching nor changing the interactive map to a static preview is part of this release.

Live browser checks at 390 and 1,350 px passed for both routes: pages and 186 observed prediction responses returned 200, both workers replied without errors, and Avui's tomorrow timeline worked at both widths. An intermittent mobile Avui layout shift of 0.102 appeared when the streamed summary above the map resolved; both PageSpeed runs measured zero CLS there. The map detail panel retains its small mobile shift. These are remaining issues, not fixed by raster offloading. Raw browser and PageSpeed snapshots are retained in `artifacts/map-worker-performance-2026-09-12/`.
