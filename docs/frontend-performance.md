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

## Verification

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
