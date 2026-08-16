import type { ConditionSnapshot } from "@/src/lib/types";

type ConditionValues = ConditionSnapshot["values"];
type NumericValueField = {
  [Field in keyof ConditionValues]-?: NonNullable<ConditionValues[Field]> extends number
    ? Field
    : never;
}[keyof ConditionValues];

export const FORECAST_CORRECTION_METHOD = "observed-anomaly-v1" as const;

const requiredCorrectedFields = [
  "temperatureAvg7dC",
  "temperatureAvg14dC",
  "temperatureAvg20dC",
  "frostHours14d",
  "heatHours14d",
  "frostHours20d",
  "heatHours20d",
  "relativeHumidityAvg7d",
  "soilMoistureMin7d",
  "soilMoistureAvg7d",
  "rainfall14dMm",
  "rainfallDays14d",
  "rainfall21dMm",
  "rainfallDays21d",
  "rainfall26dMm",
  "rainfallDays26d",
  "drySpellDays",
  "evapotranspiration14dMm",
  "evapotranspiration21dMm",
  "evapotranspiration26dMm",
] as const satisfies readonly NumericValueField[];

const optionalCorrectedFields = [
  "temperatureC",
  "temperatureMin24hC",
  "temperatureAvg24hC",
  "temperatureMax24hC",
  "relativeHumidity",
  "relativeHumidityMin24h",
  "relativeHumidityAvg24h",
  "relativeHumidityMax24h",
  "soilMoisture",
  "soilMoistureMin24h",
  "soilMoistureAvg24h",
  "soilMoistureMax24h",
  "soilMoistureMax7d",
  "soilMoistureTrend7d",
  "rainfall24hMm",
  "rainfall3dMm",
  "rainfall7dMm",
  "rainfallDays7d",
  "rainfall30dMm",
  "rainfallDays30d",
  "evapotranspiration3dMm",
  "evapotranspiration7dMm",
  "evapotranspiration30dMm",
] as const satisfies readonly NumericValueField[];

