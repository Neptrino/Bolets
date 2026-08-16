# Fruiting-model diagnosis (hydrothermal-v1)

Diagnostic run of 2026-08-16 against dated fruiting observations, using
`npm run weather:evaluate-findings`. This document records what the evaluation
measured and which `hydrothermal-v2` decisions it settles. It contains no
coordinates: every observation set stays outside the repository.

## Method

Events are replayed through the production scoring path at their observed date
and compared with matched control days drawn at the **same location and species**,
within ±30 days of the event's day-of-year in any archive year, and more than 10
days away from every known event at that location. Because occurrence data is
presence-only, a control day may have been fruiting unobserved, so every
discrimination number below is a **lower bound** on the model's true skill.

Two independent observation sets were used:

| Set | Events | Controls | Notes |
|---|---|---|---|
| Private field spreadsheet | 55 | 170 | 690–1950 m, mostly montane; includes searched-and-found-nothing rows as labelled negatives |
| GBIF occurrence search (Catalonia, 2024+) | 76 | 152 | Research-grade citizen science, ≤1 km coordinate uncertainty |

FungaCAT could not be used: its most recent occurrences are from **2021**, and
the AROME historical archive starts on **2024-01-02**, so the two never overlap.

## Headline result

The model does not rank genuine fruiting days above ordinary in-season days.

| Metric | Spreadsheet | GBIF |
|---|---|---|
| AUC, opportunity index | 0.35 | 0.56 |
| AUC, fruiting conditions | 0.22 | 0.57 |
| Median opportunity at events | 0 | 1 |
| Median opportunity at controls | 0 | 0 |
| Events reaching score 40+ | 0% | — |

An AUC of 0.5 is a coin flip. On the montane spreadsheet set the model is
**inverted**: it scores real finds *lower* than random in-season days at the
same places.

## Root cause: the soil-water term

Attribution isolates one component. `soilWaterState` is the bottleneck at 46 of
55 spreadsheet events and carries by far the most score damage (mean −ln factor
1.54, next highest 0.62). Its AUC is **0.145** — strongly anti-predictive — while
the rain-accumulation term in the *same* water calculation reaches AUC **0.81**.

The two water inputs contradict each other at the moment of fruiting:

- **38 of 55 events** have accumulated rainfall well above the trigger threshold
  (rainTrigger > 0.7) **and** modelled soil moisture below the drought floor at
  the same place and time.
- Median relative extractable water is **0.137 at events** versus **0.678 at
  controls**; the ecto band floor is 0.15, so the event median is a hard zero.
- Per month, in every peak month, events are drier than controls in the model:
  August 0.044 vs 0.528, September 0.137 vs 0.746, October 0.119 vs 0.801.

Neutralising the water term alone lifts mean event fruiting conditions from
**7.9 to 42.8** and AUC from 0.22 to 0.55. Neutralising any other component
slightly *reduces* AUC, so phenology, temperature and extremes carry real signal
and only the water term is actively harmful.

### Why the soil input fails: altitude

The failure tracks elevation. Within the spreadsheet set, modelled relative
extractable water correlates with altitude at **r = −0.73**:

| Altitude | Events | Median modelled REW | Zeroed by dry soil |
|---|---|---|---|
| below 1200 m | 4 | 0.822 | 0 of 4 |
| 1200 m and above | 51 | 0.137 | 38 of 51 |

The GBIF set, which skews lower and more accessible, shows only 9 of 76 events
zeroed this way — the same model, far less damage, because the sites are lower.

Provider disagreement confirms the input is unreliable rather than merely
mis-calibrated: swapping the best-match soil series for ICON-EU changes the
water score by a **median 0.35** (on a 0–1 scale, up to 0.82) and fruiting
conditions by a median 8.7 points, up to 86.

## Hypotheses that the data did not support

Three suspicions from code reading turned out not to matter in practice:

- **Waterlogging hard zero** — never fired. 0 of 55 spreadsheet events and 1 of
  76 GBIF events were zeroed by soil above the band maximum. All the damage is
  on the dry side.
- **Frost/heat extremes** — median multiplier 1.0 at both events and controls;
  only 27% of events fell below 0.5, and neutralising the term *reduces* AUC.
- **Phenology cap** — phenology is *higher* at events than controls (0.797 vs
  0.665). It is working.

