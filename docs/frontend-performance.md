# Frontend performance

Keep first paint, interaction responsiveness and data publication separate when
measuring performance. A faster ingestion worker does not remove browser-side
stylesheet, hydration or rendering work.

## Styles and code loading

Shared design tokens, layout, reusable controls and MapLibre's control stylesheet
remain in `app/globals.css`. Feature-specific game, method, comparison,
infographic, mushroom-parts and culinary dossier styles are imported by their
owning page or component. Current-condition readings, rain explanations,
preservation guides and seasonal controls also load at their route/component
owners; only their shared editorial/navigation rules remain in `seo-content.css`.
Territorial routes with local guide layouts use `styles/local-guides.css`, which
loads the territorial foundation before the local components and responsive
rules. Importing these independently in the opposite order breaks mobile grids.
Keep related foundation/component/responsive imports
in order. Do not move a stylesheet solely by its filename: several catalogue
and field-guide files also contain shared classes. See the
[stylesheet measurement receipt](archive/seo-css-ownership-2026-09-13.md).

The photographic catalogue styles use the ordered `styles/species-catalogue.css`
entry, imported by `CulinaryRating` and `SeasonIndicator`. This brings catalogue
cards, galleries and profile styles to their public component owners without
loading that bundle on map or Avui. Keep the card contrast and mobile species
navigation overrides in this same ordered bundle. Shared visually hidden text
and search controls remain in `site-shell.css`, including their responsive rule,
because private findings also use the search field. Some other species rules
remain shared; moving a file requires a selector and computed-style check, not
only a filename match. See the
[catalogue stylesheet receipt](archive/catalogue-css-performance-2026-09-13.md).

`IntentLink` keeps Next.js navigation and native anchor semantics but enables
prefetch only after mouse hover, keyboard focus or touch. Use it in primary
navigation and acquisition links so a static page does not download the map or
game just because a link is visible. Preserve caller handlers and prevented
events. A dynamically imported map must still be mounted only when needed;
importing a map component eagerly in a prefetched route can fetch its engine.

The Avui map mounts automatically within 200 px of the viewport. Keep its fixed
responsive frame in the initial HTML and disconnect the observer after mounting.
Browsers without IntersectionObserver initialize on the next animation frame.
Its independent server-rendered summary reserves the usual content height while
streaming; longer text can expand. Keep the map's timeline and full-map link,
without making initialization depend on the summary or a click.

Lighthouse's simulated LCP (the PageSpeed lab score) treats every request that
started before the hero painted as blocking it, so the homepage score is set by
the bytes in flight before first paint: the async JavaScript chunks, the CSS,
the preloaded font and the hero. On a fast lab connection the browser also
starts lazy images up to ~3000 px below the fold before that paint, which put
the featured species photos on the hero's critical path. The homepage sections
below the fold (`.home-reference`, `.home-showcase-section`, `.home-findings`,
`.home-editorial-note`) and the footer use `content-visibility: auto` with a
`contain-intrinsic-size` estimate: their layout and paint are skipped until the
reader nears them, their lazy images no longer download ahead of the hero
(23 instead of 31 requests before LCP, 150 ms lower simulated LCP), and the
document height is unchanged. Full-page screenshots leave these sections blank
by design; compare viewport screenshots at scroll positions instead. Real-user
field LCP is unaffected by the lab simulation; the largest remaining lab and
field lever is time to first byte, which edge caching of the public HTML would
cut, but that is a Cloudflare policy decision (`deploy/vps/cloudflare.md`).

Keep the homepage hero eager with high fetch priority and responsive `sizes`.
The server-rendered HTML already emits its responsive image preload; do not add
a second fixed-width preload. Leave the map preview and lower-page imagery lazy
so they do not compete with the first-screen image. Verify actual resource
requests before adding preload hints, including duplicate downloads and the
selected responsive variant.

Local WebP sources are exported as responsive AVIF and WebP files by
`media:build`. `StaticMediaImage` uses a native picture source and derives its
candidates from Next's image sizing logic, retaining normal image events, blur
handling and a WebP fallback. Requested preloads target AVIF only, with its MIME
type and matching responsive candidates; unsupported formats fall back through
HTML without JavaScript. The picture wrapper contributes no layout box.
Version v15 uses AVIF quality 50 below 960 pixels and 60 at larger widths, effort
3; WebP retains quality 72, effort 4. Source dimensions and crop remain unchanged.
The versioned asset path invalidates older immutable encodings, while Caddy and
the service worker retain both formats under the same public static policy.
See the [AVIF measurement receipt](archive/avif-performance-2026-09-13.md).

