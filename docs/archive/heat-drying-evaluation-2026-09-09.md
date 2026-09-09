# Heat intensity and drying — 9 September 2026

Dated exploratory evaluation against the frozen full-network `xema-arome-blend-v3` replay. **No production scoring change is promoted.** Current guidance remains in [model diagnosis](../fruiting-model-diagnosis.md) and [temperature validation](../station-temperature-validation.md).

## Conclusion

Increasing the reference-evapotranspiration deduction from 0.5 to 0.75 gives a small aggregate improvement, but worsens the 2026 subset. Heat degree-hours modestly improve opportunity ranking while leaving conditions ranking almost unchanged. Combining them improves aggregate opportunity ranking most, but does not establish a reliable gain or explain the August unsuccessful searches. Every paired confidence interval includes zero. These findings have already informed model selection; none of these comparisons is an independent test.

Retain the candidates as offline experiments. Keep the live coefficient, heat-hour scoring, model version and public method unchanged. A future promotion needs independent findings evidence and the fixed adjacent-cell replay; this experiment does not establish improved spatial boundaries.

## Controlled comparison

The replay verifies every original snapshot score, source hash, grid assignment and available thermal control. It reproduces the full-network baseline through the current scoring engine, including the original model-only tail and unsupported-cell fallback. Of 783 records, 764 have controlled hourly series, 649 use the station blend, and 19 retain their prior heat treatment. Previously unavailable scores remain unavailable.

Candidates are fixed at the start of this comparison:

- **Drying:** subtract 0.75 rather than 0.5 times the same age-weighted ET₀. Rain, wet days, VPD, dry-spell memory and soil configuration stay fixed.
- **Heat 3°C / 6°C:** replace threshold counts with `sum(max(0, temperature - 27) / width)` over the existing species-specific window. One hour at 33°C contributes six times one hour at 28°C. Frost counts, half-lives, source temperatures and recency stay fixed. This normalization is an experimental prior, not a measured biological damage curve.
- **Combined:** each heat candidate with the 0.75 ET₀ coefficient.

The earlier scratch heat probe is superseded: it mixed severity, uniform hourly elevation correction, older-hour weighting, a fixed window and inferred half-lives. Its results cannot isolate intensity or justify production changes. The retained replay uses the actual species configuration and the controlled station/model series instead.

ET₀ and fractional heat equivalents are supplied to the shared scorer through synthetic private snapshots. They must never be stored as weather observations or exposed as measured heat-hour counts. No ingestion, database, cached temperature field or production parameter changes are made.

## Findings results

Primary reporting uses one maximum score per report/date/kind: 32 successful reports, 96 seasonal background dates and four unsuccessful searches. The 77 positive species rows are alternatives within reports, not 77 independent outings. Supplemental ±3-day records are excluded from primary metrics. AUC measures ranking; it is not the fraction of correct predictions.

| Candidate | Conditions AUC | Opportunity AUC |
| --- | ---: | ---: |
| Current baseline | 0.74723 | 0.70231 |
| Drying 0.75 | 0.75146 | 0.70605 |
| Heat 3°C | 0.74756 | 0.70752 |
| Heat 6°C | 0.74707 | 0.70785 |
| Drying + heat 3°C | 0.75114 | 0.71110 |
| Drying + heat 6°C | 0.75146 | 0.71175 |

Paired bootstrap resamples complete histories of the 21 canonical cells containing positive reports, with 10,000 draws and seed 20260909. Drying alone has a conditions-AUC delta of +0.00423, with a 95% percentile interval of −0.01297 to +0.01980. The combined 6°C candidate has an opportunity-AUC delta of +0.00944, interval −0.01166 to +0.03292. These intervals do not demonstrate either improvement or equivalence.

Year sensitivity for drying alone: conditions AUC changes from 0.79524 to 0.82738 in 2025 (14 reports), but from 0.74074 to 0.72407 in 2026 (15 reports). Only three reports belong to 2024. The aggregate gain is therefore not consistent across years.

The standard `weather:evaluate-findings --metrics` also completed for all six variants. Its species-expanded conditions AUC changes from 0.73765 to 0.74955 for drying alone. This larger-looking gain must not replace the report-collapsed comparison. The legacy report's v1 factor-attribution labels are not evidence that zero-weight soil affects v2 scores; this evaluation uses its discrimination outputs only.

## August

The report-collapsed August subset contains 14 successful outings and only three unsuccessful searches, across years. Current mean conditions are 49.79 for successful outings and 59.67 for unsuccessful searches. Drying alone lowers these to 46.50 and 56.67 respectively: nearly the same reduction, preserving the wrong ordering. The combined 6°C candidate gives 48.29 and 57.67. Heat severity alone actually increases both means because many hours only slightly exceed 27°C.

This does not show that heat or drying are irrelevant. It shows that these particular changes do not distinguish the recorded August failures. Three unsuccessful reports are too few to identify the cause or establish specificity. Seasonal background dates may contain unreported fruiting and must not be described as verified absences.

## Reproduction

Use the same private thermal-input export, full-network manifest and normalized station-day cache as the [network evaluation](station-temperature-network-2026-09-09.md). All replay runs are offline; detailed inputs and dated score comparisons stay outside the repository.

```sh
node scripts/compare-finding-heat-drying.mjs \
  --inputs-dir=/private/baseline/thermal-inputs \
  --baseline=/private/network/evaluation-records.jsonl \
  --manifest=/private/network/station-inputs.json \
  --cache-dir=artifacts/station-network \
  --out=/private/heat-drying

node scripts/summarize-heat-drying.mjs \
  --input=/private/heat-drying \
  --thermal-inputs=/private/baseline/thermal-inputs/inputs.jsonl

# Repeat for each candidate directory, including baseline.
npm run weather:evaluate-findings -- --metrics \
  --artifacts-dir=/private/heat-drying/et-075 \
  --out=/private/heat-drying/et-075/metrics.json
```

The summary writes `comparison.json` and `finding-scores.csv` with dates and all candidate scores. The [aggregate evidence companion](heat-drying-evaluation-2026-09-09.json) retains hashes, coverage, grouped metrics and uncertainty without private rows or geometry. Focused tests cover heat intensity, complete windows, missing-evidence fallback, unchanged inputs, report collapsing and cell-cluster resampling.
