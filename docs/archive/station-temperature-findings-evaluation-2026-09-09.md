# Station/model temperature blend: findings evaluation · 9 September 2026

Historical evaluation receipt. **Completed offline; the fixed 50/50 blend does not establish an overall improvement against reported findings. It is not enabled in production.** The [aggregate evidence](station-temperature-findings-evaluation-2026-09-09.json) contains both observation-quality policies without private locations. Reproducible tools are described in the [active procedure](../station-temperature-validation.md#evaluate-the-blend-against-findings).

The preceding [station and neighbouring-cell experiment](cell-temperature-impact-2026-09-09.md#follow-up-equal-stationmodel-blend-at-actual-cell-elevation) improved mean station temperature accuracy in three periods and changed the screenshot pair from 23 / 60 to 57 / 59. This evaluation tests whether that exact candidate also improves the mushroom prediction model.

## Fixed comparison

- Baseline: `hydrothermal-v2-priors-2026-09a`, production means-only elevation correction and original heat/frost counts. The re-exported baseline is byte-for-byte identical to all 783 records from the preceding restored-model evaluation.
- Candidate: `xema-arome-equal-blend-shadow-v1`, fixed 50% AROME / 50% interpolated XEMA, both aligned to actual cell elevation before averaging hourly temperatures and recounting thresholds. No weights or ecological priors were tuned.
- Same eight station donors, same 50 km / 600 m eligibility and spatial weights as the local experiment. Their geometric coverage supports 35 of the 36 report locations. This is not a full-network Catalonia evaluation.
- Same historical model and soil caches, station-rain inputs, static habitat, species interpretation, dates, control-sampling seed and scoring parameters. Water and all nonthermal factors are identical per record.
- Every candidate needs a complete 480-hour model control reproducing the baseline's six thermal fields and complete station support. Unsupported comparisons retain the exact baseline; they do not fabricate missing exposure or blank an existing score.

The dataset has 32 positive reports, 96 sampled seasonal comparison dates and four unsuccessful searches. Species ambiguity yields 77 positive species/date records, 231 seasonal records and 13 unsuccessful-search records on central dates. The 783 total records additionally include ±3-day trajectories; those extra dates are not counted as independent positive findings.

The primary results collapse each report/date to its maximum score across its originally allowed species, exactly as in the preceding baseline analysis. Seasonal comparison dates are presence-only background, not verified mushroom absences. These observations have been used in previous exploratory evaluations and are not an independent final test set.

## Main results

Higher AUC means better ranking of reported positive findings above comparison days; it is not a percentage of predictions proven correct.

| Measure | Current model | 50/50 blend, published observations | Blend, validated observations only |
| --- | ---: | ---: | ---: |
| Conditions AUC against seasonal background | **0.7666** | 0.7482 | 0.7619 |
| Opportunity AUC against seasonal background | **0.7277** | 0.7052 | 0.7227 |
| Mean conditions score at positive reports | 63.53 | 63.84 | 63.72 |
| Mean conditions score on seasonal comparison dates | 41.84 | 44.10 | 42.43 |
| Mean within-location conditions rank | 0.7396 | **0.7500** | **0.7500** |
| Mean within-location opportunity rank | 0.7344 | **0.7448** | **0.7448** |
| Positive reports reaching conditions 60+ | 20 / 32 | **22 / 32** | **22 / 32** |
| Positive reports reaching opportunity 60+ | 10 / 32 | **13 / 32** | 12 / 32 |

The main blend raises scores more on background dates than on actual positive reports. This reduces overall separation, although the within-location ranking and number of high-scoring positive reports improve slightly. Those are mixed outcomes; a smoother boundary and more accurate station temperatures do not by themselves establish better mushroom predictions under the existing ecological parameters.

Against the four unsuccessful searches, conditions AUC changes from 0.5430 to 0.5391 and opportunity AUC from 0.5703 to 0.5625. Four negative reports are too few to draw a strong conclusion.

## Uncertainty and coverage

A paired bootstrap resampling the same 23 positive-site clusters for both models, with 10,000 replicates and fixed seed 20260909, gives these 95% percentile intervals for the change in seasonal-background AUC:

| Candidate | Conditions AUC change interval | Opportunity AUC change interval |
| --- | --- | --- |
| Published observations | −0.0430 to +0.0073 | −0.0476 to +0.0048 |
| Validated observations only | −0.0216 to +0.0088 | −0.0180 to +0.0064 |

All intervals include no change. The results do not establish that the blend is conclusively worse, and they do not demonstrate an improvement sufficient for promotion.

The published-data run collected 105,612 complete station hours over 553 required UTC days in 2024–2026; 55,093 hours lacked final validation and remain labelled provisional. It applies the blend to 596 of 783 records. On central dates, complete support covers 23 / 32 positive reports, 81 / 96 seasonal backgrounds and 3 / 4 unsuccessful searches. Of the remainder, 168 records lack complete station estimates, 13 already have unavailable baseline scores, and six lack a complete model control. All original score availability is preserved. The 13 pre-existing unavailable scores occur only at +2/+3-day offsets, outside the primary central-date analysis.

The strict validated-only sensitivity retains 50,519 station hours and applies to 321 / 783 records, covering 12 positive reports, 26 background dates and one unsuccessful search on central dates. Its smaller overall change partly reflects much greater baseline fallback, so it cannot be interpreted as an equally comprehensive independent improvement. There are no new unavailable scores in either run.

Restricting the published-data comparison to the same fully supported report/dates also lowers seasonal AUC: conditions 0.7469 → 0.7308 and opportunity 0.7383 → 0.7193. Both sides use the same 23 positive reports and 81 backgrounds in that comparison; incomplete support is not silently dropped from the primary result.

## Reproducibility and checks

Private baseline snapshots, canonical source assignments, hashed hourly source files, station manifest, candidate records, reports and the paired analysis are retained under `~/bolets-private/evaluations/2026-09-09-station-blend/`. No exact finding coordinates or per-finding dates are included in the versioned evidence companion.

The station collection made 503 bounded public XEMA requests and reused 51 cache entries including metadata. Requests contain station codes and calendar days only, with concurrency four and no finding coordinates. The original AROME, rain and soil replay used 240 cached series and zero network fetches. The two scoring replays run with network access blocked and verify frozen station payload hashes and canonical model assignments. No new Open-Meteo request or provider-ledger mutation was required.

Both candidates and the baseline were processed through `weather:evaluate-findings --metrics`. Baseline score reproduction, source controls, unchanged nonthermal factors, unchanged record identities and exact fallback scores were verified. The ordinary species-expanded reports and the primary report-collapsed analysis are retained separately.

Verification completed: 62 focused tests passed with one intentionally skipped environment-gated replay; both full quality-policy replays and all three standard metric reports passed. Type checking, lint/source-size checks, the production build and diff whitespace checks passed. No production data or scoring configuration was changed.

## Decision

Keep the candidate offline. The temperature and local-continuity gains are useful evidence, but the findings comparison is mixed and coverage is limited. Further work should distinguish the full station network, hourly terrain transfer and ecological calibration using a separate evaluation design; this receipt neither dismisses observed temperatures nor validates blanket adoption of this interpolation and blend.
