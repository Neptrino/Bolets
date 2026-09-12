# Map and species performance: live verification — 12 September 2026

Historical release receipt for `1a8f6abee9410cd72a9f18f4fe8bf72329d8ef05`. The [production workflow](https://github.com/Neptrino/Bolets/actions/runs/34717602046) succeeded. The VPS release symlink and image revision both match; the app is healthy, with zero restarts and no OOM flag. The earlier `82760f5` workflow was cancelled before deployment after a browser benchmark exposed a slower initial loop.

The [implementation and benchmark receipt](map-page-performance-2026-09-12.md) explains the worker packaging, circular Gaussian row calculation, species image priority and Avui loading-shell changes. [Evidence snapshots](map-page-performance-live-2026-09-12.json) retain the browser checks and PageSpeed output.

## PageSpeed after release

| Page | Mobile before → after | Desktop before → after | New mobile LCP / TBT | New desktop LCP / TBT |
| --- | --- | --- | --- | --- |
| [Map](https://pagespeed.web.dev/analysis/https-bolets-app-map/1r20srq1bb) | 60 → 74 | 66 → 66 | 3.2 s / 600 ms | 0.7 s / 1,530 ms |
| [Avui](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-avui/70h6fgpr9h) | 73 → 79 | [54 → 70](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-avui/ot8d9kf8pf?form_factor=desktop) | 3.9 s / 330 ms | 0.9 s / 1,050 ms |
| [Cep](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-cep/wgii0ea2jw) | 87 → 88 | 97 → 100 | 3.8 s / 0 ms | 0.7 s / 0 ms |
| [Pinetell](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-pinetell/fidal8jsto) | 85 → 88 | 100 → 100 | 3.5 s / 40 ms | 0.6 s / 10 ms |

These are individual Lighthouse lab runs, not a controlled real-user experiment. Map results varied materially in the preceding receipt; the score increase does not prove a stable percentage improvement. Avui's first desktop run failed inside the PageSpeed driver (`Target closed`), so its desktop result is the separately linked retry. Avui desktop CLS fell from 0.29 to 0; the map's new mobile CLS was 0.007 and all other reported new CLS values were zero. Map Best Practices remains 96 because it requests geolocation on load; the former worker MIME/console failure is absent.

## Functional verification and limits

- All eight live page/viewport combinations (390 px and 1,350 px) return 200 without page or worker errors. Both maps start the versioned module worker and receive replies. Species initial views do not load the map worker and advertise high hero priority.
- 170 prediction responses observed before timeline interaction returned 200. Tomorrow loads successfully on Avui at both widths. No layout shifts were observed on Avui or species pages; the small mobile map detail-panel shift remains.
- Before release: 1,537 unit tests passed, 12 skipped; production build, type checking, lint and source size passed. Seven focused production-build browser scenarios passed on the final revision. Four smoothing/access scenarios also passed with service workers disabled for request fixtures.
- Remaining work is concentrated in desktop map/Avui main-thread execution (1.53 s / 1.05 s blocking time), plus image transfer and shared CSS on mobile species pages. Reusing unchanged projected rasters or moving raster work off the main thread are candidates for the next measured review; neither is implemented here.