function finiteValue(values: ConditionValues, field: NumericValueField) {
  const value = values[field];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function fieldBounds(field: NumericValueField): [number, number] {
  if (field.startsWith("relativeHumidity")) return [0, 100];
  if (field.startsWith("soilMoisture")) {
    return field === "soilMoistureTrend7d" ? [-1, 1] : [0, 1];
  }
  if (field.startsWith("frostHours") || field.startsWith("heatHours")) {
    if (field.endsWith("14d")) return [0, 336];
    return [0, 480];
  }
  if (field.startsWith("rainfallDays")) {
    const days = Number(field.match(/\d+/)?.[0]);
    return [0, Number.isFinite(days) ? days : 30];
  }
  if (field === "drySpellDays") return [0, 30];
  if (field.startsWith("rainfall") || field.startsWith("evapotranspiration")) {
    return [0, Number.POSITIVE_INFINITY];
  }
  return [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
}

function anomalyCorrectedValue(
  current: ConditionValues,
  baseline: ConditionValues,
  forecast: ConditionValues,
  field: NumericValueField,
) {
  const currentValue = finiteValue(current, field);
  const baselineValue = finiteValue(baseline, field);
  const forecastValue = finiteValue(forecast, field);
  if (currentValue === undefined || baselineValue === undefined || forecastValue === undefined) {
    return undefined;
  }
  const [minimum, maximum] = fieldBounds(field);
  const corrected = clamp(currentValue + forecastValue - baselineValue, minimum, maximum);
  return field.startsWith("frostHours") || field.startsWith("heatHours")
    ? Math.round(corrected)
    : corrected;
}

function setNumericValue(values: ConditionValues, field: NumericValueField, value: number | undefined) {
  if (value === undefined) {
    delete values[field];
    return;
  }
  Object.assign(values, { [field]: value });
}

function enforceIncreasingWindows(
  values: ConditionValues,
  fields: readonly NumericValueField[],
) {
  let floor: number | undefined;
  for (const field of fields) {
    const value = finiteValue(values, field);
    if (value === undefined) continue;
    floor = floor === undefined ? value : Math.max(floor, value);
    setNumericValue(values, field, floor);
  }
}

function enforceMinAverageMax(
  values: ConditionValues,
  fields: readonly [NumericValueField, NumericValueField, NumericValueField],
) {
  const minimum = finiteValue(values, fields[0]);
  const average = finiteValue(values, fields[1]);
  const maximum = finiteValue(values, fields[2]);
  if (minimum === undefined || average === undefined || maximum === undefined) return;
  setNumericValue(values, fields[0], Math.min(minimum, average));
  setNumericValue(values, fields[2], Math.max(maximum, average));
}

export type ForecastCorrectionState = {
  modelDrySpellDays: number;
  correctedDrySpellDays: number;
};

/**
 * Applies the change from a horizon-zero baseline to the latest observed
 * environmental state. Atmospheric forecast windows already splice AROME
 * history with ECMWF future hours, so the anomaly carries the ageing of real
 * recent events without replacing the cell's higher-resolution observation.
 *
 * These are aggregate anomaly corrections because the pipeline does not retain
 * provider hourly series. Path-dependent dry-spell resets are handled
 * sequentially, and dependent rolling totals are reconciled before scoring.
 */
export function correctForecastValues(
  current: ConditionValues,
  baseline: ConditionValues,
  forecast: ConditionValues,
  previousState: ForecastCorrectionState,
  options: { aggregatePointCount?: number } = {},
) {
  const values: ConditionValues = { ...current };
  const missingFields: string[] = [];

  for (const field of requiredCorrectedFields) {
    if (field === "drySpellDays") continue;
    const corrected = anomalyCorrectedValue(current, baseline, forecast, field);
    setNumericValue(values, field, corrected);
    if (corrected === undefined) missingFields.push(field);
  }
  for (const field of optionalCorrectedFields) {
    setNumericValue(values, field, anomalyCorrectedValue(current, baseline, forecast, field));
  }

  const modelDrySpellDays = finiteValue(forecast, "drySpellDays");
  // An exact provider point has a binary dry-spell reset. At coarse levels the
  // value is a mean across points, so a decrease can represent rain in only a
  // fraction of the cell. Preserve that partial reset as an aggregate anomaly.
  const aggregateDrySpell = (options.aggregatePointCount ?? 1) > 1;
  const drySpellDays = aggregateDrySpell
    ? anomalyCorrectedValue(current, baseline, forecast, "drySpellDays")
    : modelDrySpellDays === undefined
      ? undefined
      : modelDrySpellDays < previousState.modelDrySpellDays
        ? Math.round(clamp(modelDrySpellDays, 0, 30))
        : Math.round(clamp(
            previousState.correctedDrySpellDays + modelDrySpellDays - previousState.modelDrySpellDays,
            0,
            30,
          ));
  setNumericValue(values, "drySpellDays", drySpellDays);
  if (drySpellDays === undefined) missingFields.push("drySpellDays");

  enforceIncreasingWindows(values, [
    "rainfall3dMm",
    "rainfall7dMm",
    "rainfall14dMm",
    "rainfall21dMm",
    "rainfall26dMm",
    "rainfall30dMm",
  ]);
  enforceIncreasingWindows(values, [
    "rainfallDays7d",
    "rainfallDays14d",
    "rainfallDays21d",
    "rainfallDays26d",
    "rainfallDays30d",
  ]);
  enforceIncreasingWindows(values, [
    "evapotranspiration3dMm",
    "evapotranspiration7dMm",
    "evapotranspiration14dMm",
    "evapotranspiration21dMm",
    "evapotranspiration26dMm",
    "evapotranspiration30dMm",
  ]);
  enforceIncreasingWindows(values, ["frostHours14d", "frostHours20d"]);
  enforceIncreasingWindows(values, ["heatHours14d", "heatHours20d"]);
  const rainfall3d = finiteValue(values, "rainfall3dMm");
  const rainfall7d = finiteValue(values, "rainfall7dMm");
  const rainfall30d = finiteValue(values, "rainfall30dMm");
  const rainfall24h = finiteValue(values, "rainfall24hMm");
  if (rainfall24h !== undefined && rainfall3d !== undefined) {
    values.rainfall24hMm = Math.min(rainfall24h, rainfall3d);
  }
  values.rainfallPrevious23dMm = rainfall7d === undefined || rainfall30d === undefined
    ? undefined
    : Math.max(0, rainfall30d - rainfall7d);

  enforceMinAverageMax(values, ["relativeHumidityMin24h", "relativeHumidityAvg24h", "relativeHumidityMax24h"]);
  enforceMinAverageMax(values, ["temperatureMin24hC", "temperatureAvg24hC", "temperatureMax24hC"]);
  enforceMinAverageMax(values, ["soilMoistureMin24h", "soilMoistureAvg24h", "soilMoistureMax24h"]);
  enforceMinAverageMax(values, ["soilMoistureMin7d", "soilMoistureAvg7d", "soilMoistureMax7d"]);

  values.weatherObservedAt = forecast.weatherObservedAt;
  values.weatherModel = forecast.weatherModel;
  values.atmosphericResolutionM = forecast.atmosphericResolutionM;
  values.soilMoistureResolutionM = forecast.soilMoistureResolutionM;
  values.weatherGridLatitude = forecast.weatherGridLatitude;
  values.weatherGridLongitude = forecast.weatherGridLongitude;
  values.weatherElevationM = forecast.weatherElevationM;
  values.soilGridLatitude = forecast.soilGridLatitude;
  values.soilGridLongitude = forecast.soilGridLongitude;

  return {
    values,
    unavailableFields: [...new Set(missingFields)],
    state: modelDrySpellDays === undefined || drySpellDays === undefined
      ? previousState
      : { modelDrySpellDays, correctedDrySpellDays: drySpellDays },
  };
}
