# Live performance spot check — 15 September 2026

Historical read-only check. Production app image revision matches `0655be72dfe1e6980be48ce55d400860298f0542`; the five latest Actions runs reported success. The latest release includes overnight territorial changes and this morning's chart/homepage changes, so results cannot isolate the 14 September map-discovery release.

Separate fresh Chrome contexts, 390×844 at DPR 3, 4× CPU slowdown and DevTools Slow 4G; DNT enabled. One first-navigation sample per route. [Measurements](performance-spot-check-2026-09-15.json).

| Route | LCP | Observed CLS | Main-thread long-task excess |
| --- | ---: | ---: | ---: |
| Homepage | 3.22 s | 0 | 2 ms |
| Map | 3.60 s | 0.0071 | 6 ms |
| Avui | 2.56 s | 0 | 1 ms |

These are lab observations, not Lighthouse scores, real-user percentiles or a matched before/after experiment. Long-task excess is not Lighthouse TBT, and the short-load CLS sum is not a full session measurement. INP and complete prediction readiness were not measured. The initial cached, unthrottled homepage trace showed 100 ms LCP and zero CLS; it is unsuitable as cold-load evidence.

No HTTP error statuses appeared in the sampled browser resource entries. The map surface mounted; Avui's map remained offscreen/unmounted during its initial viewport sample. The homepage loaded no interactive map or prediction request and no video media stream; the responsive hero AVIF transferred about 67 kB. Its largest stylesheet transferred about 41 kB and took about 2.1 seconds under throttling; the hero request took about 2.4 seconds. These are investigation candidates, not measured savings or a proven regression. Browsers can request lazy imagery near the viewport, so a preview request alone does not establish eager loading.

The application, edge runtime and database containers were healthy. At approximately 10:37 CEST the app used 656 MiB and 0.46% CPU; edge runtime 740 MiB and 33.13% CPU; database 383 MiB and 3.86% CPU. Host available memory was about 7.7 GB. This point-in-time snapshot is not an overnight error or load audit. A separate Python HTTP probe returned 403 and was discarded; successful browser navigations are the evidence for public loading.

Assessment: no obvious rendering or host-capacity failure in this spot check, but a blanket performance pass is unwarranted. Slow-mobile LCP remains above Google's [2.5-second good threshold](https://web.dev/articles/vitals). Repeat comparable mobile measurements and profile the critical CSS/hero path before optimizing. The older PageSpeed scores used a different measurement method and cannot establish a change from these observations. SEO impact after one day remains unproven; use the complete-window checkpoints in the [map discovery plan](../map-discovery-plan.md).
