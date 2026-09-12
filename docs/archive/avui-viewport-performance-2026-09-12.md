# Avui viewport loading and map startup experiments — 12 September 2026

Dated optimization receipt following the [stylesheet release](seo-css-performance-2026-09-12.md). The site-wide PageSpeed objective remains open, especially the full map's desktop blocking and mobile consistency. Current implementation conventions live in [frontend performance](../frontend-performance.md).

## Change and local evidence

On a 390 × 844 mobile viewport, Avui's map starts around 1,277 px down the page but previously initialized its engine, workers, tiles and predictions immediately. It now mounts automatically within 200 px of the viewport using a client-side dynamic import. The existing map, timeline, data model and fixed responsive frame remain. It needs no click and does not wait for the separately streamed territorial answer. Browsers without IntersectionObserver initialize on the next animation frame.

The answer's loading state now shares its heading and typical reserved height with the completed answer instead of showing a short, unrelated ranking placeholder. This reduces the known streaming shift; longer text and larger text settings remain free to expand. The reservation does not guarantee zero CLS for every possible future reading.

Fresh browser contexts, service workers blocked, DNT enabled, five seconds after navigation:

| Measurement | Live previous release | Local production candidate |
| --- | ---: | ---: |
| Decoded script response bytes | 2,276,810 | 496,351 |
| Map API/tile/worker requests | 105 | 0 |
| Map frame height | 496 px | 496 px |
| Map frame top | 1,277 px | 1,285 px |

These are decoded bytes, not compressed transfer sizes, and request counts are a single observation rather than fixed budgets. The local server lacks current production readings; its unavailable summary differs from live content. The measurements prove offscreen work is deferred, not a PageSpeed score improvement. Browser verification exercises scrolling, timeline selection, unchanged frame height, automatic visible initialization and missing-observer fallback. Production PageSpeed verification follows deployment.

Final production build, type checking and lint/source-size checks pass. All 48 targeted overview/map unit tests and four browser flow checks pass. An existing browser selector initially matched both streamed placeholders and the completed answer; it now waits specifically for the labelled, completed answer.

## Investigated but not shipped

Removing backdrop blur did not improve repeated cold-map measurements: normal main-thread blocking totals were approximately 165–170 ms and no-blur repeats approximately 165–177 ms. No blur-removal change was retained.

An instrumented software-rendering reproduction sometimes spent about 1.9 seconds creating its first WebGL2 context. Results varied markedly by browser/context state; this is not a measurement of PageSpeed's own native context timing. Worker prewarming, a small initial canvas and alternate context options failed to remove the stall reliably. None were retained.

A separate raster-only prototype compared MapLibre and Leaflet with the same ICGC tile coverage (90 successful tile responses each), in fresh software-rendering browsers with 4× CPU throttling. Its final document-driven runs measured MapLibre ready times of 1,156/956 ms and Leaflet 704/670 ms, with long-task blocking totals of 102/48 ms versus zero. Those totals are not Lighthouse TBT. Earlier protocol-driven variants were excluded because initialization could run under Runtime.evaluate. The prototype omits prediction overlays and application controls and has visual tile-seam differences, so it does not establish production parity or justify a renderer migration yet. No dependency was added.

Normalized evidence is retained in [the measurement companion](avui-viewport-performance-2026-09-12.json). Larger traces, scripts and screenshots remain in ignored `artifacts/map-startup-performance-2026-09-12/`.

## Live deployment and PageSpeed

Release `8b1f33d7ffe813dd6a160bf5272098607c9be188` passed [CI and deployment](https://github.com/Neptrino/Bolets/actions/runs/34721174037): 1,547 unit tests passed and 12 were skipped, with all required verification and image smoke checks successful. The VPS release symlink and healthy container image revision match. Three browser checks also pass against production. A separate check with real public data painted 19,319 nontransparent prediction pixels without page errors or failed API responses.

In the same fresh mobile browser setup, production now loads 691,822 decoded script bytes before scrolling (about 70% below the previous 2,276,810), with zero map API/tile/worker requests. The local candidate's smaller 496,351-byte figure excludes production-only script configuration; use the production-to-production comparison when reporting the live reduction.

[Normalized live PageSpeed results](avui-viewport-performance-live-2026-09-12.json):

| PageSpeed report | Performance | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Avui mobile](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-avui/g5o303ietz?form_factor=mobile) | 95 | 1.7 s | 2.9 s | 0 ms | 0 |
| [Avui mobile second report](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-avui/5bblxo52oj?form_factor=mobile) | 95 | 1.7 s | 2.9 s | 0 ms | 0 |
| [Avui desktop](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-avui/5bblxo52oj?form_factor=desktop) | 82 | 0.3 s | 0.5 s | 400 ms | 0 |

Both mobile reports show the same capture minute and identical metrics, so they may reuse the same underlying audit; they are not proof of independent-run consistency. The first desktop attempt failed inside PageSpeed's driver with a closed Runtime.evaluate session; the second returned the result above. Mobile blocking is now zero in the reported audit, compared with 110–280 ms in the two pre-release reports. Desktop still initializes the visible map and remains below the high-score band. No new improvement to `/map` or species pages is claimed by this release.
