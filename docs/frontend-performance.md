# Frontend performance

Keep first paint, interaction responsiveness and data publication separate when
measuring performance. A faster ingestion worker does not remove browser-side
stylesheet, hydration or rendering work.

## Styles and code loading

Shared design tokens, layout, reusable controls and MapLibre's control stylesheet
remain in `app/globals.css`. Feature-specific game, method, comparison,
infographic, mushroom-parts and culinary dossier styles are imported by their
owning page or component. Keep related foundation/component/responsive imports
in order. Do not move a stylesheet solely by its filename: several catalogue
and field-guide files also contain shared classes.

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

Bucket URL identity, access limits, deduplication and the shared network gate
remain unchanged. Coalesce intermediate prediction coverage and paint updates
within a 100 ms window. Each callback must check the current batch and abort
signal; cancel queued work on a new viewport, effect cleanup and completion.
Always merge and draw the final arrivals before exposing final coverage. A
partial or truncated viewport must never be reported as complete. Timeline
frames remain atomic and are not shown one bucket at a time.

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
