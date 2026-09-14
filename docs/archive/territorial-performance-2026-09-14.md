# Territorial cold-response investigation — 14 September 2026

Historical implementation and local-validation receipt. Live rollout and population
p95 must be checked separately; these measurements do not prove a deployed gain.
Current conventions are in [frontend performance](../frontend-performance.md).

The origin territorial route group recorded p95 2,126.9 ms across 470 requests
from Catalonia midnight to approximately 14:00 local. It combines hubs, place
pages and species guides, and measures complete origin response delivery rather
than browser paint. Warm hub/place requests finished in 11–56 ms. Several local
guide first requests finished in 1,450–1,795 ms, followed by 32–44 ms warm requests.
A streamed Osor/camagroc guide delivered initial content around 134 ms, habitat
facts at 504 ms and its current-condition panel at 2,076 ms.

A representative Viladrau/cep summary reads four shared 1 km buckets totalling
4,975,693 characters. The existing per-guide final cache already made repeat
visits quick; the cold condition panel was the main delay. Hub pages also use
Next's full-page cache, so their ranking calculation is not repeated per visit.

Changes:

- Filter cells outside every requested territorial window before candidate
  scoring, retaining inclusive centre boundaries and complete/truncated checks.
- Prime the exact published local-guide condition and habitat caches through
  an authenticated endpoint called by the existing host warming service.
- Reuse resumable/coalesced warming with one local target at a time, the bounded
  spatial background slot and finite habitat-read deadlines.
- Include publication identity in upstream condition fetches as well as final
  summaries. Rotate final condition keys at civil-day and twelve-hour boundaries.
- Share concurrent visitor/warming requests and do not cache incomplete/stale
  summaries or truncated habitat failures. Keep verified empty habitat and zero
  condition readings valid.

The [alternating benchmark](territorial-performance-2026-09-14.json) returned
identical complete summary JSON across old/new implementations. Cached-input
processing was modestly faster after filtering; the main expected user benefit
comes from moving cold reads into optional warming. Do not claim the synthetic
processing timings as a reduction in real p95.

Regression coverage includes exact boundary scores, multiple windows, truncation,
generation propagation, shared cache identity, concurrent visitors, recovery after
failures, civil-day/period expiry, warmer authentication and resumable concurrency.
The earlier simplified-footer change left three obsolete assertions blocking CI;
they now verify access through the retained guide, season and zones directories.
