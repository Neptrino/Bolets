# Spatial memory and publication caching — 11 September 2026

> Historical local verification receipt. Implementation and checks completed;
> production was not modified or deployed during this work.

Follow-up to the [10 September Umami investigation](umami-performance-investigation-2026-09-10.md).
Current operational guidance is in the [VPS runbook](../../deploy/vps/README.md#response-latency-and-cache-maintenance).
[Aggregate evidence and synthetic benchmark source](spatial-memory-fix-2026-09-11.json)
contain no private environmental observations.

## Implemented changes

- The release function synchronizer configures 512 MiB for
  `read-spatial-environment`, retaining 150 MiB for other workers and preserving
  the upstream router. The inspected host had 7,633 MiB available out of 11,671 MiB.
  The patch is idempotent and rejects an unknown upstream memory declaration.
- Node and Edge queues permit two active heavy reads, at most one background
  timeline read, and 64 waiters. Waiting deadlines are eight and four seconds
  respectively. Edge overload returns a retryable, uncached 503. Active work keeps
  its slot until settlement, even after cancellation.
- Timeline requests select each cell's displayed date before loading immutable
  station windows. They reuse the existing persistent cell-temperature cache,
  keyed by every numerical input and frozen source identity, across species and
  forecast offsets. Cells with different publication dates retain their own dates.
- Compressed timeline environments and scored frames use a 24-hour upper bound
  keyed by completed observed and forecast publications. Metadata refreshes every
  five minutes; forecast eligibility is checked on every generation lookup. Same-day
  replacement publications and forecast expiry select different entries. Failed
  publication lookup uses a one-minute fallback. The warmer no longer repeats
  unchanged completed generations hourly. Browser bucket freshness is unchanged.

No scoring parameters, thermal correction mathematics, water inputs, database
schema, access resolution or analytics rules changed.

## Verification

Using Node 24.19.0: `npm test` passed 1,510 tests across 248 files, with 12 tests
in 11 opt-in files skipped. `npm run typecheck`, `npm run lint` (including source
size checks), and `npm run build` passed. Deno 2.9.6 checked the complete spatial
function with `deno check --no-lock`. After fixing one queue lint finding, the 16
queue/Edge integration tests were rerun successfully and the build also passed.

The publication-check interval was subsequently extended from 30 seconds to five
minutes at the user's request. The 24 cache/generation/warmer tests and typecheck
passed after this adjustment. Unavailable timeline metadata still retries after
one minute, and forecast expiry is checked on every read without a database call.

Regression coverage checks numerical parity against the original pure scorer for
all eight timeline offsets; reuse across forecast days; older cell publications;
optional storage failure retaining the original baseline; a 110-job queue burst;
Edge overload and cancellation; >2 MiB raw frame compression; daily cache bounds;
same-day publication replacement; forecast expiry; failed metadata lookup; and
router synchronization/unknown-upstream rejection.

A synthetic allocation check used the real unpacker and station scorer with 184
stations and 481 hours per window, in separate Node processes with explicit GC:

| Selected windows | Expanded hour objects | Additional retained heap |
| --- | ---: | ---: |
| Four (previous common timeline path) | 354,016 | 54.3 MiB |
| One (aligned displayed date) | 88,504 | 13.7 MiB |

That is about 75% less retained station-window allocation in this fixture. It is
not a production peak-heap measurement or an Edge Runtime memory guarantee.
Mixed cell publication dates may still require multiple selected windows;
concurrency bounds and the higher limit provide additional headroom.

Production effectiveness remains to be measured after the normal tested release:
verify the router limit, map/timeline success rates and worker-memory logs under
ordinary traffic. The prior incident was not deliberately reproduced on production.
