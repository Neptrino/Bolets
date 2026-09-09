# XEMA temperature network expansion — 9 September 2026

Dated evaluation receipt for `xema-arome-blend-v3`. Active instructions: [observed temperature validation](../station-temperature-validation.md). This expands the former eight-station pilot to the full temperature network; it does not change interpolation weights, altitude limits, the 50/50 blend, thermal thresholds, ecological priors, rain or the unified water model. Deployment verification follows separately.

## Decision and limitations

Promote the wider donor pool on the strength of broader observation coverage, lower held-out station temperature error and improved comparable weather-grid boundaries. Findings discrimination changes slightly downward; winter frost classification also worsens slightly versus the pilot. These are accepted tradeoffs, not evidence that every cell or ecological prediction improves. The user's stated priority is to use the available observed network and reduce artificial boundaries when findings performance is similar.

All usable temperature stations are imported. Only contemporaneous donors within 50 km and 600 m elevation difference contribute to an individual cell; at least two are required. Published provisional observations remain labelled. The existing trailing-delay rule allows at most 12 model-only hours, with original model extreme counts for that tail. Older gaps and inadequate support retain the baseline. Rain already uses the full XEMA gauge network independently.

## Station comparison

Metadata included 245 records; 184 stations reported usable temperatures during 20 August–8 September. The main test matched 170 stations and 81,411 hourly intervals to existing production model points. Fourteen reporting stations lacked a stored canonical model control and were not evaluated. Every target station was omitted entirely from both interpolation pools. All methods use identical matched hours, retaining raw model values for unsupported interpolation hours. Means below weight stations equally.

| Metric, 20 Aug–8 Sep 2026 UTC | Raw model | Eight-station pilot | Full network |
| --- | ---: | ---: | ---: |
| Mean station MAE, °C | 1.348 | 1.343 | 1.087 |
| Heat threshold classification errors | 5,603 | 5,466 | 3,771 |
| Station-supported hours | — | 11,998 | 80,006 |

MAE improved in each elevation band: below 600 m, 1.230 → 0.989°C; 600–1,200 m, 1.542 → 1.384°C; above 1,200 m, 1.715 → 1.198°C. These are same-hour peer-observation estimates, not forecasts or a test withholding future observations. Model interval means approximate temperature exposure; they are not measured duration above/below thresholds.

Supplemental checks reuse the original eight target stations and frozen station-coordinate AROME requests, with the full network as potential donors. No new model requests or weight fitting were performed.

| Held-out period, UTC | Matched hours | Pilot MAE | Network MAE | Pilot → network extreme errors |
| --- | ---: | ---: | ---: | --- |
| 20–29 Jan 2026 | 1,920 | 1.106°C | 1.064°C | Frost: 237 → 246 (raw model: 252) |
| 30 Jul–8 Aug 2026 | 1,903 | 1.577°C | 1.523°C | Heat: 58 → 44 (raw model: 62) |

The regional winter evidence is limited to eight held-out targets, and some individual stations/elevation bands worsen. Broader winter monitoring remains useful.

## Fixed boundary replay

Same 4,816 cells and ten predefined windows as the [previous boundary audit](station-temperature-boundaries-2026-09-09.md). Station-supported cells increase from 3,958 (82.2%) to 4,795 (99.6%). Twenty-one retain baseline scores. This percentage describes the sampled windows, not all Catalonia.

| Comparable neighbours crossing weather assignments (137 sides) | Pilot | Network |
| --- | ---: | ---: |
| Mean absolute opportunity-score gap | 2.153 | 1.737 |
| 95th percentile gap | 10 | 7 |
| Maximum gap | 14 | 13 |
| Gaps ≥10 | 8 | 2 |
| Gaps ≥20 | 0 | 0 |

The frozen screenshot pair stays 57 / 59. Across all 1,417 comparable sides, mean gap is 1.133 → 1.131; no gaps reach 20. With a simulated 12-hour station tail, coverage is unchanged and the cross-weather mean gap is 2.051 (maximum 13; no gaps ≥20).

This does not smooth all neighbouring cells. Across all 8,892 sides, including differing habitats/altitudes, mean gap rises slightly from 3.854 to 3.886 and gaps ≥20 increase from 438 to 439. The absence of new severe gaps applies only to the predefined comparable subset; large ecologically different neighbours remain possible.

