# XEMA correction: impact on neighbouring cells · 9 September 2026

Historical offline sensitivity comparison. No production scoring change or deployment. The [active procedure](../station-temperature-validation.md#replay-the-effect-on-frozen-cells) describes replay inputs and controls; [aggregate evidence](cell-temperature-impact-2026-09-09.json) contains the results without fine-cell locations. Detailed cell inputs remain in local `artifacts/cell-temperature-impact/`.

Subsequent result: the [findings evaluation](station-temperature-findings-evaluation-2026-09-09.md) is now complete and mixed, with no established overall improvement. The pending-validation statements below describe the stage when this local sensitivity test was completed.

## Result

The latest follow-up averages XEMA and AROME temperatures 50/50 after aligning both to actual cell elevation. It changes the selected pair from **23 / 60 to 57 / 59**, reducing the gap from 37 to two points (95% smaller). Mean supported-station temperature error and the relevant heat/frost classification errors improve in all three exploratory periods, although some individual stations regress. This is a promising candidate for further validation; no private findings replay or production promotion has occurred.

The preceding direct-XEMA-only experiment gave 56 / 58 but worsened warm-period station accuracy. Both experiments and their controls are retained below.

## Initial representative-point correction

The two neighbouring 250 m cep cells near Pardines were identified by their matching six-factor fingerprints, adjacency and screenshot scores. Their frozen baseline reproduces 23 versus 60, with conditions scores 23 versus 64. Both initial XEMA residual corrections reduce the gap from 37 to 31 points, an approximately 16% reduction. A substantial discontinuity remains.

| Scenario | Western cell | Eastern cell | Score gap |
| --- | ---: | ---: | ---: |
| Current model | 23 | 60 | 37 |
| Earlier-days station bias | 29 | 60 | 31 |
| Same-hour station observations | 27 | 58 | 31 |

| Reading | Current west / east | Earlier-days correction | Same-hour correction |
| --- | --- | --- | --- |
| Conditions index | 23 / 64 | 30 / 64 | 28 / 62 |
| Heat hours in 20 days | 23 / 0 | 17 / 0 | 19 / 1 |
| Extremes factor | 26% / 100% | 37% / 100% | 33% / 94% |
| Effective cell temperature mean, 20 days | 15.75°C / 14.79°C | 15.63°C / 14.73°C | 15.51°C / 14.79°C |

All frost counts remain zero. The effective temperature mean includes the existing production means-only elevation correction; the heat-hour count remains an estimate at the representative weather source, consistent with the retained production input contract.

The actual cell elevations are 1,824 m and 1,833 m: a difference of only 9 m. Their representative weather elevations are 1,472 m and 1,776 m, a difference of 304 m. XEMA bias correction changes the source temperatures modestly; it does not remove this spatial assignment difference. No inversion or cold pool at the fine cells is established by this replay.

## Initial controls and scope

- Same species parameters: `hydrothermal-v2-priors-2026-09a+hydrothermal-v2`.
- Exact atmospheric valid hour: 9 September 2026, 00:00 UTC. All 480 scored hours run from 20 August at 01:00 UTC through that endpoint.
- Stored private AROME rolling histories reproduce both cells' 14/20-day means and heat/frost counts. No archive replacement or weather revision is mistaken for the effect of a correction.
- Only six thermal fields change. Water, soil, rainfall, habitat, altitude suitability and phenology remain unchanged; no hourly lapse correction is introduced.
- Both methods use the eight XEMA stations and fixed donor weights from the [station diagnostic](xema-temperature-diagnostic-2026-09-09.md). The earlier-days fit uses 10–19 August, strictly before the scored window; same-hour anchoring uses contemporary observations.
- XEMA interval-derived biases are interpolated between surrounding interval centres before application to instantaneous model samples. This temporal bridge is an explicit approximation, not an additional validation claim.
- The comparison uses 5,767 matched station hours, including 1,351 provisional hours. Every scored hour has sufficient donor support for both methods at both representative sources.

The surrounding 7 × 5 block includes 35 cells. Both corrections pass all 35 thermal controls with 480 supported hours per cell. Earlier-days correction changes scores by 0 to +7 points; same-hour correction changes them by −2 to +5 points. The five west/east pairs along the weather boundary change as follows, south to north:

| Current | Earlier-days correction | Same-hour correction |
| --- | --- | --- |
| 15 / 25 | 20 / 25 | 18 / 24 |
| 16 / 48 | 20 / 48 | 19 / 46 |
| **23 / 60** | **29 / 60** | **27 / 58** |
| 20 / 56 | 26 / 56 | 24 / 54 |
| 17 / 46 | 22 / 46 | 20 / 44 |

## Interpretation

The initial residual corrections make these cells somewhat closer, but do not solve the abrupt boundary. These results quantify sensitivity only. The screenshot pair was selected to investigate a reported anomaly, not as an independent accuracy test. No candidate has passed a private findings replay for production promotion.

## Follow-up: station interpolation at actual cell elevation

The same frozen inputs were replayed in four additional scenarios, without new provider requests or changing production scoring parameters:

| Scenario | Western cell | Eastern cell | Gap |
| --- | ---: | ---: | ---: |
| Current model | 23 | 60 | 37 |
| Earlier-days residual evaluated at cell coordinates/elevation | 29 | 60 | 31 |
| Same-hour residual evaluated at cell coordinates/elevation | 25 | 60 | 35 |
| Direct XEMA temperature interpolation, fixed 6.5°C/km adjustment | **56** | **58** | **2** |
| Direct XEMA temperature interpolation, no lapse adjustment | 58 | 59 | 1 |

The residual variants preserve the assigned AROME series and its exposure elevation. The direct variants replace the series with a distance/elevation-weighted average of simultaneous station observations at the fine cell's centre. Donors use the existing fixed 50 km / 600 m cutoffs and Gaussian scales of 25 km / 400 m, with at least two complete donors per interval. The elevation variant shifts each donor to the cell elevation using −6.5°C per kilometre upward. The zero-lapse variant keeps identical donor selection/weights and is an ablation, not a separately tuned winner.

The selected pair uses Molló–Fabert (CG), Núria (DG) and Ulldeter (ZC), with Núria contributing approximately half the weight. Both methods estimate zero heat and frost hours in both cells; the fixed-lapse variant gives 20-day means of 16.00°C and 15.94°C. The western extremes factor changes from 26% to 100%, explaining most of its score increase. Similar scores also occur without the lapse shift: this test attributes the disappearance of this boundary primarily to replacing the discontinuous representative weather series with a common station field, not to proving the fixed lapse rate correct.

Direct estimates require all 480 hourly samples to have both bracketing interval estimates, each supported by at least two donors. Incomplete series withhold the comparison and preserve the baseline; they do not mix representative-altitude hours with cell-altitude estimates. The internal thermal reference is set to the cell altitude so the existing means-only correction is not applied twice. Water and every nonthermal scoring component remain unchanged. These hourly samples are interpolated from observed interval means, not measured instantaneous weather at 250 m resolution.

All four scenarios pass the exact source controls for all 35 cells. Every cell has 480 supported samples. The fixed-lapse observation scenario changes scores by −7 to +35 points. Five boundary pairs, south to north:

| Current | Direct observations + elevation adjustment |
| --- | --- |
| 15 / 25 | 26 / 18 |
| 16 / 48 | 33 / 46 |
| **23 / 60** | **56 / 58** |
| 20 / 56 | 51 / 54 |
| 17 / 46 | 43 / 45 |

### Held-out station check

The direct observation method was also checked over the same three cached periods. Each target station was entirely excluded from its own interpolation; other stations' simultaneous observations remain legitimate inputs. No settings were tuned. Accuracy below is the mean station MAE on exactly the same supported hours for both AROME and interpolation. Seven of eight stations had sufficient donors; Val d'en Bas (W9) had none and is excluded from both supported-hour metrics, with unavailable coverage retained in the evidence.

| Evaluation dates, UTC | Supported hours | AROME MAE | Interpolation MAE, 6.5°C/km | Interpolation MAE, no lapse |
| --- | ---: | ---: | ---: | ---: |
| 30 Aug–8 Sep | 1,678 | 1.545°C | 1.639°C | 1.660°C |
| 30 Jul–8 Aug | 1,512 | 1.438°C | 1.603°C | 1.601°C |
| 20–29 Jan | 1,680 | 1.294°C | 1.158°C | 1.553°C |

With fixed lapse, heat classification errors decrease from 58 to 51 in the recent window, but increase from 36 to 41 in summer. Winter frost errors decrease from 238 to 203. Station results vary: Núria's warm-period MAE rises from 1.052°C to 1.905°C recently and from 0.964°C to 1.974°C in summer. These are hourly-mean threshold proxies, not observed minutes of exposure. Recent published readings include provisional observations; summer and winter use validated readings only.

The local boundary is nearly removed, but broader accuracy is mixed and worsens in both warm periods. The experiment therefore remains offline. These reused exploratory periods do not constitute an independent final validation, and no new private findings replay or prior-version bump was performed. Neither these scores nor the station errors prove a cold pool or inversion at the selected cells.

## Follow-up: equal station/model blend at actual cell elevation

Version: `xema-arome-equal-blend-shadow-v1`. Fix the station weight at 50% before running the comparison; no other weights were searched. For every timestamp:

1. Shift the stored AROME temperature from its returned representative elevation to the cell elevation at −6.5°C/km upward, capped at ±6°C. This is an experimental hourly operation; production still corrects only long-window means.
2. Interpolate simultaneous XEMA temperatures at the cell centre/elevation using the preceding fixed-lapse method and the same donor rules. Bridge the surrounding interval centres to the model timestamp as before.
3. Average those two temperature estimates equally. Recalculate 14/20-day means and threshold counts from the blended series; never average existing heat counts or final scores.
4. Set the comparison's thermal reference to the cell elevation to avoid a second mean adjustment. Require complete support for all 480 samples and retain the baseline if a comparison is unavailable. Water and all nonthermal components remain unchanged.

| Scenario | West score | East score | Gap | West / east heat hours |
| --- | ---: | ---: | ---: | --- |
| Current production model | 23 | 60 | 37 | 23 / 0 |
| Hourly model elevation adjustment only | 51 | 60 | 9 | 3 / 0 |
| Direct elevation-adjusted XEMA only | 56 | 58 | 2 | 0 / 0 |
| **50/50 elevation-aligned blend** | **57** | **59** | **2** | **0 / 0** |

The blended 20-day means are 15.87°C and 15.37°C, and conditions scores are 59 and 63. The model-only control shows that much of the local score change already comes from recounting elevation-shifted model hours. The previous failure of hourly lapse alone in the findings evaluation therefore remains relevant; the new blend must be evaluated separately against findings.

All 35 cells pass the exact baseline controls and complete the blended series. Changes range from −4 to +35 points. The five boundary pairs become **24 / 21**, **31 / 47**, **57 / 59**, **52 / 55**, and **43 / 45**, south to north. Water, habitat coverage, altitude suitability and phenology are preserved.

### Blend station accuracy

Use the same three cached periods and omit each entire target station from XEMA interpolation. Adjust the AROME series only by the remaining difference between its returned DEM elevation and the target station's elevation, then blend. The model component therefore receives no duplicate full-altitude correction. Supported comparisons use the same seven stations and exactly the same paired hours as before; unsupported W9 retains raw AROME in the separate fallback report.

| Evaluation dates, UTC | AROME MAE | Model altitude adjustment only | 50/50 blend MAE | Change from AROME |
| --- | ---: | ---: | ---: | ---: |
| 30 Aug–8 Sep | 1.545°C | 1.557°C | **1.417°C** | −8.3% |
| 30 Jul–8 Aug | 1.438°C | 1.436°C | **1.374°C** | −4.4% |
| 20–29 Jan | 1.294°C | 1.281°C | **1.077°C** | −16.7% |

Heat classification errors change from **58 to 48** recently and **36 to 31** in summer. Winter frost errors change from **238 to 216**. These remain hourly-mean threshold proxies. The blend also beats the model-altitude-only control on mean temperature error and relevant threshold errors in all three periods.

The station average does not imply improvement everywhere: Núria's recent MAE changes from 1.052°C to 1.362°C and its summer MAE from 0.964°C to 1.367°C; Molló–Fabert also worsens in both warm periods. Winter MAE improves at all seven supported stations. The diagnostics use AROME requested at station coordinates, with small remaining elevation differences; they do not independently validate the much larger representative-to-cell elevation shifts in every production map cell. These are reused exploratory dates and no confidence intervals or independent final test are claimed.

This candidate merits further findings and broader spatial validation. It is not deployed. The three station reruns and local cell replay use only frozen data, with no provider requests or ledger writes.

## Verification

The offline replay passes its frozen-source controls and completes without network requests. Unit tests cover unchanged baselines on missing station support, exact-hour windows, source mismatch, failed thermal controls, temporal interpolation, no input mutation and protection of all nonthermal scoring components. They also verify that offline provider requests use the hosted shared usage ledger instead of a local development database.

The additional data collection used ten station training days and one endpoint day, plus one AROME station archive request (nine conservatively estimated units in the hosted shared ledger). The cell histories came directly from the existing private provider states, with no new AROME request for the map cells.

The actual-elevation follow-up reused all frozen inputs with zero network or ledger requests. All prior station residual metrics remain exactly unchanged. Additional tests verify altitude-shift direction, target exclusion, same-hour completeness, identical supported comparison sets, zero-temperature handling, no double lapse, preservation of nonthermal inputs and baseline retention on incomplete estimates.

Verification completed: 34 focused unit tests passed, the offline 35-cell replay passed with network access blocked, type checking and lint/source-size checks passed, and the production build passed. No deployment or production data mutation was performed.

Equal-blend follow-up verification: 39 focused tests passed, all 35 frozen cells completed both new controls with 480 supported hours, and all earlier cell/station results remained exactly unchanged. Type checking, lint/source-size checks and the production build passed. New tests cover shared altitude conventions and caps, averaging before threshold counting, target-station exclusion, remaining DEM correction, incomplete-input fallback and no second lapse adjustment.