## Confirmed structural findings

- **Habitat ceiling.** 55% (spreadsheet) and 70% (GBIF) of events sit in cells
  whose habitat fraction makes the "alta" band unreachable at any weather,
  because the published score is `O = H × F` with `H` an area fraction.
- **Temperature optimum offset.** The window mean temperature at events sits
  **4.0 °C below** the species optimum on the spreadsheet set (1.1 °C on GBIF),
  consistent with optima derived from editorial daytime ranges being scored
  against 14/20-day means that include nights.
- **Habitat gate strictness.** 68 of 144 GBIF occurrence locations (47%) did not
  resolve to any habitat-compatible 250 m cell for their own species, so the
  gate excludes places where that species demonstrably fruits.

## hydrothermal-v2 measured against the same events

v2 rebuilds the water term as a weighted geometric mean of two estimators —
accumulated rainfall and soil state — each with a floor, so neither can zero the
score alone. Habitat enters as `habitat^0.4` instead of a linear area fraction.
Replaying the identical events and controls through both models:

| Metric | v1 | v2 |
|---|---|---|
| AUC, opportunity | 0.35 | 0.54 |
| AUC, fruiting conditions | 0.22 | 0.59 |
| Median score at events | 0 | 15 |
| Median score at controls | 0 | 0.5 |
| Events scoring 20+ | 5% | 40% |
| Events scoring 40+ | 0% | 26% |
| Events hard-zeroed by dry soil | 38 | 0 |

The inversion is gone and the catastrophic zeroing is eliminated, but **v2 is
still only modestly better than chance**. It fixes the failure that made the
model unusable; it does not yet make it strongly predictive. The remaining gap
is the missing terrain-aware water signal.

### Fitting the soil weight

Sweeping the soil estimator's weight over the same events, with the report
recomputed offline from cached replays:

| Soil weight | Montane AUC (opportunity) | Lowland GBIF AUC |
|---|---|---|
| 0.00 | 0.558 | 0.567 |
| 0.15 | 0.542 | 0.563 |
| 0.35 | 0.525 | 0.565 |

Lower is better on montane data and indistinguishable on lowland data, so a low
weight is weakly dominant rather than an artefact of fitting on the evaluation
set. The shipped value is **0.15**: near the optimum, and it keeps the term
structurally present so the CLMS 1 km replacement re-weights an existing input
instead of reintroducing one. The habitat exponent does not affect ranking at
all (it is monotone in habitat, applied to events and controls alike); it sets
the score level, and 0.4 was chosen so a 30% compatible cell can reach "alta".

## What this settles for hydrothermal-v2

| Parameter | Prior | Evidence-based decision |
|---|---|---|
| P3 wet-side floor `w_wet` | 0.35 | **Deprioritise.** Waterlogging never fires; the wet side is not the problem. |
| P7 drought floor | keep hard zero | **Change.** The dry side is the dominant failure. A hard zero on an unreliable input destroys 69% of montane events. |
| P5 frost/heat half-lives | 6/16 h, 24/48 h | **Deprioritise.** Extremes are not damaging this dataset. |
| P6 optimum shift δ | 3 °C | **≈4 °C** on montane data; fit per guild rather than globally. |
| P1 habitat exponent β | 0.4 | **Keep.** Ceiling confirmed on both sets. |
| P8 SWI depth | T=5 | Prefer the deeper index: the failure is a shallow 3–9 cm layer drying faster than the water fungi actually use. |

The dry-side softening and re-weighting are implemented in
`src/lib/hydrothermal-v2.ts`. The remaining high-value change is replacing the
coarse modelled soil-moisture input with a source that resolves mountain
terrain — the CLMS 1 km Soil Water Index, normalised to a per-point
climatological percentile — which is what should earn the soil weight back.

## Effect of the habitat pH taper (2026-08-16)

`habitat-static-v8-ph-taper` replaced the binary soil-pH gate with a linear
ramp. Re-running the identical events through both models afterwards:

| Metric | v1 before | v1 after | v2 before | v2 after |
|---|---|---|---|---|
| Mean effective habitat | 0.422 | 0.439 | 0.422 | 0.439 |
| Mean score at events | 2.7 | 3.1 | 22.3 | 23.8 |
| Events scoring 20+ | 5% | 5% | 40% | 44% |
| AUC, opportunity | 0.350 | 0.344 | 0.542 | 0.550 |

