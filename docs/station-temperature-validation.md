# Observed temperature validation

Production definition: `xema-arome-blend-v2`, adding a bounded 12-hour publication-delay fallback to `xema-arome-blend-v1`. The original blend was promoted from the tapered 50/50 candidate after the station, findings and boundary checks below. The user accepted the observed reduction of large artificial boundaries despite slightly lower findings discrimination. This is a temperature-source change; the ecology priors and unified water model are unchanged.

The implementation uses the same shared interpolation and blend functions as the diagnostic. Production parity checks reproduce all 4,816 boundary-cell scores and all supported frozen findings comparisons. The selected pair changes from 23 / 60 to 57 / 59. Smaller gaps can increase; uncertainty spanning zero is not proof of equivalence.

The [12-hour delay evaluation](archive/station-temperature-lag-2026-09-09.md) records the v2 boundary, findings and held-out station sensitivities.

### Ingestion, publication and fallback

`import-xema-temperature` imports XEMA variable 32 every three hours for the eight evaluated station codes (CG, DG, DP, MS, W9, YA, ZC, ZD). It accepts V and published provisional T/blank states, excludes invalid/conflicting/incomplete hours, replaces whole UTC days so withdrawn readings cannot linger, and retains raw flags for 35 days. First import bootstraps 32 days; ordinary imports revisit three days.

Atmospheric ingestion freezes one shared station window per source version and valid hour, and stores exact 480-hour AROME controls in deduplicated private tables. Content-addressed references travel with the existing atmosphere snapshots and condition-cache generations. A late station update cannot change a frozen publication. No station provider is contacted during map reads, and no raw model hours or private references are returned publicly.

Current-map reads lazily cache successful thermal adjustments in the private `cell_temperature_cache`. The key includes the algorithm version, immutable model/station source references and weights, cell centre/elevation, and every original thermal control consulted by the scorer. Cache hits apply only the six corrected thermal fields and their provenance to the fresh environment; they never replace water, habitat or freshness. Different species and overlapping buckets share these patches. Deterministic baseline decisions from complete immutable inputs use an empty patch. Missing or failed optional inputs are not cached, stale cells bypass the cache, and cache failures retain normal calculation. Entries are pruned after seven days; changed inputs select a new key immediately. Full single-species scored responses still refresh every five minutes to check environmental freshness, but those rechecks reuse cached thermal adjustments. History and timeline continue using the same pure scorer and their existing response caches.

The environment reader applies the supported blend at the selected cell centre and altitude before scoring current, history and timeline snapshots. Coarse readers require every represented atmospheric source, preserve existing mean/max aggregation and use the same source weights. The explicit thermal reference elevation prevents a second lapse correction while preserving the provider's original elevation. Forecast anomalies inherit the corrected observed starting point; future hours remain modeled. The 24-hour displayed temperatures and the 7-day temperature used by water stay on AROME.

Missing optional tables, controls, source references, model hours or station windows retain the exact original temperature fields. A contiguous missing station tail of at most 12 hours is allowed, with at least 468 of 480 samples supported at the cell by two donors. Those final hours preserve raw provider heat/frost counts; their means receive only the existing model-to-cell elevation alignment. Older station holes, resumed support after a hole, longer delays and geographic undercoverage retain the full baseline. This explicitly replaces v1’s all-station-hours requirement without shortening any window or inferring observations. `temperatureModelOnlyHours` records the maximum tail count across a pooled cell’s sources (not an average); source and quality provenance survive public scoring responses. Fully supported legacy v1 windows remain readable and numerically unchanged. Optional-bin absence never withholds a score. Blended estimates carry limited confidence and provisional-quality provenance. Unsupported territory retains the means-only AROME correction and original provider heat/frost counts.

After deploying the migration and functions, invoke the authenticated temperature import with `days: 32`. Then run `node --experimental-strip-types scripts/publish-station-temperature.mts --apply` with the existing hosted server configuration to attach controlled frozen inputs to today's and the preceding three stored snapshot dates. This performs no weather-provider requests and changes no original numerical values. It protects concurrent atmospheric writes, then asks the established database cron to republish condition caches. Repeat safely after interruption and verify the completed publication markers and live pair. Normal subsequent atmospheric ingestions attach their own references. An authenticated follow-up job, `refresh-station-temperature`, visits at most 100 stored points every three minutes after atmosphere completion, attaches inputs that arrived late and republishes once at the end. It can freeze a window with up to 12 trailing station hours missing; longer delays keep the previous score available until sufficient observations arrive. Later observations never silently revise a frozen publication.

