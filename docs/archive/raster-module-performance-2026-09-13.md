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

Live deployment and PageSpeed results will be recorded after rollout. Scores
from earlier releases must not be attributed to this change.
