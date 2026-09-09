import {
  clamp01,
  relativeExtractableWater,
  smoothstep,
} from "@/src/lib/hydrothermal";
import type {
  ConditionSnapshot,
  TemperatureModelParameters,
  WaterModelParametersV2,
} from "@/src/lib/types";

type EnvironmentValues = ConditionSnapshot["values"];

/**
 * hydrothermal-v2 water response.
 *
 * The 2026-08 diagnostic replay (docs/fruiting-model-diagnosis.md) measured the
 * two water inputs separately against dated fruiting observations. Accumulated
 * rainfall discriminated real fruiting days well (AUC 0.81); modelled 3-9 cm
 * soil moisture was anti-predictive (AUC 0.145) and collapsed to a hard zero at
 * 38 of 55 montane finds while rainfall said the ground was wet. v1 weights the
 * two the wrong way round: soil state is an unbounded multiplier that can zero
 * the score, while the rain response is damped into [1 - triggerDependency, 1].
 *
 * v2 therefore treats them as two estimators of the same quantity, combined as
 * a weighted geometric mean, each bounded away from zero so that one unreliable
 * source cannot erase an otherwise favourable score. Confidence in the soil
 * estimator is a parameter, so replacing the coarse series with a terrain-aware
 * one (CLMS 1 km SWI) is a weight change rather than a restructure.
 */

/**
 * Four-point response like v1's `smoothBand`, but the tails settle onto floors
 * instead of zero. A reading outside the band means "unfavourable", and with an
 * input this noisy it must not mean "impossible".
 */
export function smoothBandV2(
  value: number,
  [minimum, optimumStart, optimumEnd, maximum]: readonly [number, number, number, number],
  { dryFloor, wetFloor }: { dryFloor: number; wetFloor: number },
) {
  if (!(minimum < optimumStart && optimumStart <= optimumEnd && optimumEnd < maximum)) {
    throw new RangeError("A response band must be strictly ordered around its optimum");
  }
  if (!(dryFloor >= 0 && dryFloor <= 1 && wetFloor >= 0 && wetFloor <= 1)) {
    throw new RangeError("Response floors must be within [0, 1]");
  }
  if (value <= minimum) return dryFloor;
  if (value >= maximum) return wetFloor;
  if (value < optimumStart) {
    return dryFloor + (1 - dryFloor) * smoothstep((value - minimum) / (optimumStart - minimum));
  }
  if (value <= optimumEnd) return 1;
  return wetFloor + (1 - wetFloor) * (1 - smoothstep((value - optimumEnd) / (maximum - optimumEnd)));
}

function hill(value: number, halfSaturation: number) {
  const squared = Math.max(0, value) ** 2;
  return squared / (squared + halfSaturation ** 2);
}

function saturationVapourPressureKpa(temperatureC: number) {
  return 0.6108 * Math.exp((17.27 * temperatureC) / (temperatureC + 237.3));
}

/**
 * Matured rain, scored through age-band weights: rain from 0-7, 7-14, 14-21,
 * 21-26 and 26-30 days ago contributes with its guild's band weight instead
 * of a hard window. Fruiting bodies found today developed over the preceding
 * weeks, so fresh rain weighs little for slow guilds (crediting it instantly
 * inflated background days right after storms), while old rain fades out
 * gradually rather than vanishing the night a storm crosses a window edge —
 * the 2026-09-09 cross-set validation showed the ramped bands keep
 * discrimination unchanged while removing the day-edge cliffs from
 * projections. Band sums are exact differences of the stored trailing
 * windows, whose 24 h bins subtract cleanly. Drying terms (dry spell, VPD)
 * stay anchored to the present: they act on already-emerged bodies.
 */
const RAIN_AGE_BAND_FIELDS = [
  ["rainfall7dMm", "rainfallDays7d", "evapotranspiration7dMm"],
  ["rainfall14dMm", "rainfallDays14d", "evapotranspiration14dMm"],
  ["rainfall21dMm", "rainfallDays21d", "evapotranspiration21dMm"],
  ["rainfall26dMm", "rainfallDays26d", "evapotranspiration26dMm"],
  ["rainfall30dMm", "rainfallDays30d", "evapotranspiration30dMm"],
] as const;

