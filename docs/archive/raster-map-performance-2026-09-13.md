# Raster map startup — 13 September 2026

Dated performance receipt. Current conventions live in [frontend performance](../frontend-performance.md).

## Change

Prediction and habitat maps now use pinned Leaflet 1.9.4 for the existing raster
basemaps. Community finding maps retain MapLibre. The original map orchestration
moves behind a browser-only import; its scoring, bucket identities, resolution
access, clipping, prediction worker and timeline logic are unchanged.

The adapter preserves the original zoom convention, subpixel Mercator projection,
camera memory, layer controls, provider credits, navigation and fullscreen.
Location watches stay in memory, recover from temporary GPS errors and stop
following after manual movement. Map readiness is independent of tile delivery.

Leaflet's tile-level transform is overridden to avoid fractional-pixel changes
when restoring the same camera. The dependency is pinned and the camera tests
compare rendered pixels across species changes. Basemap color filters apply to
the joined layer, avoiding bright seams and per-image compositing surfaces. This
preserves Leaflet's [tile-edge blending](https://github.com/Leaflet/Leaflet/pull/8891).
Control corners retain the site's stacking order beneath information panels.

## Local evidence

The [measurement companion](raster-map-performance-2026-09-13.json) records six
alternating fresh-browser runs against production `8b1f33d` and the local
production candidate. Both receive the same captured public predictions and
tiles with 60 ms fixture latency; all tile fixtures match, all 24 prediction
requests complete and both maps finish loading without page errors. Browsers
use a 1350 × 940 viewport, 4× CPU slowdown and software rendering, with service
workers blocked and DNT enabled.

Before the final layer-filter adjustment, decoded script bodies decrease from
2,300,174 to 1,000,681 bytes. Main-thread long-task blocking totals decrease from
2,039–2,045 ms to 408–457 ms. The candidate creates no WebGL context. Local HTML
lacks production-only script configuration, so these bytes are not a strict
production-to-production transfer comparison. The blocking totals use the whole
observation window and are **not Lighthouse TBT or PageSpeed scores**.

The first Canvas2D paint still has a measurable initialization cost in a fresh
software browser. Context hints and skipping an identity transform did not
remove it and were not retained. The renderer change is justified by removing
the larger WebGL startup cost; it does not claim to eliminate all canvas work.

## Verification

Production build, type checking and lint/source-size checks pass. The unit suite
passes 1,554 tests with 12 skipped. Browser checks cover access floors, exact
prediction-worker pixels, timeline buffering, Avui visibility loading, native
and fallback fullscreen, all basemaps, geolocation recovery, manual panning,
camera restoration, local-guide framing, cell details and species-image priority.

The browser fixtures now block the service worker so interception also works
against a production build. Two older assertions were aligned with existing
product behavior: the public detail action leads to a new finding and navigation
uses “Espècies”. The local-guide check now respects the public 2.5 km floor and
independently verifies its actual camera from tile geography.

Large local traces, screenshots and diagnostic scripts are disposable files in
`artifacts/raster-map-2026-09-13/`. Production deployment and PageSpeed results
must be verified separately from these local measurements.
