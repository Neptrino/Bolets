# Map, Avui and species performance — 12 September 2026

Historical investigation and implementation receipt. Production measurements below precede this change; they are not post-release results.

## PageSpeed baseline

| Page | Mobile score / LCP / TBT | Desktop score / LCP / TBT / CLS |
| --- | --- | --- |
| [Avui](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-avui/mp28z0ihiw) | 73 / 4.6 s / 350 ms | 54 / 0.8 s / 1,500 ms / 0.29 |
| [Cep](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-cep/se0an7oi9b) | 87 / 3.9 s / 20 ms | 97 / 0.7 s / 130 ms / 0 |
| [Pinetell](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-pinetell/lol11jyiuj) | 85 / 3.5 s / 50 ms | 100 / 0.7 s / 0 ms / 0 |

The current map's variable PageSpeed results are retained in [the preceding live receipt](frontend-performance-live-2026-09-12.md). Fresh mobile reports used Lighthouse 13.4.1 / slow 4G / Moto G Power. These single lab runs do not establish a change in real-user Core Web Vitals.

## Changes and evidence

- MapLibre 6.3.0's automatic module-worker URL becomes empty in the Next/Turbopack bundle. The worker then requests the current page as JavaScript and receives HTML. Copy both upstream worker and shared ESM files together during development and production image builds, use their package-version URL in the shared map factory, and cache these immutable assets in the browser/offline worker. They remain served through Next; Caddy's direct-asset allowlist stays unchanged. See [MapLibre's Next.js migration guidance](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/).
- A production browser CPU profile identified Gaussian raster interpolation as the main application-owned hot function. Reuse the separable horizontal and vertical exponential terms, trim each row to the original circular boundary, and isolate the tight accumulation loop so browsers can optimize it early, retaining the circular cutoff, input order, Float32 accumulation, support fade, source grid and geographic anchoring. No prediction score or ecology changes.
- Final alternating old/new Node 24 benchmarks with deterministic fixtures and 11 measured iterations gave median times of 25.98 → 20.60 ms (5,200 cells, 400×600), 30.08 → 24.23 ms (5,200 cells, 900×650), and 18.32 → 15.29 ms (1,000 cells, wider kernels): 17–21% less time in this calculation. Two fresh Chromium runs at 4× CPU slowdown measured 128.0 → 104.8 ms and 142.2 → 87.2 ms (18–39% less time). These are calculation benchmarks, not whole-page speed claims. All output score and alpha Float32 values were identical in these fixtures. A tiny 0.5-pixel-kernel fixture rose from 0.083 to 0.088 ms. The earlier revision was cancelled before deployment because its initial Chrome benchmark regressed; the final row loop addresses that browser result.
- Species pages already preloaded the first gallery image. Add explicit high fetch priority to that image/preload; subsequent slides use automatic priority and thumbnails remain lazy.
- Avui's outer route-loading shell put the footer in the first viewport, then displaced it when the map arrived (PageSpeed desktop CLS 0.29). Reserve a viewport's height during loading and match the final heading/copy. The map still renders independently of the streamed overview.
- Exclude generated third-party worker files from lint and local creative/scratch folders from application TypeScript discovery. A local ignored social renderer had otherwise blocked the website build.

The retained [benchmark evidence](map-page-performance-2026-09-12.json) contains the final measurements. Local reproducibility artifacts are under `artifacts/map-performance-2026-09-12/`: production CPU profile, PageSpeed text snapshots, benchmark source/results and verification logs. Maintained regression tests cover numerical parity, worker startup/module delivery, offline worker reuse, and species image priority.

## Verification

- Production build, type checking, lint and source-size checks pass.
- Seven production-build browser scenarios pass: functional worker replies and JavaScript MIME/cache headers on Map and Avui, high-priority responsive preloads on Cep and Pinetell, timeline buffering, and preserved camera/geolocation behavior across species and territory navigation.
- Full suite: 1,537 tests pass, 12 skip (253 files pass, 11 skip).
- Fresh desktop browser navigation reproduced production Avui CLS 0.252 from the footer; the local built page had no recorded shift. Local environmental services were unavailable, so this verifies the loading-shell fix rather than live data readiness. Local/server network timings are not comparable page-speed evidence.

- Four additional smoothing/access browser scenarios pass with service workers disabled so Playwright owns the fixtures. Their initial default production run failed because the offline worker bypassed request interception; isolated reruns pass.