export function rainfallWindow(
  values: EnvironmentValues,
  parameters: WaterModelParametersV2,
) {
  const weights = parameters.rainAgeBandWeights;
  if (weights.length !== RAIN_AGE_BAND_FIELDS.length ||
      weights.some((weight) => !(weight >= 0 && weight <= 1))) {
    throw new RangeError("Rain age-band weights must be five values within [0, 1]");
  }
  const totals = { rainfall: 0, rainyDays: 0, evapotranspiration: 0 };
  let previous = { rainfall: 0, rainyDays: 0, evapotranspiration: 0 };
  for (const [index, [rainField, daysField, etField]] of RAIN_AGE_BAND_FIELDS.entries()) {
    const rainfall = values[rainField];
    const rainyDays = values[daysField];
    const evapotranspiration = values[etField];
    if (rainfall === undefined || rainyDays === undefined || evapotranspiration === undefined) {
      return { rainfall: undefined, rainyDays: undefined, evapotranspiration: undefined };
    }
    const weight = weights[index]!;
    // Trailing windows nest, so each band is the difference from the window
    // one step shorter; negative differences are measurement noise.
    totals.rainfall += weight * Math.max(0, rainfall - previous.rainfall);
    totals.rainyDays += weight * Math.max(0, rainyDays - previous.rainyDays);
    totals.evapotranspiration +=
      weight * Math.max(0, evapotranspiration - previous.evapotranspiration);
    previous = { rainfall, rainyDays, evapotranspiration };
  }
  return totals;
}

/**
 * Rain the response curve actually sees: the window total minus one
 * millimetre of interception per wet day and half of reference ET0. Shared
 * with the public readings so the displayed "net rain" is the scored one.
 */
export function effectiveRainfallMm(rain: {
  rainfall: number;
  rainyDays: number;
  evapotranspiration: number;
}) {
  return Math.max(0, rain.rainfall - rain.rainyDays - rain.evapotranspiration * 0.5);
}

export type WaterSuitabilityV2 = {
  score: number;
  waterBalance: number;
  soilWaterState: number;
  soilWeight: number;
  relativeExtractableWaterMean: number;
  relativeExtractableWaterFloor: number;
  vapourPressureDeficitKpa: number;
  atmosphericRetention: number;
  drySpellRetention: number;
  soilWaterSource: "open-meteo-rew";
};

