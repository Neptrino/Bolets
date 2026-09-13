# Catalogue stylesheet ownership — 13 September 2026

Historical implementation receipt. Current guidance is in
[frontend performance](../frontend-performance.md); the
[measurement evidence](catalogue-css-performance-2026-09-13.json) retains every
controlled sample and the stylesheet ownership check.

Fresh Google map reports on the previous runtime scored 88/90 on mobile and
92/98 on desktop. Its shared stylesheet was still about 46 KiB on the wire,
with roughly 35 KiB reported unused for the opening map. Move the three
photographic catalogue stylesheets from the root to one ordered component-owned
entry. `CulinaryRating` and `SeasonIndicator` bring it to cards, profiles and
comparisons. The map and Avui no longer request that bundle. Shared search and
visually hidden text remain global because other pages also use them.

The main stylesheet falls from 256,471 to 224,378 decoded bytes; gzip falls from
42,932 to 37,409 bytes. These are stylesheet sizes, not total page savings.
Catalogue routes still load the rules they need. The split also moves the final
card contrast, small-screen calendar-label and mobile species-navigation rules
with their foundations, preserving their cascade order.

The first computed-style comparison caught card contrast and mobile navigation
overrides that still lived outside the moved bundle. After moving those
unchanged declarations into the ordered bundle, all 23,168 sampled elements
across 30 mobile/desktop views match the baseline. The declaration comparison
preserves all 818 selector/context sequences. Browser tests cover 22 cases:
responsive images and native fallback, galleries, calendars, guide navigation,
and map camera/geolocation restoration. Build, type checks and lint/source-size
also pass. These sampled views do not cover every possible private account or
conditional reading state.

Six alternating controlled map loads keep JavaScript at 825,666 decoded bytes
and render 154,374 prediction pixels without errors in every sample. Median
FCP changes from 1228 to 1136 ms; median
LCP changes from 2368 to 2344 ms. The
first-paint gain is modest and LCP changes little. This does not itself prove
a PageSpeed score gain; fresh Google reports follow production deployment.


## Live release and regression check

Revision `5dbdd6edb49dc29114fac556ff722738a62c69c1` deployed through successful
[Actions run 34729559724](https://github.com/Neptrino/Bolets/actions/runs/34729559724).
The VPS reports the expected revision and healthy status. All 20 selected live
browser cases pass, along with actual tile and prediction/habitat rendering on
map, Avui, Cep and Pinetell. The live stylesheet inventory confirms the catalogue
bundle is absent from map/Avui and present on catalogue/profile routes.

[Fresh Google reports](catalogue-css-pagespeed-2026-09-13.json) preserve every
sample, including the low map scores and the failed Avui desktop driver:

| Page | Mobile performance | Desktop performance |
| --- | --- | --- |
| Map | 84, 86 | 95, 98 |
| Avui | 94, 93 | Google driver error, 100 |
| Cep | 90, 90 | 98, 100 |
| Pinetell | 91, 91 | 99, 100 |
| Home | 92 | 99 |
| Catalogue | 96 | 99 |
| Ceps territory guide | 96 | 100 |
| Season guide | 91 | 100 |

All valid samples score 100 for SEO and report no page console errors. The new
map samples do not demonstrate a PageSpeed improvement: they remain below 90.
Its first run spent 140 ms in Lighthouse's blocking window; the second spent
30 ms. Both reported 3.8 s LCP. Smaller CSS has not removed the map's startup
cost, and further CSS-only edits are not the main next intervention.

Because species scores were also lower than the previous batch, a separate
before/after production-build check tested Pinetell and the catalogue with six
alternating fresh mobile loads each. Pinetell median FCP improved from 1,392 to
1,160 ms and LCP from 1,464 to 1,440 ms. Catalogue FCP/LCP improved from 1,428 to
1,308 ms. No page error or slowdown was reproduced under these settings. Both
builds use the same content and images; temporary dependency-root configuration
changes generated chunk identifiers, with 7 script bytes and 94 CSS bytes of
size difference, so this is not represented as byte-identical compilation.
Keep the measured first-paint savings while pursuing the remaining map startup
work; do not describe this release as achieving consistent 90+ map scores.
