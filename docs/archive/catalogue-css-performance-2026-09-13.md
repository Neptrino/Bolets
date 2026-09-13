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
