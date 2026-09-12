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