export function waterSuitabilityV2(
  values: EnvironmentValues,
  parameters: WaterModelParametersV2,
): WaterSuitabilityV2 | null {
  const texture = values.soilTexture;
  const moistureMean = values.soilMoistureAvg7d;
  const moistureFloor = values.soilMoistureMin7d;
  const temperature7d = values.temperatureAvg7dC;
  const humidity7d = values.relativeHumidityAvg7d;
  const drySpellDays = values.drySpellDays;
  const rain = rainfallWindow(values, parameters);

  if (
    temperature7d === undefined ||
    humidity7d === undefined ||
    drySpellDays === undefined ||
    rain.rainfall === undefined ||
    rain.rainyDays === undefined ||
    rain.evapotranspiration === undefined
  ) return null;

  // At weight zero the soil estimator cannot move the score, so a soil-feed
  // outage must not block scoring; the state is still reported when the
  // inputs exist so shadow comparisons keep their diagnostics.
  const soilRequired = parameters.soilWeight > 0;
  let rewMean = 0;
  let rewFloor = 0;
  let soilWaterState = 1;
  const soilInputsPresent = Boolean(texture) &&
    moistureMean !== undefined && moistureFloor !== undefined;
  if (soilRequired && !soilInputsPresent) return null;
  if (soilInputsPresent) {
    const mean = relativeExtractableWater(moistureMean!, texture!);
    const floor = relativeExtractableWater(moistureFloor!, texture!);
    if (mean === null || floor === null) {
      if (soilRequired) return null;
    } else {
      rewMean = mean;
      rewFloor = floor;
      const floors = { dryFloor: parameters.soilDryFloor, wetFloor: parameters.soilWetFloor };
      // The 7-day minimum is kept, but at a lower weight than v1's 0.25: a
      // single dry hour in a coarse grid cell is weak evidence about the week.
      soilWaterState =
        (1 - parameters.soilFloorWeight) * smoothBandV2(rewMean, parameters.rewBand, floors) +
        parameters.soilFloorWeight * smoothBandV2(rewFloor, parameters.rewBand, floors);
    }
  }

  // Aggregated precipitation cannot identify each hourly interception loss.
  // One millimetre per wet day and half of reference ET0 are conservative,
  // explicit deductions before the saturating rain response.
  const effectiveRainfall = effectiveRainfallMm({
    rainfall: rain.rainfall,
    rainyDays: rain.rainyDays,
    evapotranspiration: rain.evapotranspiration,
  });
  const rainResponse =
    0.7 * hill(effectiveRainfall, parameters.rainfallHalfSaturationMm) +
    0.3 * hill(rain.rainyDays, parameters.wetDaysHalfSaturation);
  // Rain is the better-measured estimator, but a saturating response still
  // reaches zero in a genuinely rainless window, so it carries its own floor.
  const waterBalance = parameters.rainFloor + (1 - parameters.rainFloor) * rainResponse;

  const vpd = saturationVapourPressureKpa(temperature7d) *
    (1 - Math.max(0, Math.min(100, humidity7d)) / 100);
  const atmosphericRetention = Math.exp(
    -Math.max(0, vpd - parameters.vpdComfortKpa) / parameters.vpdDecayKpa,
  );
  const drySpellRetention = Math.exp(
    -Math.max(0, drySpellDays - parameters.drySpellGraceDays) /
      parameters.drySpellDecayDays,
  );

  const soilWeight = parameters.soilWeight;
  if (!(soilWeight >= 0 && soilWeight <= 1)) {
    throw new RangeError("Soil estimator weight must be within [0, 1]");
  }
  const score = clamp01(
    waterBalance ** (1 - soilWeight) *
      soilWaterState ** soilWeight *
      atmosphericRetention ** parameters.vpdExponent *
      drySpellRetention ** parameters.drySpellExponent,
  );

  return {
    score,
    waterBalance,
    soilWaterState,
    soilWeight,
    relativeExtractableWaterMean: rewMean,
    relativeExtractableWaterFloor: rewFloor,
    vapourPressureDeficitKpa: vpd,
    atmosphericRetention,
    drySpellRetention,
    soilWaterSource: "open-meteo-rew",
  };
}

/**
 * Monotone calibration applied to the raw component product. Kept as an
 * explicit, versioned step so the published bands can be aligned with observed
 * fruiting frequency without hiding a correction inside a component.
 */
export function calibrate(value: number, gamma: number) {
  if (!(gamma > 0)) throw new RangeError("Calibration exponent must be positive");
  return clamp01(value) ** gamma;
}

/**
 * Habitat enters as a concave weight rather than a linear area fraction. Under
 * v1 a cell that is 30% compatible woodland could never exceed a score of 30,
 * so the upper bands were unreachable at 55-70% of observed finds even in
 * perfect conditions.
 */
export function habitatWeight(effectiveHabitatCoverage: number, exponent: number) {
  if (!(exponent > 0 && exponent <= 1)) {
    throw new RangeError("Habitat exponent must be within (0, 1]");
  }
  return clamp01(effectiveHabitatCoverage) ** exponent;
}

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Standard atmospheric lapse rate. Open-Meteo's own elevation downscaling of
 * the AROME points behind the montane cells implies 6.46-6.67 C/km, so this
 * constant reproduces per-cell provider downscaling without per-cell requests.
 */
const TERRAIN_LAPSE_C_PER_KM = 6.5;
const TERRAIN_LAPSE_MAX_DELTA_C = 6;

/**
 * Corrects the scored temperature window means from the provider grid's
 * representative elevation to the cell's true altitude. Adjacent 250 m cells
 * at the same real altitude can snap to AROME points whose representative
 * elevations differ by hundreds of metres, painting a false seam; the lapse
 * correction removes it. Threshold-counted frost/heat hours cannot be shifted
 * linearly and stay unchanged, as does the 7-day mean feeding the water term.
 */
