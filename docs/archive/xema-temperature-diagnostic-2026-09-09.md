# XEMA temperature diagnostic · 9 September 2026

Historical offline research. No temperature correction, prediction-prior change or deployment resulted from this comparison. The active procedure is [Observed temperature validation](../station-temperature-validation.md); the [machine-readable evidence](xema-temperature-diagnostic-2026-09-09.json) preserves station metrics, experiment settings, quality counts and input hashes.

## Question and scope

Neighbouring 250 m cep cells showed extremes factors of 26% and 100% and conditions scores of 23 and 64. Could observed station temperatures support a correction to AROME's heat/frost inputs?

The experiment samples eight public XEMA stations near the affected mountain region: Molló–Fabert (CG), Núria (DG), Das–Aeròdrom (DP), Castellar de n'Hug–el Clot del Moro (MS), la Vall d'en Bas (W9), Puigcerdà (YA), Ulldeter at 2,413 m (ZC), and la Tosa d'Alp (ZD). Their elevations span 461–2,478 m. This is a regional diagnostic, not a Catalonia-wide validation or a replay of the two selected map cells.

Three 20-day windows supplied 11,241 matched station/model hours:

| Period, inclusive UTC | Split date | Quality policy | Matched hours | Complete 480-hour station windows |
| --- | --- | --- | ---: | ---: |
| 20 Aug–8 Sep 2026 | 30 Aug | Published, including labelled provisional | 3,839 | 7/8 |
| 20 Jul–8 Aug 2026 | 30 Jul | Validated only | 3,648 | 0/8 |
| 10–29 Jan 2026 | 20 Jan | Validated only | 3,754 | 7/8 |

The recent window contained 2,496 final-validated and 1,343 provisional matched hours. The other two comparisons use only flag `V`. A missing or unvalidated interval is excluded from both observation and model; no count is extrapolated to a complete scoring window. Counts below refer to the matched samples, not automatically to all elapsed hours.

## Baseline findings

Across each whole window, AROME MAE was 1.40°C recently, 1.56°C in the other summer period, and 1.56°C in winter. Opposite station errors are obscured by overall signed biases close to zero.

For example, the recent complete Das window had a +1.96°C model bias and 81 model versus 55 observed hourly-mean heat-threshold crossings. In the hours outside 08:00–18:00 UTC its bias was +2.42°C, compared with −2.12°C at Ulldeter and −1.67°C at la Tosa. This pattern is compatible with terrain-dependent temperature errors; it does not establish an inversion or cold pool as the cause at the screenshot location.

The thermal comparison aligns complete XEMA interval means with trapezoidal AROME interval means. “Heat hours” and “frost hours” are threshold-crossing proxies at ≥27°C and ≤0°C, not measurements of exact exposure duration or reproductions of the production instantaneous-hour count. Winter produced 1,865 observed versus 1,813 model frost crossings, but the superficially similar totals concealed 275 false positives and 327 false negatives across all matched stations/hours.

## Held-out experiments

The fixed spatial configuration requires two other stations within 50 km and 600 m of elevation, weights distance/elevation with Gaussian scales of 25 km/400 m, and caps additive bias at ±3°C. The target station never supplies its own correction. Insufficient support retains baseline temperatures; approximately one eighth of evaluated hours lacked support, notably at the lowest station.

The first candidate learns each donor's UTC-hour bias on earlier dates, then transfers it to later dates at the excluded target station. The second uses same-hour peer residuals. Its spatial parameters are fixed, but observations from the evaluation date are intentional inputs: it is retrospective observation anchoring, not a forecast or complete temporal holdout. This second exploratory candidate was added after inspecting the first candidate's inconsistent results; these comparisons are not independent final model-selection evidence.

Errors on dates at or after the split, averaging each station's temperature MAE equally:

| Evaluation block | Baseline MAE | Earlier diurnal correction | Same-hour peer correction |
| --- | ---: | ---: | ---: |
| Recent | 1.672°C | 1.603°C | 1.692°C |
| Other summer | 1.585°C | 1.689°C | 1.583°C |
| Winter | 1.278°C | 1.476°C | 1.235°C |

| Evaluation block / threshold | Baseline misclassified hours | Earlier diurnal correction | Same-hour peer correction |
| --- | ---: | ---: | ---: |
| Recent heat | 72 | 70 | 71 |
| Other summer heat | 53 | 58 | 50 |
| Winter frost | 252 | 334 | 251 |

Earlier diurnal transfer worsens both the separate summer and winter comparisons. Same-hour anchoring gives small, mixed temperature changes and small threshold-classification improvements; it does not demonstrate a reliable correction for the reported map discontinuity. These descriptive results have no statistical-significance claim, and hourly samples are not independent observations.

## Decision

Keep both candidates offline. XEMA observations are useful for identifying errors, but neither simple transfer provides enough evidence for a production scoring change. The station-validation stage has not selected a candidate for the private findings replay; no candidate findings-AUC claim is made here. Previous findings comparisons and the restored production baseline remain in [the thermal investigation](../terrain-thermal-exposure.md).

The neighbouring-cell score difference remains unresolved. The next work must evaluate terrain representativeness and the discontinuous weather assignment separately, with broader station support and the private findings comparison before promotion. A smoothed colour boundary alone is not evidence of a better model.

## Reproduction and verification

Use `weather:compare-station-temperature` with the station codes above and each table's dates, split and quality policy. The original run made 61 XEMA requests and three accounted AROME requests (39 estimated units including the safety margin). The evidence reports were then reproduced with 22 cache hits apiece and zero network or ledger calls. Their source fetch timestamps and hashes are retained. Cached public source responses remain under `artifacts/station-temperature/cache/`; use a separate cache directory for future provider revisions.

Accounting correction identified during the follow-up cell replay: the original 39 units had been recorded in the local development database. They were reconciled once into the hosted shared ledger on 9 September, and the command now selects the hosted spatial owner and rejects a local-only ledger. This correction changes no scientific inputs or scores.

The implementation adds no scheduled ingestion, database migration or runtime scoring dependency. The shared provider-usage estimator now includes inclusive archive date ranges; its normal production-workload estimate is unchanged. All 20 focused tests, type checking, lint/source-size checks and the production build passed. Coverage verifies observation quality/completeness, matching and missing-hour behaviour, excluded-station/date isolation, donor fallback and provider accounting. All three cached comparisons reproduced without provider requests. This receipt is not a deployment claim.

Sources: [XEMA measurements](https://analisi.transparenciacatalunya.cat/d/nzvn-apee), [variable definitions](https://analisi.transparenciacatalunya.cat/d/4fb2-n3yi), [station inventory](https://analisi.transparenciacatalunya.cat/d/yqwd-vj5e), [Generalitat reuse terms](https://administraciodigital.gencat.cat/ca/dades/dades-obertes/informacio-practica/llicencies/), and [Open-Meteo historical forecasts](https://open-meteo.com/en/docs/historical-forecast-api).
