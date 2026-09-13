# Opening map static tiles — 13 September 2026

Historical implementation receipt. Current ownership and refresh guidance live
in [frontend performance](../frontend-performance.md) and the
[source catalogue](../../data/icgc-bootstrap/README.md).

After the hidden-selector release, valid mobile map PageSpeed reports still
scored 77 and 80, with LCP 5.3 and 4.9 seconds. The first report's observed LCP
breakdown included 900 ms loading its tile. Opening tiles still passed through
the application API, which intentionally bypasses Cloudflare edge caching.

The [view inventory](icgc-bootstrap-2026-09-13.json) records map viewports from
320 to 1920 pixels and mobile/desktop Avui, Cep and Pinetell views. The mobile
opening views share 18 zoom-7 tiles: relief/reference, x 63–65, y 46–48. Freeze
only that set (62,920 bytes), preserving exact WebP responses and provenance.
Build-time checksum validation exports them through the existing public static
CDN path; all other tile coordinates keep the normal API. No prediction data,
viewport persistence, provider configuration or edge caching rules change.

Validation passes: production build, lint/source-size, type checks, 14 unit
cases, and 17 browser cases covering static tile byte identity, normal API
requests after zooming, camera restoration, geolocation, provider switching,
seams, hidden selectors, incremental predictions and Avui viewport loading.
The new browser case initially tried mobile-hidden zoom buttons; it was fixed
to use the actual double-click zoom gesture and passed. Those failures were in
the test's interaction, not missing or damaged map tiles.

This candidate removes the application's tile handling from the opening view.
Its deployed PageSpeed impact remains to be measured; no score improvement is
claimed from the path change alone.


Four alternating local production-build runs compare the same client bundle
and prediction fixture, routing opening tile requests through the normal API
or static path. LCP was 2,736/2,600 ms through the API and 2,580/2,580 ms through
static files (median 2,668 → 2,580 ms). Initial decoded JavaScript was identical
at 825,666 bytes and each run painted 154,374 prediction pixels without browser
errors. This small local comparison does not model Cloudflare edge distance or
prove a live PageSpeed gain. Raw runs are retained in the companion JSON.


The first CI image build (34727050926) failed before activation because the
isolated Docker media stage copied only the earlier media builder inputs. The
follow-up adds the bootstrap helper, URL module and source catalogue to that
stage. Production retained the healthy `fbfe76f` release throughout.

The corrected COPY set passes an isolated Linux amd64 Docker check: starting
from an existing local Node application image, an empty `/bootstrap` directory
receives exactly the media stage's COPY inputs and successfully exports all
18 verified tiles. This checks dependency packaging, not the full release image;
Actions must still complete its normal build and smoke test.


## Low-priority mobile preloads

A subsequent controlled HTML experiment uses the static tile path in both
arms, rewriting the document in both arms and adding only two low-priority
image preloads to the candidate. Four alternating mobile runs give LCP
2,620/2,396 ms without hints and 2,240/2,236 ms with hints (median 2,508 →
2,238 ms, 10.8%). Both arms load the same 825,666 bytes of client scripts and
paint 154,374 prediction pixels. The cold first control run also has slower
first paint; the second pair still improves LCP by 160 ms.

The candidate adds hints only on the default `/map` without requested map
parameters, restricted to screens at most 680 pixels wide. Both use low fetch
priority, exact immutable central-tile URLs and normal browser request reuse.
Explicit territory/region/species views do not add hints. A previously saved
alternative basemap can make these two hints unnecessary; they remain bounded
to 28,954 bytes and never preload prediction data. Desktop ignores their media
condition. This differs from earlier unsuccessful high-priority API hints.


The preload candidate passes the production build, targeted lint, type checks
and four browser checks. The opening view makes exactly 18 tile requests,
including reuse of the two preloads; desktop makes no hinted image requests
with JavaScript disabled, and explicit region/species/territory HTML has no
hints. Incremental prediction painting and homepage navigation also pass.


Two checks of the actual compiled preload build (without HTML rewriting) give
LCP 2,564 and 2,384 ms, unchanged script bytes and matching prediction pixels.
These are implementation checks, not a second controlled A/B; they should not
be substituted for the original experiment or deployed Google measurements.


## Static-tile release check

Release `019f8bd` completed Actions run 34727177035 and is healthy on the VPS.
Live mobile map, Avui, Cep and Pinetell views paint real prediction/habitat
pixels with no browser/API errors and use only static bootstrap tiles for their
opening basemap. The central relief tile responds 200, `image/webp`, 22,010
bytes, immutable one-year caching, and Cloudflare `HIT`.

The [fresh before/after Google reports](icgc-bootstrap-pagespeed-2026-09-13.json)
score 80/99 mobile/desktop before and 78/95 after. Mobile LCP decreases from
4.8 to 4.6 seconds, but TBT and Speed Index are worse in the latter run. Both
reports have no console errors. This does **not** establish a PageSpeed score
gain from static serving alone; the remaining startup bottleneck is open.
The low-priority preload follow-up above is separately tested and awaiting its
own deployed measurement.


## Preload release check

Release `a64370a` completed Actions run 34727745654 and is healthy. All four
live map routes retain real painted data, successful tile loads and no
browser/API errors. Live bootstrap checks verify exactly 18 opening requests,
byte-for-byte source tiles, normal API tiles after zooming, no desktop hinted
downloads and no hints on explicit map views.

The production streamed response repeats identical hint tags in its HTML. The
browser deduplicates the two resources and respects every media/priority
attribute. The browser test now checks unique resource identities and actual
network behavior instead of assuming an exact count of serialized tags.

Fresh PageSpeed reports score 79 then 89 mobile, and 96 then 97 desktop.
Mobile LCP is 4.2 then 3.6 seconds, versus 4.8 seconds in the recent pre-bootstrap
baseline. All reports retain SEO 100 and no console errors. The first run also
has slower first paint and Speed Index; it is retained, not replaced by the
better repeat. The mobile map therefore still does **not** consistently reach
90. In the first run, the central tile is discovered after 240 ms and loads in
30 ms, followed by 2,330 ms render delay. More image prioritization cannot
remove that remaining initialization/rendering work.
