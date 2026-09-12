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

Repeating the same six-run comparison with the final layer-filter adjustment
gives 1,000,695 decoded script bytes and 412–448 ms blocking, versus the old
release's 2,300,174 bytes and 1,970–2,002 ms. All fixtures still match and all
maps finish without page errors. These runs are retained as `releaseRuns` in the
companion. The final visual check also verifies uniform tiles have no visible
seams at fractional zoom.

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
All 36 targeted browser cases pass, including the final seam check; camera and
control checks were repeated after the layer-filter adjustment.

The browser fixtures now block the service worker so interception also works
against a production build. Two older assertions were aligned with existing
product behavior: the public detail action leads to a new finding and navigation
uses “Espècies”. The local-guide check now respects the public 2.5 km floor and
independently verifies its actual camera from tile geography.

Large local traces, screenshots and diagnostic scripts are disposable files in
`artifacts/raster-map-2026-09-13/`. Production deployment and PageSpeed results
must be verified separately from these local measurements.

## Live result and follow-up

Release `19adecb` deployed successfully and passed real-data browser checks on
the map, Avui, Cep and Pinetell. The [fresh PageSpeed reports](raster-map-pagespeed-live-2026-09-13.json)
show mobile performance 92–95 on the tested SEO content pages, but **63 on the
map** (5.7 s LCP, 430 ms TBT). Map desktop scored 87; the other completed desktop
reports scored 99–100. Google's Avui desktop audit failed internally. The map's
new image tiles are LCP candidates, unlike the previous canvas basemap; its
mobile regression must not be obscured by the controlled local CPU improvement.

The follow-up removes temporary-camera tile requests, reuses received JSON for
browser bucket persistence, and skips fresh empty canvas allocation while still
clearing previously painted species. Default relief/reference tiles move to a
persistently cached, bounded WebP encoder on v2 URLs; v1 remains available.
Four representative tiles shrink from 25–82 kB to 7–33 kB (57–72%). Visual
inspection preserves readable labels; tests cover transparency and dimensions.

Follow-up validation: 1,563 unit tests pass (12 skipped), production build,
typecheck and lint/source-size checks pass, and 15 focused browser cases cover
camera restoration, controls, seams, access floors, Avui and timeline buffering.
The local environmental service returned 503 during an unmocked data attempt;
that attempt does not count as a successful rendering check. Candidate browser
verification therefore also fetches public prediction/habitat data from the
live site while exercising local WebP tile routes. Fresh post-deployment
PageSpeed measurements remain required.

The first WebP deployment (`ba12e80`) exposed an overly restrictive cold path:
the two conversion slots also waited on the provider, and two Avui tile requests
returned 503 during the live multi-page check. The correction separates 16
bounded cold downloads from two concurrent conversions. A regression test holds
provider responses open and verifies other downloads still start. Cached
responses bypass both queues. All 16 concurrent real-tile requests also pass in
the local production build. No tile errors are cached.
