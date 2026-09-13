# SEO stylesheet ownership — 13 September 2026

Historical implementation receipt. Current conventions are in
[frontend performance](../frontend-performance.md). The
[measurement evidence](seo-css-ownership-2026-09-13.json) preserves all six
controlled map runs, including the slower samples.

Current-condition readings, rain explanations, preservation guides and seasonal
controls previously loaded on every page through the shared SEO stylesheet.
Move those rules to their route/component owners, retaining shared editorial
and navigation rules globally. The minified shared stylesheet falls from
38,407 to 14,112 bytes (63%); gzip falls from 7,147 to 3,235 bytes (55%). This is
one stylesheet's reduction, not the entire page's transfer savings. Routes that
need the extracted rules still load them.

A PostCSS comparison preserves all 431 selector/context declaration sequences.
Computed-style captures cover 22 mobile/desktop views across 11 routes. Their
only differences were four transient Avui loading nodes disappearing between
captures; no newly styled or changed node was found. The territorial table was
not available in this capture and is not claimed as visual coverage.

Six alternating fresh mobile-browser runs compare the same application, images
and prediction fixture, changing only that stylesheet over real gzip HTTP.
Median map LCP changes from 2,384 to 2,364 ms and FCP from 1,304 to 1,268 ms.
All six runs load 825,666 decoded JavaScript bytes, paint 154,374 prediction
pixels and report no page errors. The gain is small; these local measurements
are not PageSpeed scores or proof of a material score improvement.

The expanded guide checks also reproduced an existing production overflow:
responsive local-guide rules loaded before their foundation, allowing desktop
image and grid dimensions to win on mobile. A single ordered stylesheet entry
restores the intended cascade. Flexible grid tracks and a wrapping update date
prevent the condition card widening the page. Below 400 px, the local calendar
uses two six-month rows so its month labels remain legible without overflow.
Regression coverage checks four local guides at 320, 390 and 1350 px.

Production build, lint/source-size, type checks, seven seasonality unit cases
and all 15 relevant browser cases pass. The narrow calendar was also inspected
visually. Live PageSpeed results will be recorded separately
once the candidate has deployed; no live score gain is claimed here.
