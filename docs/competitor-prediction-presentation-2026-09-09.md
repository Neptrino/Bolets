# How competitors model and present predictions — 9 September 2026

Prompted by three BoletRadar species cards (Cep, Ou de reig, Rossinyol) that state exact rain amounts and a fruiting delay. This note records what each competitor actually computes, what it shows, and how Bolets compares. Sources: public pages, and for BoletRadar the inline application source served at https://boletradar.cat/ (all model constants are client-side).

## BoletRadar (boletradar.cat) — the cards in question

**Product.** Free PWA, 10 species, favourability index "BRI" 0–100 per 100 m forest pixel, one map per species, "Millors zones avui" (top 5 km blocks with ICGC names) behind a €4.99/12-month unlock. Contact fmarsal@agrifor.org, PayPal donations. Data: Meteocat XEMA (Socrata), SRTM, ICGC 2024 land cover, GBIF.

**Model (from source, `spatial-logistic-v1.1-2026.09`, trained 2026-09-04).**

- `BRI = 100 × pSpatial × rainGate × monthFactor`.
- `pSpatial`: logistic regression with four features: squared altitude distance from the species' GBIF median altitude, 12-day mean temperature, forest fraction, sclerophyll fraction. Trained on **101 GBIF records vs 61 random Catalan points**. Reported AUC 0.79–0.82.
- `rainGate`: rain summed over a per-species lag window `[a, b]` days ago; `base = 0.45 × min`; gate = `clamp((rain − base) / (opt − base))^0.85`. Nothing else: no soil, no evapotranspiration, no wet-day count, no dry spell, no VPD, no frost.
- `monthFactor`: hand-set monthly lookup (e.g. cep `{6:.2, 7:.2, 8:.4, 9:.85, 10:1, 11:.55}`).
- The source comments call rain and phenology "CALIBRATION PARAMETER, direcció validada" — direction checked, values hand-set. Altitude-band and frost factors were tried and removed because they worsened validation. Temperature range, `gel` and `obac` in the species table are displayed but unused in scoring.
- Separate 0–100 "confiança" (station distance, data age, land cover, training range) shown alongside the BRI.

**Species table (min / opt mm, lag window days, altitude plateau, "ideal" temperature).**

| Species | min | opt | lag | good altitude | shown temp |
|---|---|---|---|---|---|
| Rovelló i pinetell | 22 | 70 | 8–28 | 300–1300 | 7–17 |
| Cep | 30 | 90 | 10–30 | 650–1600 | 9–17 |
| Cep negre | 25 | 70 | 7–22 | 120–800 | 14–22 |
| Camagroc | 30 | 85 | 12–35 | 420–1300 | 3–13 |
| Trompeta de la mort | 30 | 80 | 10–28 | 450–1300 | 8–16 |
| Fredolic | 18 | 60 | 10–32 | 250–1400 | 1–12 |
| Llenega negra | 25 | 70 | 10–28 | 100–900 | 5–15 |
| Ou de reig | 20 | 55 | 6–20 | 200–1000 | 15–23 |
| Rossinyol | 25 | 70 | 8–25 | 600–1500 | 10–18 |
| Múrgola | 20 | 60 | 7–25 | 300–1300 | 6–15 |

**Presentation.** Each species card: photo, one-line habitat, "Avui, la millor cel·la del mapa marca N/100", a 12-month bar chart from `monthFactor`, then two templated sentences that print the table above verbatim: "Necessita **min mm** com a mínim, i va bé cap als **opt mm**, acumulats entre **a i b dies abans**. Per això el mapa no reacciona a la pluja d'ahir: el miceli triga." and "**x a y m** és la franja bona, i es va apagant fins als … Temperatura mitjana ideal de … °C. Prefereix l'obaga." Map tap shows the four factors with values ("Pluja 10-30 dies · 47 mm", "Altitud 1 120 m, típica de l'espècie") and a good/neutral/bad tick.

**Assessment.** The precision is a copywriting choice, not a modelling result: the numbers are hand-set gate parameters printed through a template. The model is thinner than ours (no ET, wet days, dry spell, VPD, frost, soil; 162 training points). But the card answers the two questions a forager asks, "how much rain and how long after", in one sentence each, and ties today's best score to the species.

## Boletada (boletada.cat)

- Paid (€19.99 pioneer / €29.99 per year), login-gated map, 9 species in the app, 27 in the guide.
- Client code decodes per-pixel inputs: host forest type, altitude, substrate, 12-day-style mean temperature, a 0–1 humidity factor `fH`, temperature trend, dense/open forest. Season is explicitly **not** a model input. Server scorer is private; no rain window, mm or lag is ever exposed.
- Output: five bands with a recommendation ("Molt alta · Ves-hi" ≥0.80 … "Molt baixa · No hi vagis" <0.10), point popup "Condicions 85% · Molt alta" plus Bosc / Temperatura / Sòl / Altitud / Tendència, top-8 "Millors zones" named by nearest station, and a "Millors espècies avui" list. Today only.
- Rain language everywhere is qualitative: "sòl humit i pluges recents". No fruiting delay anywhere.

## Trobarbolets (trobarbolets.cat)

- Generic daily "condicions de bolets" probability, not per species; registration gate. Gradient boosting over 29 features including rain sums in 3–30 day windows and days since rain at 2/5/10 mm thresholds; 240 stations; trained on 4 264 GBIF/iNaturalist records; self-reported AUC 0.956 CV, ~0.81 out of sample.
- Numbers appear only in an editorial guide, global not per species: "10 mm o més en un o dos dies és el llindar", useful window "dels 5 als 12 dies", fades after 18, baseline after 25.
- Species pages show GBIF-derived months, altitude min/median/max and top comarques. No lag per species.

