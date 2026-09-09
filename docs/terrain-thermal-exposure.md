# Thermal exposure: optional evidence and rejected correction

Status: the hourly-lapse-only recount remains rejected. The separately evaluated tapered station/model blend is now implemented; see [production contract](station-temperature-validation.md). Priors 2026-09c also use controlled heat intensity without an additional hourly lapse correction; see the [heat-intensity receipt](archive/heat-intensity-release-2026-09-09.md).

## What the map evidence establishes

The first reported neighbouring 250 m sectors had extremes factors of 94% and 33%, accounting for most of their 56 versus 24 conditions-score difference. A second screenshot pair for cep shows conditions 23 versus 64, extremes 26% versus 100%, water 39% versus 43%, temperature 84% versus 94%, and phenology 90% in both. Holding other inputs fixed, changing extremes from 100% to 26% takes a conditions score of 64 to approximately 25. These screenshots identify the dominant factor, not corrected scores or observed microclimates.

The long straight boundary across multiple rows suggests a weather-assignment boundary. It does not prove an inversion or cold pool. The selected low-side live reading exposed 23 hours at or above 27 C and zero frost hours in 20 days. With the cep heat half-life of 12 hours, that is an extremes factor of about 26.5%.

Cold-air drainage and inversions can invalidate a uniform hourly lapse assumption; they have not been established as the cause at this site. See the [Met Office explanation of temperature inversions](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/temperature/temperature-inversion). A poor hourly correction does not establish that the remaining spatial discontinuity is ecologically justified. Future candidates should be evaluated for both findings discrimination and changes across neighbouring weather assignments.

## Retained input contract

`thermalExposure` stores exact provider-temperature bins with separate 14/20-day counts and representative elevations. It is optional provider evidence, not finer observed weather. Complete windows require 336 and 480 hours; bins preserve provider precision and aggregation weights. Incomplete or corrupt optional distributions are dropped without removing the existing production thermal fields or withholding scores. Public prediction details omit the distributions. Since priors 2026-09c, raw bins that reproduce the stored means and frost/heat counts may recover missing heat degree-hours at their original reference. This does not call the rejected elevation-shifting diagnostic.

The ingestion adapters and aggregation readers retain complete distributions when available. Migration `20260909150501_preserve_terrain_thermal_exposure.sql` adds optional aggregation support. It requires no historical backfill or score-version change. Forecast anomaly correction discards observed distributions because they no longer describe the projected hours.

`diagnosticThermalExposureAtElevation` retains the rejected scenario for offline comparison: shift each source distribution by 6.5 C/km, capped at ±6 C, before recounting threshold crossings. It is not called by production scoring. The paired provider replay remains a separate limited-confidence shadow calculation with its representative control; already-local replay values use their local elevation internally to prevent a second means correction. Water remains unchanged.

## Findings comparison and decision

The rejected candidate used identical cached provider hours and habitat evidence: 32 positive reports, 96 seasonal comparison dates and four unsuccessful searches. All 321 central species/date records scored; both full runs produced 783 records without fetches or failed locations. Genus-level candidates were collapsed per report, as in the previous evaluation.

| Metric | Production 09a | Rejected hourly correction |
| --- | ---: | ---: |
| Conditions AUC against seasonal comparison dates | 0.767 | 0.727 |
| Opportunity AUC against seasonal comparison dates | 0.728 | 0.697 |
| Conditions AUC against unsuccessful searches | 0.543 | 0.574 |
| Opportunity AUC against unsuccessful searches | 0.570 | 0.598 |

The candidate worsened seasonal discrimination. Improvement against only four unsuccessful searches is insufficient evidence for promotion. These measurements do not identify the physical cause of the regression. Do not tune to recover this benchmark and call that independent validation. Run scoring changes through `weather:evaluate-findings` against the findings baseline before changing the prior version, and use held-out evidence for any subsequent parameter selection.

Private evidence remains outside the repository under `~/bolets-private/evaluations/2026-09-09-current-model/`: `terrain-baseline-replay/`, `terrain-fixed-replay/` and `terrain-fix-comparison.json`. Cached habitat predates the latest grass-mosaic import, so this comparison isolates the thermal change and does not revalidate that habitat release.