## Findings replay

783 frozen species/date records, including supplemental dates, were replayed offline through the production scorer. Network support covers 649 records versus 596 with the pilot; 115 retain baseline for incomplete station support, 13 have unavailable baselines and six lack complete model controls. Water and all nonthermal components are protected. The standard `weather:evaluate-findings --metrics` completed.

Primary reporting collapses species alternatives to one maximum per report/date/kind: 32 positive reports, 96 background dates and four unsuccessful searches. The fresh pilot uses the exact same newly collected observations as the network, isolating the pool change; its metrics equal the earlier frozen pilot replay.

| Report-collapsed metric | Pilot | Network |
| --- | ---: | ---: |
| Conditions AUC against seasonal background | 0.74821 | 0.74723 |
| Opportunity AUC against seasonal background | 0.70475 | 0.70231 |
| Mean positive conditions score | 63.844 | 63.719 |
| Mean positive opportunity score | 49.281 | 49.125 |
| Positive reports with opportunity ≥60 | 12 | 13 |

Paired bootstrap: 10,000 resamples, seed 20260909, grouping by the 21 canonical cells containing positive reports. Conditions AUC delta 95% percentile interval: −0.00398 to +0.00167; opportunity: −0.00789 to +0.00222. This conservative canonical-cell grouping differs from earlier receipts' original-site grouping. Intervals spanning zero do not establish equivalence. This is reused exploratory evidence, not independent validation; seasonal background dates are not verified absences. The four unsuccessful searches are too few to establish specificity.

## Reproduction and provenance

The [aggregate evidence companion](station-temperature-network-2026-09-09.json) retains input hashes, station metrics and boundary summaries without fine cell geometry or private finding records. Public raw day envelopes and normalized hours are frozen locally in `artifacts/station-network/`; private findings manifests and replay records remain outside the repository. Collection used the shared `xemaNetworkTemperatureDayUrl`/`fetchXemaNetworkTemperatureDay` queries and `aggregateXemaTemperatureHours(..., "published")`. Raw pages are cached by SHA-256 of their URL and normalized day files are hashed in the private replay manifest. Metadata were normalized through the existing XEMA adapter. Later validation changes must not silently replace these inputs.

```sh
npm run weather:compare-temperature-network -- \
  --stations=artifacts/station-network/stations.json \
  --model-controls=artifacts/station-network/model-controls.json \
  --hours-dir=artifacts/station-network --start=2026-08-20 --end=2026-09-08 \
  --out=artifacts/station-network/station-evaluation.json

npm run weather:compare-temperature-boundaries -- \
  --input=artifacts/station-boundary-check-20260909-coverage/weather.json \
  --station-report=artifacts/station-network/station-report.json \
  --station-cache=artifacts/station-network/cache --blend-mode=tapered \
  --station-lag-hours=0 --out=artifacts/station-network/boundaries.json
```

For supplemental station checks, use the frozen pilot archive envelope as `--model-controls`: January URL-cache key `49a33b59a2b791187c94cbc5fee53ba860a67c575626d433d9763814c9bb6f5e`, July key `32b6b45b048e389b46dedf8a1facf2a92ab7f16e21789009c9908e7be148b938`, under `artifacts/station-temperature/cache/`, with the dates above. The offline evaluator verifies each archived location against its target station. Findings use `weather:compare-finding-temperature --blend-mode=tapered --station-lag-hours=0 --quality=published` with an external manifest containing `normalizedDays` and exact day-file hashes, then the standard metrics command. Detailed locations are never sent to XEMA.

## Publication contract

Full-network raw days carry `station_pool_version=xema-all-temperature-v1`; old pilot days cannot seed v3 windows. Compact immutable windows preserve every temperature value, quality flag and missing interval. V1/v2 windows remain readable. A controlled backfill upgrades only snapshots whose original provider controls can still be reproduced, then schedules existing condition-cache republication. The private thermal cache and public score-cache identities include the new version. Unsupported cells keep their prior score; no raw station series or private references become public.

Local verification: 1,462 tests passed (11 environment-gated tests skipped); network findings and boundary replays ran separately. TypeScript, ESLint/source-size, production build and Deno checks passed. The migration was rehearsed transactionally with the predecessor table definition; legacy rows stay unlabelled, RLS remains enabled, anonymous reads denied and service-role writes preserved.
