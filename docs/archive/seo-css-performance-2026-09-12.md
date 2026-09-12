# SEO route stylesheet loading — 12 September 2026

Implementation and verification receipt. This follows the [raster worker measurements](map-raster-worker-2026-09-12.md); consistently high mobile PageSpeed scores remain unproven.

PageSpeed reported about 51–52 KiB of unused CSS on the homepage and representative species pages, with 330–410 ms of estimated render-blocking savings. The root stylesheet loaded territorial guides, finding forms, account screens and contribution layouts on every route.

Feature styles now load from their owning routes/components. Related territorial foundation and responsive files retain their relative order. MapLibre and shared controls remain global, including the offline outbox verification prompt. Two explicit spacing rules preserve the previous effective cascade for species local-guide headings and the Cep guide list.

## Production build comparison

These are decoded stylesheet bytes, not compressed network transfer. The same browser visited each page at 390 px and 1,350 px.

| Page | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Home | 427,943 | 307,655 | 28% |
| Catalogue | 427,943 | 299,659 | 30% |
| Cep / Pinetell | 430,216 | 318,951 | 26% |
| Map | 424,698 | 296,414 | 30% |
| Avui | 427,943 | 299,659 | 30% |
| Zones | 427,943 | 332,406 | 22% |
| Rovellons / Ceps guides | 424,698 | 329,161 | 23% |

The two final spacing-selector edits can change these totals by a few bytes. Build/type checking, lint/source-size and CSS tests pass. Four production-browser checks pass for both map workers and both species galleries. A 28-page/viewport comparison found two spacing differences, corrected before the final build. Local map APIs use the developer environment, which returned unavailable spatial data; this comparison verifies styles and separate fixtures verify workers, rather than claiming live prediction availability.

Artifacts, screenshots and computed-style comparisons are retained in `artifacts/seo-css-performance-2026-09-12/`. Live deployment and PageSpeed verification follow the final checks. AVIF sample encoding in that directory is an experiment, not part of this implementation.

Fourteen navigation checks preserved the corrected layouts. Chrome sometimes serialized automatic margins as zero instead of their used values; direct production/local bounding-rectangle comparisons confirmed identical positions and widths at both viewports. The catalogue baseline before this release scored [93 mobile](https://pagespeed.web.dev/analysis/https-bolets-app-bolets/55qb009551?form_factor=mobile), with 3.0 s LCP, 30 ms TBT and zero CLS.
