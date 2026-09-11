# Findings evaluation

The private evaluator measures one recorded taxon per visit and date. A report labelled `Boletus` represents one ambiguous observation with several candidate species, not a confirmed observation of every species in that genus. Two explicitly identified species at the same visit remain separate observations, even when they belong to the same genus.

`findings-spreadsheet-v2` retains `observations` alongside the flat `speciesIds` required to replay each candidate. Each observation has a canonical `taxon` and its candidate `speciesIds`. Duplicate records of the same taxon at the same visit are deduplicated. The converter reports recorded-taxon counts separately from candidate-species counts. Legacy input files remain readable for replay, but cannot produce primary evaluation metrics without original taxonomic provenance.

The replay copies observation groups onto event, matched-background and observed-negative records. `weather:evaluate-findings --metrics` produces `finding-observation-evaluation-v2`:

- `discrimination` measures recorded observations, taking the maximum across a group's candidates independently for opportunity and conditions. Apply the identical rule to findings, background dates and unsuccessful searches. This evaluates group opportunity; it does not identify which candidate was present.
- `resolvedSpeciesDiagnostics` contains ecological factor attribution and diagnostic verdicts only for explicitly identified species.
- `expandedCandidateDiagnostics` preserves the old species-expanded measurements for compatibility inspection. Its rows are not independently confirmed findings or absences, and it does not issue habitat-failure verdicts.
- `observations` lists dated group scores. Missing or unavailable candidates withhold the relevant group score; they are never dropped to raise a partial group's score. Only offset-zero finding days enter evaluation.

Observed-negative visits are searched-and-found-nothing records. Sampled background dates are unlabelled and must not be described as verified absences. Both have separate opportunity metrics and threshold rates. A genus-level unsuccessful search is counted once. Group-level maxima are a diagnostic index, not a calibrated probability of occurrence.

## Existing private replay artifacts

Do not infer observation groups from a legacy flat `speciesIds` list: the same list could mean alternatives or several confirmed species. Re-convert the original spreadsheet to a new directory outside the repository:

```sh
npm run findings:convert -- \
  --input=/absolute/private/findings.csv \
  --output-dir=/absolute/private/reconverted

npm run weather:evaluate-findings -- --metrics \
  --input=/absolute/private/reconverted \
  --artifacts-dir=/absolute/private/saved-replay \
  --out=/absolute/private/observation-report.json
```

Use only the intended input batches in that directory, preserving the original replay's location ordering. The metrics join verifies taxonomic membership and finding dates and rejects conflicting metadata. It joins only the observation groups: archived scores, weather windows and any manually refined observation hours remain unchanged. No network access or production model changes are needed. New replays already carry the metadata and do not require `--input` for the metrics phase.

The report is a retrospective diagnostic. Repeated dates at the same physical site are not independent samples; any uncertainty analysis must cluster by physical site, not by replay visit ordinal. Preserve taxonomic ambiguity in any future training or validation split.