Evidence: [three-period station comparison](archive/xema-temperature-diagnostic-2026-09-09.md), [findings replay](archive/station-temperature-findings-evaluation-2026-09-09.md), and [ten-window boundary check](archive/station-temperature-boundaries-2026-09-09.md). The dated receipts describe the experiments at the time; deployment is a later step.

## Run a comparison

```sh
npm run weather:compare-station-temperature -- \
  --stations=DG,ZC,ZD,DP,CG,YA,MS,W9 \
  --start=2026-08-20 --end=2026-09-08 --split=2026-08-30 \
  --quality=published \
  --out=artifacts/station-temperature/pardines-20260909.json
```

Dates are UTC, with an inclusive completed end day. Select 3–40 public XEMA stations and 10–60 days, retaining at least five calendar days before and after the split. Actual complete and matched hours are reported separately; calendar duration does not imply complete observed coverage.

The default `--quality=validated` accepts only provider flag `V`. Explicit `--quality=published` also accepts `T` and missing/blank flags, and labels the resulting hours provisional. Invalid or unrecognized flags are rejected. Recent published data often await validation; missing validation is never silently promoted to validated evidence.

Responses are frozen in `artifacts/station-temperature/cache/`. Repeat with `--offline` for a reproducible comparison with no provider or ledger calls. Use a new `--cache-dir` to obtain a fresh observation snapshot; do not silently mix a later validation state into an existing comparison. The report retains input hashes and fetch timestamps. These inputs contain public station data, never private finding locations.

Uncached AROME requests require the hosted pipeline owner's server credentials, which the command can load from `.env.local`. When the local app uses `BOLETS_DEV_SPATIAL_DATA_URL` and `BOLETS_DEV_SPATIAL_SERVICE_ROLE_KEY`, accounting uses that same hosted owner. Otherwise it uses hosted `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. An incomplete credential pair or a loopback-only ledger fails closed; a development database is not the shared provider ledger. The command records estimated Open-Meteo usage, including inclusive archive dates and the 5% margin, before fetching. It makes one bounded multi-location archive request, stops on provider errors without retrying or changing egress, and never changes weather snapshots or score caches. XEMA daily requests run with concurrency four and reject potentially truncated responses.

## Measurement contract

- **Observation:** XEMA variable 32, temperature in Celsius. SH half-hourly means require both distinct half hours; HO means require one complete hour. Duplicate conflicts, SH/HO overlap, missing values, invalid timestamps and unsupported intervals cannot produce a complete hour.
- **Timing:** `data_lectura` labels the start of a UTC measurement interval. Compare its complete hourly mean with the trapezoidal approximation `(AROME at start + AROME at end) / 2`. The following day's first endpoint is needed for the last interval. Neither source is shifted to local time.
- **Model:** archived `arome_france` `temperature_2m` from Open-Meteo, requested at station coordinates with the provider's default DEM downscaling. Retain returned grid coordinates and elevation and check their alignment. No additional hourly lapse correction is applied.
- **Extremes:** count hourly-mean proxies at or above 27°C and at or below 0°C. These are useful for comparing sources, but are neither measured minutes of exposure nor the production model's instantaneous hourly counts. Missing intervals are excluded from both sides, never filled or extrapolated to a complete 14/20-day window.
- **Metrics:** paired-hour bias, MAE and RMSE; error in the fixed 08:00–18:00 UTC block and other hours; heat/frost count differences and false-positive/false-negative classifications. The fixed time blocks are not calculated sunrise/sunset periods. Report station-level values so opposing valley/summit errors cannot disappear inside an overall mean.

## Exploratory corrections

Both residual candidates exclude the target station. Donors must be within 50 km and 600 m of elevation, with at least two eligible stations. Fixed Gaussian distance/elevation scales are 25 km and 400 m, and the additive correction is capped at ±3°C. These are explicitly experimental settings, not selected production ecology parameters. Insufficient support retains the uncorrected model, with coverage reported.

1. **Earlier diurnal bias:** learn each donor's mean observation-minus-model difference for each UTC hour using only dates before `--split`, with at least five complete observations for that hour. Test on later dates at the omitted target station. Its observations never train its own correction.
2. **Same-hour observation anchoring:** use other stations' observation-minus-model differences at the exact test hour. This tests retrospective observation anchoring with fixed spatial weights. Peer observations from the test date are legitimate inputs to this method; it is not a forecast or a test withholding all future observations. Missing contemporaneous support never uses stale hours.

The command also reports **direct observation interpolation** with the same donor eligibility and weights, both with a fixed −6.5°C/km elevation adjustment and with no lapse adjustment. It interpolates station observations themselves, rather than observation-minus-model residuals. Each target station is entirely excluded. Same-hour peer observations are inputs; there is no date fitting or forecasting claim. Compare AROME and interpolation on exactly the same supported target hours, and report unsupported coverage separately. The report also retains model-fallback metrics so unsupported stations cannot disappear silently. The diagnostic wrappers remain in `scripts/lib/station-temperature-interpolation.ts`; interpolation now shares `supabase/functions/_shared/station-temperature-field.ts` with production.