Keep normal public-page analytics after hydration so performance recording
remains useful. The optional heatmap recorder loads through `lazyOnload`; the
existing privacy guard must run before it. The homepage video uses an optimized
poster and `preload="none"`, retaining native controls before hydration and when
JavaScript is disabled. A single play action must still start playback.

Finding synchronization checks the local outbox before initializing the auth
client. Empty/offline outboxes do not load that SDK. Resumable-upload code loads
when an actual photo is uploaded; login, private staging, retries and upload
resumption remain mandatory.

## Progressive map rendering

Prediction and habitat maps use the pinned Leaflet raster adapter in
`components/region-map/raster-map-browser.ts`. Community finding maps retain
the MapLibre factory in `map-instance.ts`. Both implement the small shared map
interface; scoring, canonical bucket requests, clipping and canvas painting
remain independent of the basemap renderer. Full-page map orchestration renders
on the server so Next can preload its client bundle. Leaflet accesses `window`
at module evaluation: the synchronous factory in `raster-map-instance.ts` defers
that evaluation until the mount effect. Keep its literal require scoped there;
an async factory would add a new download/initialization waterfall. Avui and
species maps retain their visibility-based client imports. Leaflet's stylesheet
loads with the renderer, while shared MapLibre control styles remain in the root.
The raster entry in `leaflet-raster.ts` imports the pinned package’s source modules,
including every map gesture handler, tile layers, projection and base controls.
It excludes unused vector renderers, markers, popups and built-in controls.
Keep the matching declarations in `leaflet-source.d.ts` narrow, and rerun gesture
and camera tests for a Leaflet upgrade. This saves 69,320 decoded JavaScript bytes
on the default map. Local cold-load LCP changed only slightly. Live PageSpeed
recorded a map median of 90 mobile / 95 desktop across three runs, with meaningful
variation; see the [release measurements](archive/raster-module-performance-2026-09-13.md)
for all scores and limitations.

Browser checks must wait for the initialized `.raster-map-surface` before using
strict shell selectors: streaming can briefly include a hidden shell alongside
its visible fallback.

The map's heading and fullscreen species selectors use `VisibleQuerySelect`.
Their controls remain behind the existing collapsed/hidden panels. Load the
shared searchable combobox on first visibility through React lazy/Suspense,
then keep it mounted so reopening is immediate. The placeholder retains the
selected label and control dimensions, and cannot accept input while loading.
This removes the combobox/floating-positioning code from map startup while
retaining the shared accessible selector, route behavior and fullscreen portal.

The adapter translates Leaflet's 256-pixel zoom to the existing 512-pixel map
convention and preserves subpixel Mercator projection. A documented tile-level
transform override avoids camera-dependent fractional-pixel drift on restored
views; check screenshot parity before changing the pinned Leaflet version.
The fixed-CRS raster tile layer keeps loaded parent/child tiles through
non-animated view resets. Its public event map omits the blanket pre-reset
invalidation; normal zoom/viewreset reprojection and tile pruning still run.
This prevents wheel/keyboard zoom from flashing the empty background while new
tiles load. Test delayed zoom-in and zoom-out responses, replacement pruning and
camera alignment when changing this behavior.

