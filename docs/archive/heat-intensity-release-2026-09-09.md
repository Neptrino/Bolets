# Heat intensity — 9 September 2026

Status: implemented and locally evaluated for priors `hydrothermal-v2-priors-2026-09c`; production deployment verification is recorded separately. This follows the [exploratory heat/drying comparison](heat-drying-evaluation-2026-09-09.md). Only the 6°C heat-intensity candidate is promoted. Drying remains at 0.5 ET₀; frost, species windows, means, phenology and the XEMA/AROME blend definition are unchanged.

## Decision

Adopt as a modest reduction in large artificial temperature-driven jumps, accepting small increases in average final-score gaps. Findings evidence is exploratory and does not establish statistical superiority. The change does not explain August unsuccessful searches and does not make all adjacent cells equally suitable.

## Fixed boundary replay

Same 4,816 cells, ten predefined windows and 8,892 orthogonal sides as the full-network temperature audit. The original nonthermal comparability thresholds remain fixed. Of these, 1,417 sides are comparable; 137 cross weather-point assignments. Station support remains 4,795 cells, with 21 retaining provider temperatures. Production calculations reproduce the synthetic candidate cell by cell.

| Comparable-neighbour map-score gaps | Current counts | Heat intensity |
| --- | ---: | ---: |
| Mean | 1.131 | 1.153 |
| 95th percentile | 5 | 4 |
| Maximum | 13 | 10 |
| Gaps ≥10 | 11 | 3 |
| New jumps from <10 to ≥20 | — | 0 |

Across comparable weather-assignment sides, mean gap rises 1.737 → 2.051, while maximum falls 13 → 9 and gaps ≥10 fall 2 → 0. Comparable conditions-score gaps have p95 6 → 3 and maximum 17 → 9. The frozen screenshot pair stays 57 / 59.

A simulated 12-hour station delay retains the same coverage. Comparable maximum map gap remains 10, with no new severe jumps. The screenshot pair changes from the delayed count baseline 52 / 59 to 56 / 59. Intensity uses raw provider temperatures in that unsupported tail, exactly as the original heat-count rule; it does not introduce an hourly-lapse-only recount.

Across **all** sides, including ecologically different neighbours, mean map gap rises 3.886 → 4.673 and gaps ≥20 rise 439 → 476. Twelve new jumps from <10 to ≥20 occur: seven border zero compatible habitat, while the other five have habitat-coverage differences of 56–92 percentage points. Eleven are within the same weather assignment. None passes the predefined comparable-neighbour criteria. These are accepted habitat contrasts exposed by higher conditions scores, not evidence of uniform smoothing. All-side conditions gaps improve: p95 11 → 8, maximum 45 → 24, and gaps ≥20 fall 86 → 7.

## Findings and taxonomic grouping

All 783 frozen replay records passed baseline controls, and production heat-intensity scores exactly match the selected candidate. There are 764 controlled model series, including 649 station-blended records; 19 retain legacy heat treatment. Previously unavailable scores remain unavailable. No network requests were made.

The updated observation evaluator preserves original taxonomic grouping: **35 recorded positive taxa in 32 reports**, 105 corresponding background rows, and four unsuccessful searches. Genus alternatives count once; explicitly co-reported species remain separate. Baseline/candidate primary opportunity AUC changes **0.69109 → 0.70000** across all controls, or **0.69551 → 0.70476** against background dates alone. Conditions AUC across all controls changes **0.72949 → 0.73106**. Opportunity discrimination against the four unsuccessful searches stays **0.575**. These are reused calibration data, not an independent validation set.

The earlier receipt's whole-report maximum and its cell-cluster intervals remain supplementary historical checks. Species-expanded rows are compatibility diagnostics, not confirmed finds of each candidate species.

## Implementation and compatibility

- Store `heatDegreeHours14d` / `heatDegreeHours20d` separately from integer heat-hour counts. Normalization, aggregation and public scoring projections retain complete evidence. A source missing intensity cannot silently disappear from an aggregate.
- The v2 prior sets `heatIntensityWidthC=6`. Equivalent heat hours are `sum(max(0, T − 27))/6`; the existing heat half-life uses these equivalents. At 33°C an hour contributes one equivalent, at 28°C one sixth. This normalization is an explicit provisional prior, not a measured biological dose-response.
- Station blending derives intensity from the same controlled series, including the original provider tail. Its algorithm/station-pool version remains v3 because the temperature estimate itself is unchanged. The independent cell cache key advances to `cell-temperature-cache-v2-heat-intensity`, and corrected patches include degree-hours.
- Older raw bins can supply degree-hours only when complete and matching stored mean/count controls. They are never shifted to cell elevation for this calculation. Missing optional evidence retains the old count penalty; no backfill, schema migration or score withholding is required.
- Forecasts carry degree-hour anomalies only when current, horizon-zero and target windows all supply them, retaining fractions and nonnegative nested windows. Otherwise they retain count-based scoring. Observed bins are discarded after projection. The public method describes this fallback.
- Rejected terrain diagnostics discard stale intensity when substituting temperatures. V1 scoring remains count-based. Public hour labels remain actual threshold counts.

## Reproduction

```sh
npm run weather:compare-temperature-boundaries -- \
  --input=artifacts/station-boundary-check-20260909-coverage/weather.json \
  --station-report=artifacts/station-network/station-report.json \
  --station-cache=artifacts/station-network/cache --blend-mode=tapered \
  --station-lag-hours=0 --heat-width-c=6 \
  --out=artifacts/heat-intensity-boundaries/production-heat-6c-lag-0.json
```

Repeat with `--station-lag-hours=12`. Findings replay uses `scripts/compare-finding-heat-drying.mjs` as documented in the earlier receipt; it now also asserts production equality for `heat-6c`. Run the standard metrics on baseline and `heat-6c` with `--input` pointing to the original spreadsheet reconverted with recorded-taxon groups. The [aggregate evidence](heat-intensity-release-2026-09-09.json) retains input hashes and summary metrics without private rows or fine geography.
