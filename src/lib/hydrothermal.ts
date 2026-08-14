import type {
  ConditionSnapshot,
  TemperatureModelParameters,
  WaterModelParameters,
} from "@/src/lib/types";

type EnvironmentValues = ConditionSnapshot["values"];

const SOIL_HYDRAULICS: Record<string, { wiltingPoint: number; fieldCapacity: number }> = {
  arenosa: { wiltingPoint: 0.06, fieldCapacity: 0.15 },
  francoarenosa: { wiltingPoint: 0.08, fieldCapacity: 0.2 },
  franca: { wiltingPoint: 0.12, fieldCapacity: 0.27 },
  francollimosa: { wiltingPoint: 0.13, fieldCapacity: 0.3 },
  llimosa: { wiltingPoint: 0.15, fieldCapacity: 0.33 },
  francoargilosa: { wiltingPoint: 0.19, fieldCapacity: 0.36 },
  argilosa: { wiltingPoint: 0.22, fieldCapacity: 0.42 },
};

function normaliseControlledTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "");
}

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function smoothstep(value: number) {
  const bounded = clamp01(value);
  return bounded * bounded * (3 - 2 * bounded);
}

/** Smooth four-point response: rise, optimum plateau and saturation decline. */
export function smoothBand(
  value: number,
  [minimum, optimumStart, optimumEnd, maximum]: readonly [number, number, number, number],
) {
  if (!(minimum < optimumStart && optimumStart <= optimumEnd && optimumEnd < maximum)) {
    throw new RangeError("A response band must be strictly ordered around its optimum");
  }
  if (value <= minimum || value >= maximum) return 0;
  if (value < optimumStart) return smoothstep((value - minimum) / (optimumStart - minimum));
  if (value <= optimumEnd) return 1;
  return 1 - smoothstep((value - optimumEnd) / (maximum - optimumEnd));
}

function soilHydraulics(texture: string | undefined) {
  if (!texture) return undefined;
  return SOIL_HYDRAULICS[normaliseControlledTerm(texture)];
}

export function relativeExtractableWater(
  volumetricWaterContent: number,
  texture: string,
) {
  const hydraulics = soilHydraulics(texture);
  if (!hydraulics || hydraulics.fieldCapacity <= hydraulics.wiltingPoint) return null;
  return Math.max(
    0,
    Math.min(
      1.4,
      (volumetricWaterContent - hydraulics.wiltingPoint) /
        (hydraulics.fieldCapacity - hydraulics.wiltingPoint),
    ),
  );
}

function hill(value: number, halfSaturation: number) {
  const squared = Math.max(0, value) ** 2;
  return squared / (squared + halfSaturation ** 2);
}

function saturationVapourPressureKpa(temperatureC: number) {
  return 0.6108 * Math.exp((17.27 * temperatureC) / (temperatureC + 237.3));
}

function rainfallWindow(
  values: EnvironmentValues,
  days: WaterModelParameters["rainfallWindowDays"],
) {
  if (days === 14) {
    return {
      rainfall: values.rainfall14dMm,
      rainyDays: values.rainfallDays14d,
      evapotranspiration: values.evapotranspiration14dMm,
    };
  }
  if (days === 21) {
    return {
      rainfall: values.rainfall21dMm,
      rainyDays: values.rainfallDays21d,
      evapotranspiration: values.evapotranspiration21dMm,
    };
  }
  return {
    rainfall: values.rainfall26dMm,
    rainyDays: values.rainfallDays26d,
    evapotranspiration: values.evapotranspiration26dMm,
  };
}

export type WaterSuitability = {
  score: number;
  relativeExtractableWaterMean: number;
  relativeExtractableWaterFloor: number;
  soilWaterState: number;
  rainTrigger: number;
  vapourPressureDeficitKpa: number;
  atmosphericRetention: number;
  drySpellRetention: number;
};

