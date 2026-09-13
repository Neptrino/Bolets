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
