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

A final focused cleanup removes browser rescoring from species-map detail
cards. Both species and combined views now preserve the server's published
score, components and model version. The local map's decoded scripts decrease
from 1,000,882 to 989,619 bytes in the same browser check. Two unit cases cover
published readings, withheld/zero states and missing habitat; 15 further browser
checks pass for map details, species changes, habitat views and responsive
controls. Build, lint and type checks pass. The four public-data candidate maps
again render without page/API errors.

## Earlier map bundle loading

After the queue correction, all four live map checks finish with loaded tiles,
painted predictions/habitat and no page or API errors; 16 simultaneous cold tile
requests also succeed. A controlled production visit transfers 62,920 tile bytes
instead of 203,784. Valid repeated mobile PageSpeed map scores still vary: 83
before WebP and 70 after the queue correction. A reported 98 is explicitly
excluded because six JavaScript downloads timed out and the map never started.
The error-free desktop result for that report is 92.

The next candidate server-renders the map shell, enabling Next's client-bundle
preload. A synchronous browser factory defers Leaflet evaluation until mount;
Avui and species maps retain visibility-based imports. An isolated production
build of `ad41694` provides the comparison baseline. Four alternating mobile
runs under identical throttling show median LCP improving from 3,100 to 2,818 ms
(9.1%), with the first tile request approximately 270 ms earlier. All runs paint
the same 154,374 pixels and have no browser errors. These are local measurements,
not a promised PageSpeed score. Extra image head preloads were tried and
discarded because map code remained the critical path.

Build, typecheck and lint/source-size checks pass, along with nine adapter unit
cases and 16 targeted browser cases. Streamed server rendering briefly includes
a hidden shell beside the visible fallback; camera/control checks now wait for
the initialized raster surface before asserting strict selectors. Production results are recorded below.

## Live SSR release results

`d550dac` passed [CI and deployment](https://github.com/Neptrino/Bolets/actions/runs/34725255091); the production container reports that revision and healthy status.
The full unit suite passes 1,566 cases (12 skipped). Real-data browser checks
pass on `/map`, `/bolets-avui`, `/bolets/cep` and `/bolets/pinetell`, with all tiles
loaded, nonzero prediction/habitat pixels and no page or API errors.

The same throttled mobile production check measures 3,964 ms LCP, versus
4,896 ms after the WebP queue correction; tile transfer remains 62,920 bytes.
This individual live comparison is subject to network variance; the controlled
local A/B remains the evidence for the isolated SSR improvement.

[Fresh Google reports](raster-map-pagespeed-ssr-2026-09-13.json) give:

| Page | Mobile | Desktop |
| --- | ---: | ---: |
| Map, first run | 75 | 91 |
| Map, repeat | 86 | 97 |
| Bolets avui | 94 | 99 |
| Cep | 90 | 99 |
| Pinetell | 90 | 100 |

All completed reports score 100 for SEO. Both map audits report no console
errors; mobile TBT rounds to zero, but LCP remains 4.1–4.9 seconds. The map
therefore does **not** yet sustain a green mobile performance score. An initial
Avui request failed in Google's URL resolver and was retried; it is not counted
as a page-performance result. The valid repeat is listed above.

A further mobile layout trace attributes two small shifts (0.00745 each) to the
floating detail panel changing height while its status updates; these are
secondary to image discovery/loading and do not justify changing map behavior
without a separate measured candidate.

## Defer hidden species selectors

The map still loaded searchable selectors inside its collapsed heading and
fullscreen-only control. `VisibleQuerySelect` loads the existing combobox on
first visibility, using React lazy/Suspense and a dimension-matched disabled
placeholder. It retains the control after loading and keeps the existing
fullscreen portal, route selection and keyboard behavior.

Four alternating production-build mobile runs against isolated `2c69d02`
reduce decoded initial scripts from 989,750 to 824,712 bytes (16.7%). Median LCP
improves from 2,874 to 2,574 ms (10.4%), with matching painted pixels and no
browser errors. The companion JSON retains every run. This is a controlled
local improvement; fresh deployed PageSpeed scores remain required.

Build, type checks and lint/source-size checks pass. Eleven browser cases cover
mobile keyboard selection, native fullscreen portals, browsers without
IntersectionObserver, camera restoration, basemaps, seams and geolocation.

The hidden-selector release `55f47d4` deployed successfully and passed live
real-data checks on all four map routes. Fresh map reports
([first](https://pagespeed.web.dev/analysis/https-bolets-app-map/u7y7v78yok?form_factor=mobile),
[repeat](https://pagespeed.web.dev/analysis/https-bolets-app-map/elmk47via5?form_factor=mobile))
score 77/80 mobile and 96/97 desktop. Their mobile LCP remains 5.3/4.9 seconds.
The controlled bundle/render improvement has therefore not yet produced a
consistent green mobile map score; that part of the goal remains open.