export function waterSuitability(
  values: EnvironmentValues,
  parameters: WaterModelParameters,
): WaterSuitability | null {
  const texture = values.soilTexture;
  const moistureMean = values.soilMoistureAvg7d;
  const moistureFloor = values.soilMoistureMin7d;
  const temperature7d = values.temperatureAvg7dC;
  const humidity7d = values.relativeHumidityAvg7d;
  const drySpellDays = values.drySpellDays;
  const rain = rainfallWindow(values, parameters.rainfallWindowDays);

  if (
    !texture ||
    moistureMean === undefined ||
    moistureFloor === undefined ||
    temperature7d === undefined ||
    humidity7d === undefined ||
    drySpellDays === undefined ||
    rain.rainfall === undefined ||
    rain.rainyDays === undefined ||
    rain.evapotranspiration === undefined
  ) return null;

  const rewMean = relativeExtractableWater(moistureMean, texture);
  const rewFloor = relativeExtractableWater(moistureFloor, texture);
  if (rewMean === null || rewFloor === null) return null;

  const soilWaterState =
    0.75 * smoothBand(rewMean, parameters.rewBand) +
    0.25 * smoothBand(rewFloor, parameters.rewBand);

  // Aggregated precipitation cannot identify each hourly interception loss.
  // One millimetre per wet day and half of reference ET0 are conservative,
  // explicit deductions before the saturating rain response.
  const effectiveRainfall = Math.max(
    0,
    rain.rainfall - rain.rainyDays - rain.evapotranspiration * 0.5,
  );
  const rainTrigger =
    0.7 * hill(effectiveRainfall, parameters.rainfallHalfSaturationMm) +
    0.3 * hill(rain.rainyDays, parameters.wetDaysHalfSaturation);

  const vpd = saturationVapourPressureKpa(temperature7d) *
    (1 - Math.max(0, Math.min(100, humidity7d)) / 100);
  const atmosphericRetention = Math.exp(
    -Math.max(0, vpd - parameters.vpdComfortKpa) / parameters.vpdDecayKpa,
  );
  const drySpellRetention = Math.exp(
    -Math.max(0, drySpellDays - parameters.drySpellGraceDays) /
      parameters.drySpellDecayDays,
  );
  const trigger =
    (1 - parameters.triggerDependency) +
    parameters.triggerDependency * rainTrigger;
  const score = clamp01(
    soilWaterState *
      trigger *
      atmosphericRetention ** parameters.vpdExponent *
      drySpellRetention ** parameters.drySpellExponent,
  );

  return {
    score,
    relativeExtractableWaterMean: rewMean,
    relativeExtractableWaterFloor: rewFloor,
    soilWaterState,
    rainTrigger,
    vapourPressureDeficitKpa: vpd,
    atmosphericRetention,
    drySpellRetention,
  };
}

export function temperatureResponse(
  temperatureC: number,
  parameters: Pick<
    TemperatureModelParameters,
    "optimumC" | "coldHalfWidthC" | "warmHalfWidthC"
  >,
) {
  const halfWidth = temperatureC < parameters.optimumC
    ? parameters.coldHalfWidthC
    : parameters.warmHalfWidthC;
  if (halfWidth <= 0) throw new RangeError("Temperature half-width must be positive");
  return 2 ** -(((temperatureC - parameters.optimumC) / halfWidth) ** 2);
}

export function temperatureSuitability(
  values: EnvironmentValues,
  parameters: TemperatureModelParameters,
) {
  const temperature = parameters.windowDays === 14
    ? values.temperatureAvg14dC
    : values.temperatureAvg20dC;
  return temperature === undefined ? null : temperatureResponse(temperature, parameters);
}

export function extremeTemperatureMultiplier(
  values: EnvironmentValues,
  parameters: TemperatureModelParameters,
) {
  const frostHours = parameters.windowDays === 14
    ? values.frostHours14d
    : values.frostHours20d;
  const heatHours = parameters.windowDays === 14
    ? values.heatHours14d
    : values.heatHours20d;
  if (frostHours === undefined || heatHours === undefined) return null;
  if (parameters.frostHalfLifeHours <= 0 || parameters.heatHalfLifeHours <= 0) {
    throw new RangeError("Extreme-temperature half-lives must be positive");
  }
  return clamp01(
    2 ** -(frostHours / parameters.frostHalfLifeHours) *
      2 ** -(heatHours / parameters.heatHalfLifeHours),
  );
}

export function missingHydrothermalFields(
  values: EnvironmentValues,
  water: WaterModelParameters,
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
  const required = [
    "soilTexture",
    "soilMoistureAvg7d",
    "soilMoistureMin7d",
    "temperatureAvg7dC",
    "relativeHumidityAvg7d",
    "drySpellDays",
    ...rainFields,
    ...temperatureFields,
  ] as const satisfies readonly (keyof EnvironmentValues)[];
  return required.filter((field) => values[field] === undefined);
}
