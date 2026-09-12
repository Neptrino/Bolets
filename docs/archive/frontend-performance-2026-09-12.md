# Frontend performance — 12 September 2026

Historical audit and local verification receipt. These changes were not pushed
or deployed when measured. Start with [current frontend guidance](../frontend-performance.md).
The companion [evidence file](frontend-performance-2026-09-12.json) retains the
local resource measurements and viewport checks.

## Production baseline

Google PageSpeed Insights was run through its web interface after the anonymous
API returned a quota error. The correct public map route is `/map`.

| Page | Mobile score | Mobile LCP | Mobile TBT | Desktop score | Desktop TBT |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Homepage](https://pagespeed.web.dev/analysis/https-bolets-app/zlewbcuntp?form_factor=mobile) | 73 | 5.3 s | 10 ms | 67 | 1,320 ms |
| [Map](https://pagespeed.web.dev/analysis/https-bolets-app-map/ysm1wfl2z8?form_factor=mobile) | 58 | 3.6 s | 2,690 ms | 67 | 2,250 ms |

The homepage audit identified blocking CSS, automatically prefetched map code,
image payloads and recorder work. The map audit showed substantial JavaScript
work; bucket arrivals repeatedly merged cells, painted and updated React state.
The homepage's historical mobile CrUX INP was 879 ms over the trailing 28 days.
That field window cannot isolate the latest deployment or these local changes.

## Changes verified locally

- Move game, method, comparison, infographic, mushroom-parts and culinary styles
  to their owning routes/components. Keep shared styles and MapLibre controls global.
- Prefetch primary navigation and homepage acquisition destinations after hover,
  focus or touch through `IntentLink`.
- Load the optional heatmap recorder at idle; retain the existing privacy guard
  and normal public-page analytics timing.
- Use `preload="none"` and the existing 640 px optimized poster for the video.
  Both hydrated playback and native playback with JavaScript disabled work.
- Initialize finding authentication only for a nonempty online outbox; import
  resumable-upload code for actual photos. Verify login and resumed uploads.
- Coalesce intermediate prediction paint/state updates within 100 ms, cancel
  obsolete callbacks and always draw final arrivals. Preserve atomic timeline
  frames, request identity, coverage semantics and viewport restoration.

The homepage hero already emits one responsive preload with high fetch priority.
The measured browser downloaded one hero variant per device (960 px mobile and
1,920 px desktop). No duplicate preload or lower-page image preload was added.

## Local comparison

Baseline UI was main `5b1fce37381b3e23bfb128055baa21e5bba391a9` plus the separately
verified forecast CPU patch. Both builds used the same local production server,
fresh headless Chromium contexts, disabled browser cache/service workers, 150 ms
network latency, 200,000 bytes/s download, 93,750 bytes/s upload and 4× CPU
throttling. Mobile was 412 × 823 at DPR 1.75; desktop was 1,350 × 940 at DPR 1.
Resources were collected through eight seconds after the load event.

| Device | JS encoded bytes before → after | CSS encoded bytes before → after | LCP before → after | CLS |
| --- | ---: | ---: | ---: | ---: |
| Mobile | 242,760 → 156,057 (−35.7%) | 102,403 → 71,412 (−30.3%) | 2,344 → 1,988 ms | 0 → 0 |
| Desktop | 604,614 → 156,057 (−74.2%) | 103,516 → 71,412 (−31.0%) | 3,184 → 3,008 ms | 0 → 0 |

These are one paired local run per device, not Lighthouse scores or a production
speed guarantee. Long-task excess totals over the collection window were mobile
37 → 62 ms and desktop 13 → 20 ms: this run does not demonstrate a CPU/interaction
timing improvement. Its strongest result is the smaller initial asset load.
That observer total is not Lighthouse's exact TBT measurement window.

## Verification

- Production build: 258 pages generated; TypeScript, lint/source-size checks and
  `git diff --check` pass.
- Unit suite: 1,530 tests pass, 12 skipped.
- Seven browser scenarios pass: deferred homepage requests/keyboard navigation,
  intermediate and final prediction pixels, native/no-JavaScript video playback,
  hydrated video playback, timeline buffering, geolocation/viewport preservation
  across species, and preservation of a browsed territorial window.
- All six stylesheet owners return 200 on desktop/mobile, show their expected
  layouts without horizontal page overflow, and emit no page errors. Comparison,
  game and anatomy styles also work after client-side navigation. Homepage and
  representative feature screenshots were inspected.

The existing geolocation test initially allowed the service worker to bypass
Playwright's mocked prediction responses, producing real local 503 responses.
Blocking service workers in that fixture fixed the test boundary. The new
progressive test initially targeted status text not shown by the full-page map;
it now verifies actual intermediate and final canvas pixels while controlling
bucket completion. Neither issue required changing production map behavior.

After deployment, rerun PageSpeed on `/` and `/map`, then compare Umami route
timings and real interaction metrics over a comparable traffic window. Production
map TBT and field INP improvements remain unverified at this receipt's date.
