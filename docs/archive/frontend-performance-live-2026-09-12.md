# Frontend performance: live verification — 12 September 2026

Post-deployment receipt for `833e1f17ffe5f80343e858539717f620d3d4bd07`.
The [production workflow](https://github.com/Neptrino/Bolets/actions/runs/34716296786)
passed verification, image build/smoke tests and VPS deployment. The active
release symlink and running image label both match this revision. Forecast
module SHA-256 matches the tested source:
`2e14e34943e889cc8ceecabc9f833efd4e434f9163e877204b91f38cb0ef2e8a`.

This local receipt was generated after the implementation commit was deployed.
See the [pre-deployment audit](frontend-performance-2026-09-12.md) and
[live PageSpeed evidence](frontend-performance-live-2026-09-12.json).

## PageSpeed results

| Page/device | Before score | After score | Before LCP | After LCP | Before TBT | After TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Homepage mobile | 73 | 86 | 5.3 s | 3.8 s | 10 ms | 0 ms |
| Homepage desktop | 67 | 100 | 0.7 s | 0.6 s | 1,320 ms | 0 ms |
| Map mobile | 58 | 60 / 60 | 3.6 s | 2.9 / 6.2 s | 2,690 ms | 3,420 / 270 ms |
| Map desktop | 67 | 67 / 66 | 0.6 s | 0.6 / 0.7 s | 2,250 ms | 1,600 / 2,340 ms |

Reports: [homepage](https://pagespeed.web.dev/analysis/https-bolets-app/fsdap9c269?form_factor=mobile),
[map first run](https://pagespeed.web.dev/analysis/https-bolets-app-map/wir3cvijpl?form_factor=mobile),
[map repeat](https://pagespeed.web.dev/analysis/https-bolets-app-map/owl931jxyy?form_factor=mobile).
All used Lighthouse 13.4.1. The homepage improvement is clear in this paired
comparison; the map has substantial timing variance and no convincing overall
score improvement. Do not cherry-pick the lower map TBT from the repeat: its
LCP regressed in the same run. Real-user CrUX remains a trailing 28-day window.

## Live browser and server checks

At 20:16 UTC, an ordinary browser session with the service worker enabled
verified homepage playback, a single responsive hero preload, no video download
before play, species navigation and tomorrow's timeline. All 108 prediction
responses were HTTP 200. The six stylesheet-owner routes returned 200; there
were no page exceptions or HTTP failures in this session.

Additional mobile sessions with DNT enabled and disabled completed the map.
Both observed a script request for `/map` returning HTML. PageSpeed reports
this as a worker/module MIME error. Inspecting the original pre-release map
report confirmed the identical warning already existed. MapLibre 6.3's default
worker URL resolution under bundling is a follow-up investigation target; do
not claim it fixed or definitively causal for every long task from this receipt.
MapLibre and map/React work still dominate the map's long tasks.

Both application and Edge containers were healthy, without restarts or OOM
events. No hard CPU-limit or memory-limit messages were found after activation
through this check. Spatial-reader soft CPU-limit messages still occurred
during warming/testing. The forecast normalization change requires the next
ordinary daily ingestion to establish whether the previous forecast CPU
cancellations recur; successful page checks alone cannot establish that.
