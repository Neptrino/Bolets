# Overnight runtime review — 13 September 2026

Historical read-only investigation performed on 13 September, after the evening live check. Recommendations below were not implemented or deployed in this review. Times are UTC unless labelled otherwise.

## Priority 1: scheduled backups fail before creating a backup

`bolets-backup.service` failed on every inspected day from September 8–13. Compose rejected missing app environment variables before `compose stop storage`: CACHE_WARM_SECRET, TURNSTILE_SITE_KEY, CONTRIBUTOR_ACCESS_SECRET, TURNSTILE_SECRET_KEY or ABUSE_RATE_LIMIT_SECRET. Which missing variable appears first varies; adding only the latest reported variable would not address the underlying dependency.

`deploy/vps/backup.sh:27–35` loads Umami credentials and image metadata, then parses the full application override without loading the app/status environment used by rollout. Its first Compose operation is line 53. Storage was therefore not stopped by these failed attempts.

The newest directory with a SHA256SUMS manifest found under the configured `/var/backups/bolets` root was `20260824T034019Z`. This is an inventory observation, not checksum or restore verification; independently retained/off-host backups were not inspected. No successful scheduled backup appeared in the inspected journal since September 1.

Recommendation: fix the backup command's dependency on full app configuration (or load the same validated environment as rollout), verify configuration without printing secret values, then run a real backup and verify its checksums, off-host copy and restore. This has higher operational priority than marginal PageSpeed gains.

## Priority 2: duplicate condition refreshes exceed the API timeout

Edge logs identify three PostgreSQL statement timeouts:

| Time | Operation |
| --- | --- |
| 00:20:12 | coarse condition refresh |
| 00:21:08 | 1 km condition refresh |
| 02:58:08 | 1 km condition refresh |

The PostgREST authenticator has `statement_timeout=8s` and `lock_timeout=8s`; the refresh functions have no timeout override. `supabase/functions/_shared/pipeline.ts:98–124` calls the coarse and territorial refresh RPCs synchronously after ingestion, including idle/completed ingestion checks. Production also runs `refresh-spatial-condition-caches` directly through pg_cron each minute (`deploy/vps/configure-cron.sql:94`).

Cron recovered: job 104 ran 00:21:00–00:22:29 and 02:58:00–02:59:29 successfully, roughly 89 seconds each. Current cache inventory has today's date for all 28,727 1 km, 5,128 2.5 km, 1,382 5 km and 379 10 km cells. This was delayed/duplicated background publication work, not evidence of permanently missing current data.

Recommendation: make the direct database job the single owner of publication rebuilding, retain advisory locks and atomic publication, and have ingestion report/schedule pending publication rather than perform the full rebuild through the short API request. Preserve non-VPS deployment behavior explicitly. Do not raise the global API timeout merely to accommodate this maintenance work. Validate actual publication output and retry behavior; inspect a non-mutating query plan before choosing SQL optimizations.

## Priority 2: CPU cancellation during publication warming

At 03:03:13 the runtime emitted one CPU hard-limit event and four cancellation log lines. Four log lines do not establish four distinct failed requests. No forecast/atmosphere ingestion run was active in the nearby 02:55–03:05 ingestion ledger window; the only recorded run was a successful station-temperature check at 02:57.

Warming started 03:02:44, reached 132/432 targets at 03:04:15, resumed to 322/432, and completed 432/432 at 03:09:03. Spatial-read dispatches were frequent throughout the incident. This strongly associates the incident with cold spatial reads while warming; logs do not directly map the isolate ID to a request/function, so exact CPU attribution remains unproven. The app and Caddy containers were replaced at 13:19, and their current Docker logs do not cover the incident; no claim about the exact number of affected public HTTP requests is supported by this review.

The pinned runtime's [per-worker supervisor](https://github.com/supabase/edge-runtime/blob/v1.74.0/crates/base/src/worker/supervisor/strategy_per_worker.rs) retires workers at the soft limit and terminates at the hard limit, including accumulated CPU checks. The router uses 5-second soft and 10-second hard CPU limits. Soft warnings and wall-clock retirement warnings alone do not establish request failure.

Two concrete code candidates warrant controlled profiling:

- `station-temperature-scoring.ts:113–119` recomputes the same target's 481 station interpolations for each model sharing a station window. Reuse these within the cell/window calculation while preserving model-specific correction, donor eligibility, ordering and exact results.
- `station-temperature-cache.ts:65–89` calculates all misses synchronously before persisting any completed patches. A killed large cold request loses all of that progress. Bound cold work and persist completed chunks; coalesce identical pending keys. Keep publication keys and optional-input fallback semantics intact.

`read-spatial-environment/index.ts:870` limits simultaneous work but allows 64 queued requests per isolate. This is a memory/concurrency bound, not a CPU budget. Increasing memory does not address this CPU failure. Profile realistic cold buckets before changing that queue or CPU settings.

## Verification scope

Read-only SSH log/journal inspection, read-only PostgreSQL transactions, current cache inventory and source review. No production settings, schema, runtime code or deployment changed. No new performance claim is made without a benchmark. Earlier evening checks passed both zoom continuity tests and four live map/page checks; they do not prove overnight backend failures have been eliminated.

## Focused follow-up: items 2 and 3

