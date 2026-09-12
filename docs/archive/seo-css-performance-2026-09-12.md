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

## Deployment

Release `a0bb7849e7faa8618e6cd8065a9f58d2040684d5` passed [CI and deployment](https://github.com/Neptrino/Bolets/actions/runs/34719918514). The VPS release symlink matches and the app is healthy. All eight checked SEO pages and their stylesheets return 200. Their loaded CSS retains MapLibre controls and excludes finding-form layouts and contribution panels. The image revision label also matches.


## Live PageSpeed results

[All twelve reports and their metrics](seo-css-performance-live-2026-09-12.json) are retained, including repeat runs. Ranges report both runs; they are not a claim of stable field performance.

| Page | Mobile score | Desktop score |
| --- | ---: | ---: |
| Home | 88, 93 | 100, 100 |
| Catalogue | 93 | 100 |
| Cep | 87, 90 | 100, 100 |
| Pinetell | 91 | 100 |
| Map | 89, 72 | 72, 69 |
| Avui | 88, 96 | 71, 82 |
| Rovellons guide | 98 | 100 |
| Ceps guide | 84 | 100 |

PageSpeed's unused-CSS estimate fell from roughly 51–52 KiB to 29–31 KiB on the species/home pages. The catalogue and several editorial pages now reach the high-score band, but the objective is not complete: map performance remains inconsistent, desktop map/Avui blocking is still substantial, and Ceps/mobile image-led pages need further investigation. The fresh 4× CPU desktop map profile has 776 ms attributed to native/program work, 112 ms in the chunk loader, and no application function above 30 ms self-time. A browser timeline trace is needed to identify the native work before choosing another map change. The profile is in the artifact directory.

The optional question about an Avui preview that becomes interactive on tap remains unanswered at the time of this receipt. This release preserves immediate map initialization. AVIF remains an experiment; it has not been shipped.