/** The capped lapse delta between grid elevation and cell altitude, in C. */
export function terrainLapseDeltaC(values: EnvironmentValues): number | null {
  const gridElevation = values.weatherElevationM;
  const cellAltitude = values.altitudeM;
  if (
    gridElevation === undefined || cellAltitude === undefined ||
    !Number.isFinite(gridElevation) || !Number.isFinite(cellAltitude)
  ) return null;
  return Math.max(
    -TERRAIN_LAPSE_MAX_DELTA_C,
    Math.min(
      TERRAIN_LAPSE_MAX_DELTA_C,
      TERRAIN_LAPSE_C_PER_KM * (gridElevation - cellAltitude) / 1000,
    ),
  );
}

export function terrainThermalCorrection(
  values: EnvironmentValues,
): Partial<EnvironmentValues> {
  const deltaC = terrainLapseDeltaC(values);
  if (deltaC === null || deltaC === 0) return {};
  const corrected: Partial<EnvironmentValues> = {};
  if (values.temperatureAvg14dC !== undefined) {
    corrected.temperatureAvg14dC = values.temperatureAvg14dC + deltaC;
  }
  if (values.temperatureAvg20dC !== undefined) {
    corrected.temperatureAvg20dC = values.temperatureAvg20dC + deltaC;
  }
  return corrected;
}

/**
 * The date at which a cell should read the phenology calendar. Dated
 * observations put the autumn season 25-40 days earlier per 1000 m of
 * altitude, so a cell above the species' reference altitude reads the
 * calendar ahead by the configured rate; below it, behind. Without a cell
 * altitude the calendar is read at the observation date unchanged.
 */
export function phenologyObservationDate(
  observedAt: string,
  altitudeM: number | undefined,
  shift: {
    daysPer100m: number;
    referenceAltitudeM: number;
    maxShiftDays: number;
  } | undefined,
) {
  if (!shift || altitudeM === undefined || !Number.isFinite(altitudeM)) return observedAt;
  if (!(shift.maxShiftDays >= 0)) throw new RangeError("Phenology shift cap must be non-negative");
  const rawDays = ((altitudeM - shift.referenceAltitudeM) / 100) * shift.daysPer100m;
  const shiftDays = Math.max(-shift.maxShiftDays, Math.min(shift.maxShiftDays, rawDays));
  const shifted = Date.parse(observedAt) + shiftDays * MILLISECONDS_PER_DAY;
  if (!Number.isFinite(shifted)) return observedAt;
  return new Date(shifted).toISOString();
}

export function missingHydrothermalFieldsV2(
  values: EnvironmentValues,
  water: WaterModelParametersV2,
  temperature: TemperatureModelParameters,
) {
  const rainFields = water.rainfallWindowDays === 14
    ? ["rainfall14dMm", "rainfallDays14d", "evapotranspiration14dMm"] as const
    : water.rainfallWindowDays === 21
      ? ["rainfall21dMm", "rainfallDays21d", "evapotranspiration21dMm"] as const
      : ["rainfall26dMm", "rainfallDays26d", "evapotranspiration26dMm"] as const;
  const temperatureFields = temperature.windowDays === 14
    ? ["temperatureAvg14dC", "frostHours14d", "heatHours14d"] as const
    : ["temperatureAvg20dC", "frostHours20d", "heatHours20d"] as const;
  // Soil inputs are only load-bearing while the soil estimator carries
  // weight; at zero they stay optional diagnostics.
  const soilFields = water.soilWeight > 0
    ? ["soilTexture", "soilMoistureAvg7d", "soilMoistureMin7d"] as const
    : [] as const;
  // The age-band kernel reads the whole trailing-window ladder, so every
  // rung is load-bearing.
  const ladderFields = [
    "rainfall7dMm", "rainfallDays7d", "evapotranspiration7dMm",
    "rainfall14dMm", "rainfallDays14d", "evapotranspiration14dMm",
    "rainfall21dMm", "rainfallDays21d", "evapotranspiration21dMm",
    "rainfall26dMm", "rainfallDays26d", "evapotranspiration26dMm",
    "rainfall30dMm", "rainfallDays30d", "evapotranspiration30dMm",
  ] as const;
  const required = [
    ...soilFields,
    "temperatureAvg7dC",
    "relativeHumidityAvg7d",
    "drySpellDays",
    ...ladderFields,
    ...rainFields,
    ...temperatureFields,
  ] as const satisfies readonly (keyof EnvironmentValues)[];
  return [...new Set(required)].filter((field) => values[field] === undefined);
}