The taper helps, but modestly on this set, because all 26 spreadsheet locations
already resolved to a cell — the pH gate was not what excluded them.

**It does not explain the unresolved occurrences.** Of 144 GBIF locations, 68
(47%) failed to resolve to a habitat-compatible 250 m cell for their own
species, and that number is **unchanged** by the taper. Sampling twelve of them:
three had no compatible cell within ~5 km for that species at all, two had
compatible cells nearby but none containing the exact point, and the rest are
multi-species groups where at least one species failed while others resolved.
Some of that is legitimate — an occurrence record can sit outside modelled
habitat — but the residual cause is land-cover or altitude gating, not pH, and
it remains open.

## CLMS archive coverage

Discovery against CDSE STAC establishes what a soil backfill can actually reach:

| Collection | Coverage |
|---|---|
| `clms_ssm_europe_1km_daily_v1_cog` | 2014-10-04 → now |
| `clms_swi_europe_1km_daily_v1_cog` | 2014-12-31 → 2025-07-12 |
| `clms_swi_europe_1km_daily_v2_cog` | 2025-07-12 → now |

SWI at 1 km is continuous back to 2014, but split across a version boundary at
2025-07-12 where the spatial-shift correction landed; the adapter deliberately
refuses v1. Fortunately **52 of the 55 spreadsheet species-events (95%) fall
inside the v2 window**, so the SWI hypothesis can be tested on almost the whole
private dataset without mixing versions. Building a multi-year percentile
climatology would need the v1 archive, and that still requires quantifying the
spatial shift first.

Two adapter fixes were needed for historical dates, both tightening rather than
loosening verification: `proj:code` is read from the item properties when an
older record omits it on the asset, and `proj:bbox` is derived from the affine
transform and raster shape when absent, so the CEURO bounds check still runs.
STAC discovery also retries on HTTP 429.

## First CLMS measurement (2026-08-16)

35 CLMS snapshots covering the scored dates were fetched and sampled at the
private finding locations. Comparing both water inputs **on exactly the same
records** — every record where SWI is usable:

| Input | AUC | Event median | Control median |
|---|---|---|---|
| SWI T=10 | **0.637** | 67.8 | 66.2 |
| SWI T=5 | 0.562 | 67.8 | 68.5 |
| Coarse 3–9 cm REW | 0.296 | 0.38 | 0.90 |

The ordering across integration depths — T=2 (0.521), T=5 (0.562), T=10
(0.637) — matches the physical expectation that fruiting responds to deeper,
longer-integrated water rather than a fast-drying surface layer. Where SWI is
available it is genuinely informative, while the coarse series remains
anti-predictive on the identical records.

**But SWI is masked exactly where it is needed.** Of all sampled
location-dates, 54% return no-data for SWI, and the gap tracks altitude:

| Site altitude | Location-dates with usable SWI |
|---|---|
| below 1200 m | 140 / 140 (100%) |
| 1200 m and above | 276 / 700 (39%) |

The SCATSAR retrieval is unreliable over complex terrain, so the montane sites
that make up most of this dataset are masked most of the time. Only 10 events
survive into the like-for-like comparison above, so that AUC is a first
indication, not a settled result.

### Expanded measurement (91 dates, 200 locations)

The follow-up backfill grew the archive to 91 dates (2.8 GB) and sampled 17,400
location-dates at 200 locations: the 26 private locations plus 174 GBIF
occurrences inside the SWI v2 window. This test needs no weather replay or
habitat resolution — SWI at event dates versus in-season control dates at the
same locations — so habitat-gate failures cannot skew it.

| Event set | n events | SWI T=10 AUC |
|---|---|---|
| Private findings | 6 | **0.888** |
| GBIF occurrences | 84 | 0.482 |
| GBIF, forest ecto species only | 46 | 0.431 |
| GBIF, grassland/urban species | 35 | 0.542 |