Reviewed the publication and CPU recommendations more closely at 22:39 Europe/Madrid on September 13. Runtime source remains unchanged; the interpolation prototype lives only in local artifacts.

### Publication ownership and transaction boundary

The database retry job is not VPS-only: migration `20260824141111_schedule_condition_cache_publication.sql` installs the same every-minute job. Removing synchronous ingestion refresh calls can therefore rely on a migrated database, provided deployment verifies that the job exists and is active. The affected helper is invoked in five places across atmosphere and soil ingestion, including already-completed cursor paths. `conditionsRefreshed` must not become a false claim of completed publication; preserve completion reporting through the actual publication cursors.

The current job also has an additional coupling problem. Production has pg_cron 1.6.4 with `cron.use_background_workers=off`. Both refresh SELECTs are submitted as one command using [PQsendQuery in that version](https://github.com/citusdata/pg_cron/blob/v1.6.4/src/pg_cron.c#L1552). PostgreSQL processes the multiple statements in a [single implicit transaction](https://www.postgresql.org/docs/current/libpq-exec.html). The separate advisory lock keys do not create separate commits. A territorial failure would therefore roll back an otherwise completed coarse rebuild, and successful coarse output remains unpublished until both finish. This describes a code risk; the inspected overnight cron runs succeeded.

Recommended implementation: remove the heavy ingestion RPC calls and use two independently committed publication jobs, retaining each function's completion gates, generation checks and advisory lock. Update both a new migration and the VPS configure/enable/restore checks so rollout cannot reinstate the combined job. Review database load when scheduling the two jobs; separate commits need not mean unrestricted parallel heavy work. Keep each resolution group's publication atomic. Verify incomplete input, first publication, same-day republication, idempotency, a failed territorial refresh with successful coarse publication, and disabled/missing scheduler detection. Existing tests mainly assert source strings and do not establish those transactional properties.

### Measured temperature interpolation prototype

A local prototype memoizes the 481 station interpolation results by station-window ID inside each cell's scoring call. Every model still passes its own window/version checks and receives its own elevation correction and thermal arithmetic. No data freshness rule, persistent key, water input or ecological parameter changes.

Five alternating Node 24 CPU trials, 100 synthetic cells and 160 synthetic stations per trial:

| Contributing model points | Original median CPU | Prototype median CPU | Reduction |
| --- | --- | --- | --- |
| 1 | 157.2 ms | 151.8 ms | 3.5% (small difference; do not infer a meaningful gain) |
| 4 | 510.6 ms | 177.9 ms | 65.2% |
| 16 | 2,084.1 ms | 329.0 ms | 84.2% |

Production cell metadata makes the four/sixteen-point cases relevant: 5 km cells average 3.7 contributing model points (maximum 4), and 10 km cells average 13.5 (maximum 16). The synthetic stations/model series do not reproduce production CPU or prove incident attribution. The benchmark excludes database loading, hashing, serialization, cache writes and worker scheduling. [All measurements](overnight-runtime-benchmark-2026-09-13.json).

All 240 exact-output comparisons passed, covering 1/4/16 model points, one/two station windows, trailing station delays of 0/1/12/13 hours, corrected inputs, invalid dates, control mismatches, missing models and unsupported coordinates. The prototype also passed all 12 existing station-temperature-scoring tests. Full deployment/type checks were not run because this is a review prototype, not a runtime patch.

Implement this scoped reuse before changing global CPU limits. Next, profile representative full cold buckets on the pinned Edge Runtime. Incremental cache writes can preserve completed work after cancellation, but yielding or saving a chunk does not reset per-isolate accumulated CPU. Bound each invocation's cold work if the profile still approaches the hard budget. Any pending-key coalescing must share only the thermal patch, never another request's full values (water and other nonthermal fields may differ). Failed/incomplete optional evidence must remain retryable; never persist an unavailable baseline as a final patch.

## Implementation and local verification

Following the review, implemented the two selected fixes on September 13:

- Removed synchronous condition refresh RPCs from both ingestion functions. The compatibility field `conditionsRefreshed` is false because these requests no longer perform publication.
- Added a new migration replacing the combined job with separate coarse/even-minute and territorial/odd-minute jobs. Territorial publication also acquires the coarse work lock, so slow runs cannot overlap. Existing generation gates and individual group transactions remain intact; paused restore state is preserved.
- Updated VPS configuration and activation lists, added a rollout gate before function synchronization, and retained the historical restore-baseline contract unchanged.
- Applied per-cell station-window interpolation reuse, with tests for different model corrections, different frozen windows and changed cell altitude. No global memory/CPU limit, persistent temperature-cache key or scoring definition changed.

Local checks passed: 1,579 unit tests (12 skipped), lint/source-size checks, TypeScript, Deno checks of both ingestion entry points and the spatial reader, and a full production build. The new disposable PostgreSQL test verifies paused and active migration, disabled/wrong scheduler rejection, incomplete ingestion, independent territorial failure, idempotent retries, same-day republication, cross-session locking and RPC privileges. CI now runs that SQL test as well. The rollout fixture verifies that failed scheduler validation prevents function synchronization and activation. Incremental cache writes and CPU-budget changes remain deferred pending full cold-request measurements.

The backup finding was outside this implementation's selected scope. This section records local verification; deployment status must be checked separately.