Regression coverage checks bin recount arithmetic, complete windows, weighted aggregation, malformed optional evidence, unchanged production scores with and without bins, forecast compatibility and paired replay controls. The migration was exercised against local PostgreSQL in a rolled-back transaction, including reader/cache insertion and role permissions. No production deployment was performed during this investigation.

After withdrawing the candidate, the restored model reproduced all 783 baseline conditions/opportunity scores and missing-field decisions with zero network requests. Raw component differences were within 1e-12 numerical tolerance. The standard findings metrics command also completed successfully; see private `terrain-restored-replay/`, `terrain-restored-report.json` and `terrain-restored-comparison.json`.

## Follow-up: heat sensitivity and station anchoring

Two predeclared exploratory probes doubled and quadrupled the existing species heat half-lives, leaving frost and all other inputs unchanged. Both reused the same cached 783-record replay, with no external fetches. The standard `weather:evaluate-findings --metrics` command was run for each. Report-level seasonal conditions AUC was 0.7666 at baseline, 0.7630 at 2× and 0.7603 at 4×; opportunity AUC was 0.7277, 0.7222 and 0.7202. The four unsuccessful-search scores did not change. These small differences are descriptive, without a significance claim; neither variant supports promotion. Relaxing the penalty also leaves the discontinuous weather assignment in place. Private results are in `heat-sensitivity-2x/`, `heat-sensitivity-4x/` and `heat-sensitivity-comparison.json` alongside the original evaluation.

The XEMA temperature investigation is now available through the [offline station diagnostic](station-temperature-validation.md), with its first [three-period comparison](archive/xema-temperature-diagnostic-2026-09-09.md) retained as dated evidence. At the initial diagnostic, production ingestion collected XEMA precipitation only; the subsequent blend is documented in the active validation guide. The diagnostic reuses station locations/elevations and retains temperature-specific temporal semantics, completeness and validation flags. The [Meteocat data documentation](https://apidocs.meteocat.gencat.cat/documentacio/dades-de-la-xema/) describes UTC timestamps, measurement intervals and validation states; the [measured-data endpoint](https://apidocs.meteocat.gencat.cat/documentacio/dades-mesurades/) provides variable and station queries.

A proposed correction should compare AROME and stations at matched locations, elevations and valid times; distinguish daytime and nighttime errors; and estimate a conservative spatially continuous temperature bias from representative stations. Match interval averages and instantaneous model values explicitly instead of treating them as identical measurements. Do not replace mountain temperatures with the nearest station or reuse rain-distance weights without temperature validation. Where observational support is insufficient, retain the baseline with clear provenance. Recompute thermal aggregates from a consistently defined corrected series, rather than directly modifying an extremes factor or final score, and keep the water calculation unchanged during the experiment.

Validate temperature and threshold-exposure error on stations and date blocks excluded from fitting, then evaluate findings discrimination and adjacent-cell continuity. Station bias correction alone does not guarantee continuity if the underlying model assignment still switches abruptly; assess that boundary separately. The hourly-lapse-only correction remains rejected; the later station/model blend changes temperature sources without changing heat-tolerance parameters.

The fixed 50/50 elevation-aligned station/model blend has now completed its [findings replay](archive/station-temperature-findings-evaluation-2026-09-09.md). It improves the selected boundary and mean station temperature errors, but report-level seasonal AUC changes from 0.7666 to 0.7482 for conditions and from 0.7277 to 0.7052 for opportunity, while same-location ranks improve slightly. Paired uncertainty includes no change; validated-only coverage is smaller and also shows no overall gain. This is mixed exploratory evidence; the later promotion explicitly accepts the findings tradeoff for the measured reduction in artificial boundaries.

The subsequent [broader boundary check](archive/station-temperature-boundaries-2026-09-09.md) confirms the reduction of large weather-assignment seams across ten windows and repairs a discontinuous station-selection weight with an explicit tapered revision. Its station and findings replays are complete, with remaining small-boundary and accuracy tradeoffs reported. Production now implements the tapered revision as `xema-arome-blend-v1`; see the [active publication and fallback contract](station-temperature-validation.md).