The result is split, and the split is not explained by species mix: GBIF forest
species show *no* positive SWI signal on their own. The private result is
nominally strong (z ≈ 3.3 against its controls), but n = 6 — masking removed
most montane events — and the controls are autocorrelated daily series, so the
effective evidence is weaker than the z-score suggests. A further confound
applies only to the private set: a forager goes out *because* it rained, so
find days are wet days partly by selection. The two observed-negative rows are
the beginning of the control for that bias, but two is not enough.

Candidate explanations for the GBIF null, none yet testable with this data:
opportunistic records lag the fruiting trigger (a photographed mushroom may be
a week old), lowland sites are less water-limited or irrigation-influenced, and
GBIF date/location precision is coarser than the daily 1 km signal.

### What this changes

1. **SWI is not confirmed as a general discriminator.** The earlier 0.637 came
   from 10 events; at 84 GBIF events the signal is absent. Do not fit v2
   parameters to SWI yet, and do not raise the soil weight for it.
2. The v2 structure already accommodates this outcome: the soil term is floored
   and weighted at 0.15, so a masked or uninformative SWI cannot damage the
   score the way the coarse REW hard-zero did.
3. Prefer **T=10** over T=5 if SWI is ever adopted (the depth ordering was
   consistent in both measurements).
4. The decisive dataset is more private field data: deliberate searches with
   recorded abundance — especially abundance-0 rows, which control the
   went-out-because-it-rained bias. The harness makes each new season's rows
   immediately measurable.

## Thermal and calibration fitting (2026-08-16)

A full sweep of the thermal parameters over the cached replays (warm half-width
5/7/9 °C × heat half-life 12/48/120 h × optimum shift 0/+3 °C) was **flat**:
discrimination stayed within 0.528–0.550, with the shipped settings on top.
Relaxing summer thermal terms lifts events and same-season background days
together, so it buys nothing.

The instructive detail is the three 2026-08-15 *S. luteus* rows that score 0
under both models. They are **not** thermally bound: even the most relaxed
config lifts them only to 2–3, because the binding factors are phenology (0.25,
an editorial "possible" month) times water (0.30, genuinely dry mid-August) —
and all three were abundance-1 (scarce) finds. A low score there is correct;
only the hard zero was wrong, and the calibration below removes it.

The calibration curve γ was then fitted on the abundance grades, which is safe
because a monotone curve cannot change discrimination:

| γ | Abundance ≥3 finds reaching "alta" | Control median |
|---|---|---|
| 1.0 | 36% | 2.0 |
| **0.8** | **45%** | 4.0 |
| 0.7 | 45% | 5.0 |
| 0.6 | 45% | 8.0 |

γ = 0.8 captures the whole band-alignment gain; stronger curves only inflate
background. Shipped as `calibrationGamma: 0.8` (P2 resolved). P5 and P6 keep
their current values — the sweep found them already at the optimum on this
dataset — and the August heat response stays on the watch list until a season
with abundant summer finds can distinguish it from phenology.

## Status

`hydrothermal-v2` exists side by side with v1 and is **not enabled for any
species**: `HYDROTHERMAL_V2_SPECIES` in `src/lib/model-versions.ts` is empty, so
production still scores every species with v1. Adding a species id to that set
switches it, and `PREDICTION_CACHE_VERSION` must be bumped in the same change.
Re-run the comparison below before each cutover wave.

## Reproducing

```bash
npm run findings:convert -- --input=/absolute/path/findings.csv --output-dir=/absolute/path/converted
```

```bash
npm run weather:evaluate-findings -- --replay --model=v1 --input=/absolute/path/converted --artifacts-dir=/absolute/path/v1 --soil-shadow
```

```bash
npm run weather:evaluate-findings -- --replay --model=v2 --input=/absolute/path/converted --artifacts-dir=/absolute/path/v2
```

```bash
npm run weather:evaluate-findings -- --metrics --artifacts-dir=/absolute/path/v2 --out=/absolute/path/v2-report.json
```

Both replays share a response cache, so pointing `FINDING_EVAL_CACHE_DIR` at an
existing cache makes the second model run offline. `FINDING_EVAL_V2_OVERRIDES`
takes a JSON patch of the v2 `water` and `combination` parameters, which is how
the sweeps above were produced without editing shipped priors.

Replay responses are cached on disk, so the metrics phase is offline and a
re-run makes no network requests. Input files, artifacts and reports must all
stay outside the repository; reports identify locations by ordinal only.