The **equal station/model blend** (`xema-arome-equal-blend-shadow-v1`) averages model and interpolated station temperatures after each is aligned to the target elevation. Its fixed station weight is 0.5, not a fitted optimum. Adjust only the remaining model DEM-to-target difference at 6.5°C/km, capped at ±6°C, and include a model-altitude-only control. Count threshold events after blending temperatures. In station diagnostics, unsupported hours retain raw AROME only in the separately reported fallback metrics; supported comparisons share identical hours. The original experiment stays reproducible through `scripts/lib/station-temperature-blend.ts`; production promotes only its tapered revision, without retuning ecology priors.

The split is fixed before each run. No fitting or parameter search selects a winner on the reported evaluation dates. Trying an additional candidate after inspecting another candidate remains exploratory and does not establish an independent final test set.

## Production gate and remaining work

Station validation precedes the private `weather:evaluate-findings` replay. Preserve complete thermal windows, source provenance and the unified water calculation. Evaluate findings discrimination and spatial consistency as separate quality criteria, disclose regressions and uncertainty, and record the rationale for any accepted tradeoff. The user values reducing large artificial boundaries even when findings performance is similar; similar averages or uncertainty spanning zero do not establish statistical equivalence. Findings previously used to select parameters are not an independent validation set.

The station experiment itself does not score map cells. The separate [9 September cell sensitivity replay](archive/cell-temperature-impact-2026-09-09.md) identified the screenshot pair and reproduced its full thermal controls. Representative-point residual corrections reduce the 37-point score gap to 31 points. Direct station interpolation at actual cell elevation reduces it to two points (56 / 58), but worsens held-out station MAE in both warm periods. This demonstrates the local impact of replacing coarse thermal assignment, without establishing a production-ready regional temperature field. Improving spatial continuity and improving temperature accuracy are separate checks.

## Replay the effect on frozen cells

```sh
npm run weather:compare-cell-temperature -- \
  --input=artifacts/cell-temperature-impact/weather.json \
  --station-report=artifacts/station-temperature/pardines-20260909.json \
  --station-cache=artifacts/station-temperature/cache \
  --training-start=2026-08-10 --training-end=2026-08-20 \
  --out=artifacts/cell-temperature-impact/report.json
```

The input freezes authenticated cell environments, their weather-point links/metadata, and the corresponding private 720-hour provider states. Keep these detailed inputs in local artifacts. All replay reads are local. The earlier diurnal fit must end before the first scored exposure hour; this example adds the previous ten days of station data instead of training on the scored twenty-day window. Current-hour anchoring includes published provisional observations and remains retrospective.

The report includes residual corrections evaluated both at each representative point and at the actual cell centre/elevation. Interpolate station-derived biases at the two surrounding interval midpoints to the model's instantaneous sample. Require both interval estimates, otherwise retain that baseline hour. These residual variants do not shift every source hour to the fine cell's elevation. Replace only 14/20-day means and heat/frost counts, retaining the existing means-only elevation correction exactly once and leaving water inputs unchanged.

Two further scenarios estimate temperatures directly from station observations at the cell centre: fixed 6.5°C/km adjustment and zero-lapse ablation. Both use the same spatial eligibility/weights. Require two contemporaneous donors at both surrounding interval centres for every one of the 480 samples; otherwise withhold that comparison and keep the baseline. Never mix unsupported source-altitude hours into a cell-altitude estimated series. Set the comparison's thermal reference elevation to the actual cell elevation so its means are not corrected twice. The diagnostic uses internal metadata; production has a separate thermal-reference field. Neither is a claim of finer observed weather. Interpolating interval means to instantaneous samples is an approximation and may affect extreme counts.

The cell report also includes a model-only hourly elevation control and the equal blend at cell elevation. Both use the exact stored representative series, the fixed experimental lapse/cap and the same 480-hour window. The blend requires complete station support; it never silently fills unsupported hours with a differently elevated source. Keep its complete-source controls and protected nonthermal components. A gain at station-coordinate model requests does not establish the validity of larger elevation shifts from production representative points, so the paired cell check and subsequent private findings replay remain separate requirements.

