# Forecast CPU cancellations — 12 September 2026

> Historical investigation and local verification receipt. The optimization was
> not deployed during this investigation. Measurements describe the stated
> windows and synthetic workload, not current production guarantees.

[Aggregate evidence and benchmark source](forecast-cpu-investigation-2026-09-12.json)
follow the [memory and cache investigation](spatial-memory-fix-2026-09-11.md).

## Findings

Production revision `5b1fce3` had two Edge CPU hard-limit events at 00:12:30 and
00:17:32 UTC. Both align with newly started `spatial-soil` ingestion records
that never completed. In each chain, three preceding 50-location passes
completed in roughly 4–5 wall-clock seconds each, separated by a 25-second wait.
The fourth pass was cancelled. Four request/worker cancellation log lines
represent two events, not four independent failures. This is strong temporal
attribution to the soil/forecast chain; the runtime log does not directly attach
its isolate ID to an ingestion-run ID.

The deployed router permits 5 seconds soft / 10 seconds hard CPU and a
150-second wall timeout. The pinned runtime's
[per-worker supervisor](https://github.com/supabase/edge-runtime/blob/v1.74.0/crates/base/src/worker/supervisor/strategy_per_worker.rs)
checks accumulated CPU, retires workers at the soft threshold and terminates at
the hard threshold. A longer wall timeout or a larger memory allowance does not
raise this CPU budget. Soft warnings alone are not cancelled requests.

Retries completed the forecast issue at 00:21:59 UTC; condition publication
completed at 03:01 UTC. Five failed atmosphere runs and one partial soil run
reported upstream Open-Meteo HTTP 503s, including across all approved forecast
egress lanes. These were not evidence of local CPU or memory exhaustion.

At 19:34 UTC, all 8,935 map-data requests recorded for the Madrid civil day had
returned HTTP 200, with origin p95 144 ms and p99 545 ms. There were no memory
limit errors or container restarts since deployment. The host retained roughly
7 GiB available memory. A sampled uncached timeline request took 1,077 ms,
followed by two 9 ms reads; continued publication-bound warming remains useful.

## Local optimization

`normalizeOpenMeteoForecast` previously indexed the same hourly atmosphere,
history and soil series, and merged them at the same observed/forecast cutover,
separately for all ten output dates. It now builds the merged maps once per
location/issuance and shares them across those dates. Base-hour eligibility,
exact rolling windows, missing/duplicate-hour rejection, arithmetic order,
thermal reference elevation and result fields are preserved. There is no new
persistent cache or cross-publication state.

Seven alternating warmed Node 24 trials on 50 synthetic locations measured
median normalization CPU of **447.4 ms before / 144.5 ms after: 67.7% lower**.
These are local normalization-stage measurements, not total function CPU or a
prediction that production cancellations are eliminated. Deep comparisons
against the original module matched all fields in 14 cases covering numeric/ISO
hour axes, incomplete history, duplicated future hours, shifted/missing base
hours, no history and truncated soil outlooks.

A separate synthetic 180-station, 720-hour rain-correction profile used about
37 ms CPU for 50 locations, materially less than forecast normalization. Its
calculation was left unchanged. No CPU-limit or chained-pass setting was changed;
observe the next ordinary daily ingestion after release before deciding whether
fewer passes per invocation are also necessary.

## Verification and follow-up

The committed regression covers a delayed history cutover, every output horizon
and a revised input location on a subsequent call, alongside existing missing
hour, duplicated hour, water-window and thermal-exposure tests. Verification passed: 1,525 tests (12 skipped), repository lint/source-size
checks, Next.js type generation and TypeScript, Deno checks of the soil entry
point and forecast module, and the production build (258 generated pages).

After the normal tested deployment, check `spatial-soil` run completion and Edge
hard-limit messages through the daily forecast publication. A clean local
benchmark cannot establish production recovery. The two abandoned ingestion
records were not altered by this read-only production investigation.
