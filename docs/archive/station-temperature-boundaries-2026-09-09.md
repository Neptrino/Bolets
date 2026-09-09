# Temperature blend: broader boundary check · 9 September 2026

Historical evaluation receipt. **The broader check and a station-selection repair are complete. The blend remains offline; no production scoring, ingestion, database schema or deployment was changed.** [Aggregate evidence](station-temperature-boundaries-2026-09-09.json) retains both candidates, all-pair and comparable-pair results, station checks, findings replays and missing-hour sensitivity.

The user explicitly values avoiding large artificial boundaries alongside the mixed findings result. This evaluation therefore measures spatial consistency separately from findings discrimination, rather than requiring every metric to increase. It does not claim that similar average finding scores establish statistical equivalence.

## Sample and controls

The initial sample comprised eight fixed geographic windows: Pardines, Cerdanya, Toses, Alt Berguedà, eastern Ripollès, Garrotxa, Montseny and the Núria slopes. Two additional windows in Guilleries and southern Osona were selected from station-distance geometry after the initial sample contained almost no comparable coverage transitions. Those additional boundaries were fixed before scoring their cells. No private finding coordinates were used to select windows.

The final sample contains **4,816 canonical 250 m cells, 107 atmospheric points and 8,892 shared-side pairs**, all at the same atmospheric valid hour, 2026-09-09 00:00 UTC. Each side is counted once; diagonal neighbours are excluded. The scored species is *Boletus edulis*.

The representative weather series must reproduce the original six 14/20-day thermal aggregates before any replacement is allowed. Every comparison uses the same 480 model samples, station observations, habitat, altitude suitability, seasonality and unified water calculation. Incomplete station estimates retain the original baseline. Both candidates apply to 3,958 cells and retain the baseline for 858. All 550 Montseny cells fall back with this eight-station pool.

Comparable pairs were defined before scoring: both cells must have positive habitat, altitude suitability and phenology; altitude differs by at most 50 m; habitat coverage, altitude suitability and water response differ by at most 10 points each; and phenology differs by at most two points. This yields **1,417 comparable pairs**, including **137 crossing atmospheric assignment boundaries**. The main severe-jump diagnostic is a gap reaching 20+ when the baseline gap was below 10.

## Broad result

All gaps below refer to final opportunity/map scores out of 100.

| Measure | Current model | Original 50/50 blend | Blend with station taper |
| --- | ---: | ---: | ---: |
| Mean gap across comparable weather-grid boundaries | 7.40 | 2.12 | **2.15** |
| 95th-percentile gap across those boundaries | 30 | 10 | **10** |
| Maximum gap across those boundaries | 41 | 14 | **14** |
| Weather-grid boundary gaps of 20+ points | 18 | 0 | **0** |
| Weather-grid boundary gaps of 10+ points | 41 | 8 | **8** |
| Mean gap over all comparable neighbours | 1.08 | 1.13 | **1.13** |
| Mean gap within the same weather assignment, comparable neighbours | 0.40 | 1.02 | **1.02** |
| New 20+ jumps among comparable neighbours | 0 | 0 | **0** |
| Comparable gaps increasing by at least 10 points | — | 4 | **6** |
| Selected screenshot pair | 23 / 60 | 57 / 59 | **57 / 59** |

The repaired blend reduces the mean cross-weather boundary gap by approximately 71%. Of those 137 boundaries, 74 improve, six widen and 57 stay unchanged. The maximum remaining comparable gap is 14 points. The benefit is concentrated in removing large atmospheric-assignment seams: this is not a uniform reduction of every local difference.

For completeness, across **all 8,892 pairs**, including substantial differences in terrain, habitat and water, mean gaps change from 3.32 to 3.85, while the 95th percentile changes from 20 to 19. There are 46 new 20+ gaps in this unrestricted group under the repaired blend, compared with 40 under the original blend; every such pair is outside the predefined comparable group. These differences must not be hidden by reporting the favourable weather-boundary subset alone, nor assumed to be real microclimate observations.

## Station-selection defect and repair

The original Gaussian station weights remain appreciably positive immediately before the 50 km distance and 600 m elevation cutoffs, then disappear abruptly. The broad sample exposed new 10–12-point steps in Cerdanya associated with donor changes.

A controlled diagnostic kept the cell location and all weather fixed, varying altitude by only 0.002 m across a cutoff. The original blend changed **47 → 53** at the 1,813 m cutoff, **53 → 55** at 1,814 m and **34 → 36** at 1,696 m. This is a numerical selection artifact, not evidence of a real temperature discontinuity.

The repair is versioned as `xema-arome-equal-blend-tapered-shadow-v2`. It retains the 50/50 blend, 6.5°C/km lapse convention, ±6°C model adjustment cap, Gaussian interior weights, original support limits and two-donor minimum. A smoothstep multiplier fades each station's influence to zero over the last **10 km** and **100 m** before the existing cutoffs. It never expands station eligibility or invents observations. The widths were fixed as a bounded edge repair, not selected by searching the findings scores.

The same three 0.002 m diagnostics become **55 → 55**, **55 → 55** and **36 → 36**. Unit tests also verify the distance-limit transition, unchanged interior weights, missing-data behaviour and version separation. The original candidate remains the default for reproducing earlier receipts; the repair must be selected explicitly.