For the broader side-by-side audit, run `weather:compare-temperature-boundaries` with the frozen sampling design, station report/cache and output path documented in the [receipt](archive/station-temperature-boundaries-2026-09-09.md#reproduction-and-status). It counts each orthogonal 250 m side once, reports both all neighbours and the predefined comparable subset, separates weather-assignment boundaries from within-grid and coverage boundaries, and preserves unsupported baseline scores. `--missing-hour-station=<code>` removes one station hour as an explicitly labelled operational sensitivity.

The optional `--blend-mode=tapered` selects `xema-arome-equal-blend-tapered-shadow-v2`: smoothstep fading within the last 10 km and 100 m of the original support limits, with unchanged interior Gaussian weights and 50/50 temperature averaging. It does not extend eligibility, remove the two-station minimum or guarantee continuity when coverage becomes insufficient. The station diagnostic reports both revisions automatically; findings and boundary tools default to `original` so earlier receipts remain reproducible.

Before calculating any scenario, the source must match the stored AROME model, grid, elevation and valid hour and reproduce all six thermal aggregates (counts exactly, means within 0.02°C). A mismatch withholds the comparison while keeping the baseline. Reports preserve station support, source-control results, score components and the experimental method version. These are score-sensitivity results, not a new findings-validation result.

## Evaluate the blend against findings

Keep all finding inputs and derived replay files outside the repository. Export a frozen baseline, fetch the public station history needed by its windows, replay the blend offline and calculate standard metrics:

```sh
npm run weather:evaluate-findings -- --replay --model=v2 --station-rain --offline \
  --input=/private/evaluation/findings --cache-dir=/private/evaluation/weather-cache \
  --artifacts-dir=/private/evaluation/baseline --export-thermal-inputs

npm run weather:fetch-finding-temperature -- \
  --inputs-dir=/private/evaluation/baseline/thermal-inputs \
  --out=/private/evaluation/station-inputs.json

npm run weather:compare-finding-temperature -- \
  --inputs-dir=/private/evaluation/baseline/thermal-inputs \
  --manifest=/private/evaluation/station-inputs.json \
  --out=/private/evaluation/candidate --quality=published

npm run weather:evaluate-findings -- --metrics \
  --artifacts-dir=/private/evaluation/candidate --out=/private/evaluation/candidate-metrics.json
```

Replace the example external paths with the private workspace. The baseline's `--offline` blocks uncached reads; it must already have the required weather and cell caches. Detailed thermal inputs live in a nested directory outside the metric tool's top-level JSONL scan. Model temperature files are content-hashed and deduplicated, with canonical source assignments stored separately from the scoring snapshot.

The station collector defaults to the same eight donors as the preceding experiment, preserves raw quality flags, requests only station codes/UTC days with concurrency four, and stops on errors without switching providers. `--plan-only` reports the required range using cached metadata; `--offline` requires all public station cache entries. A manifest freezes payload hashes and collection times. No private finding coordinates are transmitted. Changing `--stations` changes the source pool and must be reported as an expanded experiment.

The candidate replay blocks all network requests. It verifies the original score, source assignment, valid hour and complete thermal control before applying a fully supported blend. A missing baseline or control, or incomplete station window, retains the original record and reports the reason. It never fills a partial window or makes a previously unavailable score available. Repeat into a separate output directory with `--quality=validated` for a strict-quality sensitivity; lower coverage must not be mistaken for an equally comprehensive comparison.

Use `--blend-mode=tapered` and a distinct output directory to evaluate the repaired donor transition. Keep the same frozen manifest and source controls. Always run the standard findings metrics for the selected revision; the original blend's results do not automatically validate changed station weights.

Run standard metrics on baseline and candidate, and report the same report-collapsed comparison used in the [dated receipt](archive/station-temperature-findings-evaluation-2026-09-09.md), alongside species-expanded results, same-location comparisons, unsuccessful searches, coverage and paired uncertainty. Supplemental ±3-day samples are not independent positive findings.

## Sources and implementation

Observations: Generalitat de Catalunya / Servei Meteorològic de Catalunya, [XEMA measurements](https://analisi.transparenciacatalunya.cat/d/nzvn-apee), [variable metadata](https://analisi.transparenciacatalunya.cat/d/4fb2-n3yi), [station metadata](https://analisi.transparenciacatalunya.cat/d/yqwd-vj5e), and [reuse terms](https://administraciodigital.gencat.cat/ca/dades/dades-obertes/informacio-practica/llicencies/). Model data: Open-Meteo / Météo-France, [historical forecast documentation](https://open-meteo.com/en/docs/historical-forecast-api).

The adapter is `supabase/functions/_shared/xema-temperature.ts`; the isolated evaluation is `scripts/lib/station-temperature-evaluation.ts`; the entry point is `scripts/compare-station-temperature.mts`. Focused tests cover quality flags, complete hours, duplicates, UTC alignment, missing model samples, units/location mismatches, held-out station/date isolation, donor fallback, and inclusive provider accounting. The initial diagnostic added no ingestion; production ingestion and immutable-input storage are documented above.