Between `movestart` and `moveend` the prediction and habitat canvases are not
repainted: `viewport-gesture.ts` carries the last painted frame with a CSS
translate/scale computed from one shared anchor coordinate, which is exact for a
north-up Mercator view, and the owner repaints once the gesture settles (its
own moveend work, or the helper's next-frame fallback). Repainting a
viewport-sized canvas on every pan/pinch frame had kept the main thread busy for
the whole gesture and about 1.5 s after it, and taps arriving in that window
were where the map's Interaction to Next Paint accumulated. The Catalonia land
clip is traced once per map into a `Path2D` and moved with the same
translate/scale; rotated or tilted views and browsers without `Path2D` project
every vertex as before. Overlay canvases cap their backing store at 2× device
pixels, and the heat painter yields one task after presenting the carried frame
before it projects every cell for the worker. Measure gestures with the
Event Timing and Long Tasks observers on a CPU-throttled mobile emulation, not
only Lighthouse: page-load audits report no blocking time for these maps.

Map readiness does not wait for remote tiles. Keep the tile pane below the
independent canvases and control corners at z-index 2, below site panels.
Geolocation watches remain local to each mounted map; manual panning stops
following, and restored species views never restart automatic geolocation.

The 18 default zoom-7 opening tiles (relief/reference, x 63–65, y 46–48) are
frozen under `data/icgc-bootstrap/` with source attribution and checksums.
`media:build` validates all files before copying them unchanged into the existing
versioned optimized-media path. They use Caddy/CDN static serving; all other
coordinates, zooms and providers retain their normal paths. This caches only
background cartography. Predictions retain publication-aware freshness. Refresh
with a new bootstrap version, never by overwriting an immutable URL. Browser
checks verify exact tile bytes and the normal API after zooming. The default
`/map` without map parameters preloads only the two central static tiles at low
priority, with a max-width 680px media condition. Desktop and explicit
region/species/territory views must not download unnecessary hinted tiles;
normal tile rendering reuses the preload requests.

Attach raster layers after the synchronous initial camera fit, so temporary
startup views do not download tiles. The default relief/reference layers use
versioned v2 WebP tiles at quality 85 with transparency preserved. Reuse the
original allowlisted ICGC loader, persist encoded tiles in the Next data cache,
coalesce identical cold requests and bound conversion work to two active jobs
and 64 waiting jobs. Bound cold downloads separately to 16 active and 128 waiting
jobs: provider latency must not occupy a conversion slot. Error responses remain
uncached. Keep v1 URLs available
for older clients and change the URL version when encoding policy changes.
Do not initialize an empty canvas before its first data frame; an already
painted canvas must still clear immediately when species or layers change.

Bucket URL identity, access limits, deduplication and the shared network gate
remain unchanged. Coalesce intermediate prediction coverage and paint updates
within a 100 ms window. Each callback must check the current batch and abort
signal; cancel queued work on a new viewport, effect cleanup and completion.
Always merge and draw the final arrivals before exposing final coverage. A
partial or truncated viewport must never be reported as complete. Timeline
frames remain atomic and are not shown one bucket at a time.

When persisting a fetched public bucket, reuse its successfully parsed JSON
text instead of serializing every cell again. The same public resolution,
truncation and freshness checks apply to both persistence paths.

Map detail cards use the score, components and model version published in the
cell response for both combined and species views. Do not run the scoring
engine again in the browser: display values omit private thermal inputs, and
coarse cells can carry the chosen child's complete reading.

## Territorial readings

Local species guides stream their condition and habitat panels independently of
editorial content. Their slow cold response is chiefly the shared 1 km environment
read, not the initial HTML. Filter shared bucket cells against the union of the
requested territorial windows before scoring; preserve inclusive centre-based
boundaries, complete-payload validation and truncation failures.

The existing host warming service also primes each published local guide's exact
condition and habitat cache. It uses the separate warming credential, one local
target at a time and the spatial queue's background slot for condition reads.
The warmer makes authenticated, Do-Not-Track loopback requests to the actual
page routes and validates completed panel markers. Next includes compiled callback
text in cache keys; calling the same loader from an API bundle does not reliably
populate the RSC bundle cache. Successful targets resume across the 90-second budget; concurrent triggers
coalesce and a publication change invalidates progress. No browser scripts, private
map access or analytics run during warming. Two sequential HTTP calls have
120-second client deadlines and a 260-second systemd ceiling.

Condition cache keys include both completed publication markers, the Catalonia
civil day and a twelve-hour period. Pass the publication identity through to the
upstream environment fetch too, so an old five-minute environment entry cannot
populate a new final-summary cache. Background priority must not change cache
identity. Reject stale/incomplete summaries and truncated habitat reads before
caching; an empty verified habitat result and a complete zero score remain valid.
Keep this warming optional and resumable so publication and deployment readiness
do not wait for it.

## Verification

For unexplained first-byte stalls, run `node scripts/diagnose-navigation.mjs`
with the repository's Playwright browsers installed (`npx playwright install
firefox chromium`). It makes bounded, sequential public requests in isolated
Firefox and Chromium contexts, with DNT enabled, and saves navigation timing
phases to `artifacts/navigation-diagnostic.json`. Returning visits wait up to
15 seconds for normal service-worker activation and record whether it succeeded.
It never attaches to a user's signed-in browser or exports HAR/cookies.
Run it on the affected operating system/network where possible: a fast local
run does not disprove a visitor incident. Browser timing precision and worker
interception can produce zero, slightly negative or unavailable phase values;
do not interpret them as exact network measurements. Preserve useful dated
results in the documentation archive with the platform and limitations.

Build production before checking prefetch or bundle behavior; development does
not reproduce Next's automatic production prefetch. Compare like-for-like fresh
browser contexts and device/network settings. Record transfer sizes as well as
paint and long-task timings. Local PerformanceObserver totals are not Lighthouse
scores or Lighthouse's exact Total Blocking Time measurement window.

Exercise native/no-JavaScript video playback, keyboard and pointer navigation,
partial map coverage, species changes, viewport restoration and the timeline
buffer. Check affected stylesheet owners on direct loads and after navigation.
Use Google PageSpeed Insights again after deployment; its CrUX field data covers
the preceding 28 days and cannot immediately isolate the new release.