## Va de Bolets (vadebolets.cat)

- Weekly table for ~30 zones: 5-day rain banded (<5 → 0, 5–14 → 1, 15–29 → 2, ≥30 → 3) plus a 3-day temperature bonus, four emoji levels. Generic, not per species.
- Per-habitat tables give mm and lag (Fageda 15–25 mm, 2–5 days; Pi roig/Roureda 10–20 mm, 3–6 days; Alzinar 20–30 mm, 3–7 days) but the weekly page says "una o dues setmanes després d'un bon xàfec". Internally inconsistent.

## Outside Catalonia (survey of 20+ products)

- **Nobody prints a product-level formula on the forecast itself.** sporas.io, Mycora, ShroomCast, Sporecast, FungiFind, 3B Meteo and Micodata all show a categorical or colour output and hide thresholds. Exact mm and lag appear only in editorial species pages next to the map: Mycora boletus "lluvias de 30 a 60 mm repartidas en varios días", fruiting "entre 8 y 15 días después"; sporas.io "Fructifica 15-20 días tras lluvia abundante"; 3B Meteo porcini "fra i 40–50 e i 90–100 millimetri" over two weeks, watch window "12-18 giorni".
- **Two German tools show raw rain instead of a verdict**: Pilzwetter maps station mm for the last 30 days with the guidance "14 Tage nach stärkeren Niederschlägen"; Waldschatzfinder states a ">10 mm" consecutive-days trigger.
- **Output conventions**: 3 classes (Micodata baja/media/alta), 7 ordinal classes (3B Meteo), 0–100 % with five colour bands (ShroomCast), continuous heatmaps (sporas.io, Sporecast, FungiFind). Horizons run today plus 7–15 days; per-species forecasts are now the norm among newer products. ShroomCast's stated philosophy is "Complex model, simple answer" and it deliberately withholds windows and lags.
- Lag figures across sources cluster on 8–15 days for Boletus edulis and 4–12 for faster species, with prior soil moisture explicitly shortening the lag.

## Where Bolets stands

**What our model already encodes (hydrothermal-v2, `data/model-priors.ts`).** Every number BoletRadar prints has a counterpart in our parameters, and ours were fitted on dated findings with gauge rain:

| Species / guild | Rain window we score | Effective-rain half-saturation | Comparable BoletRadar card |
|---|---|---|---|
| Cep and other Boletus | rain fallen **15–26 days ago** (26-day window, 14-day exclusion) | 17.5 mm effective ≈ **~40 mm raw for half response, ~75 mm near full** in September | 30 min / 90 opt, 10–30 days |
| Rossinyol, rovelló, ou de reig, other ectomycorrhizal | rain fallen **8–21 days ago** | 17.5 mm effective ≈ ~35–40 mm raw half, ~70 mm near full | 25/70, 8–25; 22/70, 8–28; 20/55, 6–20 |
| Litter saprotrophs, grassland | plain trailing **14 days** | 20 mm effective | — |

"Effective" rain subtracts 1 mm per wet day and half of reference evapotranspiration, so the raw-mm equivalents move with season; the figures above assume ~3 mm/day ET0. The water response also carries a 30 % wet-day term, a 0.1 floor, dry-spell and VPD retention, and the cep window is literature-backed (doi 10.64898/2025.12.12.693895).

**What we show instead.** The species page ecology block prints free-text strings from `data/species.ts`: "Després de ploure: Dies a setmanes", "Pluja habitual: Pluja efectiva amb sòl rehidratat". The FAQ page "Quan surten els bolets després de ploure" answers "No hi ha un nombre de dies vàlid per a totes les espècies". The map cell detail shows 24 h / 3 d / 7 d rain and wet days but not the window the model scores, and the species page carries no "today's best" number. So a reader gets the honest caveat and none of the numbers, while BoletRadar gives the numbers and a one-clause caveat.

## Recommendation

Do not copy BoletRadar's constants; derive the same sentence from our own parameters so it is true by construction and stays in sync with refits:

1. **Species card sentence, generated from `FruitingModelConfig`.** "Compta la pluja caiguda entre 15 i 26 dies abans: amb uns 40 mm ja respon, i cap als 75 mm va a ple." Window from `rainfallWindowDays − recentWindowDays × (1 − recentRainWeight)`; mm from inverting the Hill response at 0.5 and 0.9 with a seasonal ET0 assumption, rounded to 5 mm. Keep one clause of caveat: "després de descomptar l'evaporació".
2. **"Avui, la millor cel·la marca N/100" on the species page**, from the existing per-species precompute that feeds /bolets-avui.
3. **Map cell detail: rename the rain reading to the scored window** ("Pluja 15–26 dies abans · 47 mm · per sobre del mínim") so the factor list reads like BoletRadar's tick list but with our real inputs.
4. **Keep the FAQ honest but add the table**: per-guild window and mm bands, with the sentence that these are model parameters fitted on dated finds, not a promise.
5. Leave the month bars: our `seasonality` anchors already give a 12-month profile and the altitude phenology shift is something none of the four competitors has; surface it ("a 1 500 m la temporada va ~15 dies avançada").

Implemented locally the same day (not deployed): items 1, 3, 4 and 5 via `src/lib/rain-response-summary.ts`, which derives the window, the net and gauge millimetres, the response state and the altitude calendar shift from `FruitingModelConfig`; consumed by the species ecology section, the map cell rain card and the rain guide table. Item 2 (today's best score on the species page) and any conversion measurement remain open.
