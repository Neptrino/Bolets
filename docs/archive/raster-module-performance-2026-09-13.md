# Raster source-module performance check — 13 September 2026

Historical implementation and measurement receipt. Current guidance is in
[frontend performance](../frontend-performance.md).

The prediction/habitat adapter now imports a narrow entry into pinned Leaflet
1.9.4 source modules. It retains the upstream map, all gesture handlers, base
controls, raster tiles and Mercator projection. It omits unused vector drawing,
markers, popups, overlays and built-in controls. Community MapLibre is unchanged.
The public API declarations remain scoped to that entry, and the package licence
is retained at `/licenses/leaflet.txt`.

## Controlled complete-build comparison

Three fresh browser runs per build, alternating order, with the same real
prediction fixture, 412 × 823 viewport, DPR 1.75, 4× CPU slowdown, 150 ms network
latency and 200,000 bytes/s download limit. Both production builds ran locally;
the baseline is `9bec1d0`. Service workers were blocked and DNT enabled.

| Metric | Baseline median | Raster entry median |
| --- | ---: | ---: |
| Total decoded JavaScript | 825,666 B | 756,346 B |
| FCP | 1,172 ms | 1,176 ms |
| LCP | 2,360 ms | 2,340 ms |
| Renderer mounted | 2,315 ms | 2,305 ms |
| Predictions ready | 3,304 ms | 3,304 ms |

Every run painted the same 154,374 prediction pixels with no browser errors.
The 69,320-byte reduction is clear; the small timing differences do not establish
a substantial load-time or PageSpeed improvement. [Raw runs](raster-module-performance-2026-09-13.json).

An initial HTML cartography prototype was evaluated first and discarded. Its
geographic fit matched the interactive view within a pixel on ordinary phone
widths, but replacing the preview with live tiles still produced a late LCP and
its extra early image requests competed with the renderer. It is not shipped.

## Verification

- Production build, TypeScript, lint and source-size checks.
- 16 focused unit tests, including registration of every required gesture.
- 15 production-browser checks: static tile deduplication and byte identity,
  server rendering, selectors, all basemaps, fractional tile seams, native and
  fallback fullscreen, location following, species/territory camera restoration,
  keyboard pan, wheel zoom and two-finger touch zoom.

## Live release and PageSpeed

Release `5b72b464f3b689958c659d06b7ac9fe83db69a69` completed
[CI and deployment](https://github.com/Neptrino/Bolets/actions/runs/34730696588).
The VPS container reports that exact image revision and healthy status.
Four independent production browser checks returned HTTP 200, loaded all tiles,
painted prediction/habitat canvases and produced no browser or API errors.
Default-map JavaScript fell from 1,021,081 to 951,761 decoded bytes including the
same analytics recorder: the same 69,320-byte reduction observed locally.

Fresh Google PageSpeed reports:

| Route/run | Mobile performance | Desktop performance |
| --- | ---: | ---: |
| [Map 1](https://pagespeed.web.dev/analysis/https-bolets-app-map/6b0ccx5boy) | 90 | 95 |
| [Map 2](https://pagespeed.web.dev/analysis/https-bolets-app-map/g15xxeb2lw) | 91 | 77 |
| [Map 3](https://pagespeed.web.dev/analysis/https-bolets-app-map/srs5ubzsfq) | 88 | 97 |
| [Avui](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-avui/3crcrpxg32) | 96 | 100 |
| [Cep](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-cep/lqj8u1y6c8) | 90 | 95 |
| [Pinetell](https://pagespeed.web.dev/analysis/https-bolets-app-bolets-pinetell/gv1sv84dz2) | 94 | 100 |

The map median is 90 mobile / 95 desktop. Mobile LCP was 3.396, 3.376 and
3.689 seconds, versus 3.8 seconds in both preceding-release runs. The slower
77 desktop run remains valid and included: it recorded 435 ms blocking time,
compared with 6 and 38 ms in the other two desktop runs. These scores establish
an improvement in the observed mobile range (previously 84–86), not a guarantee
that every audit or every visit will score 90+. Local timings changed only
slightly, so do not attribute all remote variation to the code change.

The first map report's SEO score was 92 because Google's robots.txt fetch timed
out. A direct fetch returned HTTP 200 in 173 ms; both repeat map reports scored
100 for SEO. Avui first encountered a DNS-resolution failure and then a failed
LHR retrieval. Both failures are retained separately from valid measurements.
The successful Avui, Cep and Pinetell reports all scored 100 for SEO. Map best
practices still flags automatic geolocation and raster image density; these
existing behaviors were not changed in this release.

[All reports and failed attempts](raster-module-pagespeed-2026-09-13.json).