The repair does **not** remove the separate discontinuity when support drops below two stations or an entire 480-hour window becomes incomplete. The remaining six comparable gaps increasing by 10+ points also show that smooth donor weights do not guarantee smooth final scores under threshold-based heat exposure.

## Repeat station and findings checks

Station comparisons omit the target station and use exactly the same supported hours on both sides. No observations or model data were fetched again.

| Period | Model temperature MAE | Original blend MAE | Repaired blend MAE | Relevant threshold errors: model → repaired |
| --- | ---: | ---: | ---: | ---: |
| Recent, published observations | 1.545°C | 1.417°C | 1.451°C | Heat: 58 → 48 |
| Summer, validated observations | 1.438°C | 1.374°C | 1.411°C | Heat: 36 → 33 |
| Winter, validated observations | 1.294°C | 1.077°C | 1.097°C | Frost: 238 → 223 |

The repair retains an overall gain over the current model in all three station periods, but gives up some temperature accuracy relative to the original blend. Individual station regressions remain visible in the evidence companion; the table is not a claim of improvement at every station. Same-hour peer observations are inputs, so these are retrospective comparisons, not forecast validation.

The 783-record private findings replay was repeated with both published and validated-only observations. The central comparison still has 32 positive reports, 96 seasonal background dates and four unsuccessful searches; species-expanded rows and ±3-day trajectories are not extra independent findings.

With published observations, mean positive map scores change **49.156 → 49.281**, and mean positive conditions scores **63.531 → 63.844**. Seasonal AUC changes **0.7666 → 0.7482** for conditions and **0.7277 → 0.7048** for opportunity. Within-location opportunity rank is unchanged at 0.7344; conditions rank improves from 0.7396 to 0.7500. The paired 95% intervals for AUC changes are approximately −0.0429 to +0.0070 and −0.0480 to +0.0028 respectively. This preserves the earlier mixed outcome, not proof of equivalent predictive quality.

Validated-only opportunity AUC is 0.7236, with substantially less station coverage. Full metrics, uncertainty and fallback counts remain in the evidence companion. Updated per-finding tables with dates and every species interpretation are private under `~/bolets-private/evaluations/2026-09-09-station-blend/all-findings-score-comparison-tapered.md`.

## Coverage and operational sensitivity

The comparison contains 3,847 complete station hours, of which 1,351 remain provisional, with no conflicting readings. The eight donor codes remain CG, DG, DP, MS, W9, YA, ZC and ZD.

Each candidate was also replayed eight times, removing one recorded hour halfway through the window from one station at a time. This is a simulated data gap, not a recorded outage. Every run retains existing scores when support becomes incomplete, and none introduces a new 20+ jump among comparable neighbours. Losing an MS or W9 hour reduces corrected coverage from 3,958 to 3,256 cells; the other single-hour losses retain 3,958 corrected cells in this sample.

Only 15 comparable pairs cross actual coverage transitions in the unperturbed run, and their conditions currently score zero. Consequently the absence of score jumps at those edges says little about wet, productive conditions. These tests cover one species and one current date in ten windows, not all of Catalonia, every species, every station failure or seasonal boundary behaviour.

## Reproduction and status

```sh
npm run weather:compare-temperature-boundaries -- \
  --input=artifacts/station-boundary-check-20260909-coverage/weather.json \
  --station-report=artifacts/station-temperature/pardines-20260909.json \
  --station-cache=artifacts/station-temperature/cache \
  --blend-mode=tapered \
  --out=artifacts/station-boundary-check-20260909-coverage/tapered-report.json
```

Omit `--blend-mode` or use `original` for the preceding candidate. Add `--missing-hour-station=MS` to reproduce that operational sensitivity. The sampling design and limits are checked against the frozen input; source/cache hashes are retained. Every scoring replay blocks network access. Stored environment/provider reads were authenticated and read-only, with zero new weather-provider requests, provider-ledger changes or production writes.

The [active temperature procedure](../station-temperature-validation.md) documents the findings and station commands. The station report now includes both blend revisions; use `--blend-mode=tapered` for the corresponding findings replay. Both observation-quality policies passed `weather:evaluate-findings --metrics` with unchanged baseline records and nonthermal fields.

Verification completed: 79 focused tests passed, with three intentional environment-gated skips; the full boundary, station, findings and 16 missing-hour replays passed separately. Type checking, lint/source-size checks, the production build, documentation links and diff whitespace checks passed. A concurrent committed overview update crossed the 500-line review threshold; its cohesive selection/publication/cache/ranking boundary was reviewed and recorded in the existing source-size exception registry without changing runtime behaviour.

The check supports the specific large-boundary benefit the user values, with explicit residual tradeoffs. Production adoption still requires the real temperature ingestion, publication/cache identity, source provenance and scoring integration; the diagnostic cache must never be shipped or treated as a live data feed. The current production engine and its missing-input behaviour remain unchanged.

## Subsequent production integration

The user accepted the disclosed findings tradeoff and requested promotion. `xema-arome-blend-v1` implements this tapered revision through shared production/replay functions; all 4,816 frozen cells reproduce their candidate condition and opportunity scores. A second parity check reproduces the supported findings comparisons. The ecology priors and water inputs remain unchanged. The [active guide](../station-temperature-validation.md) records ingestion, provisional quality, immutable publication, late-data attachment and fallback. These checks verify implementation parity; they are not additional independent validation samples.
