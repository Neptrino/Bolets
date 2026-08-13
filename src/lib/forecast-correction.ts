import type { ConditionSnapshot } from "@/src/lib/types";

type ConditionValues = ConditionSnapshot["values"];
type NumericValueField = {
  [Field in keyof ConditionValues]-?: NonNullable<ConditionValues[Field]> extends number
    ? Field
    : never;
}[keyof ConditionValues];

export const FORECAST_CORRECTION_METHOD = "observed-anomaly-v1" as const;

const requiredCorrectedFields = [
  "temperatureMin10dC",
  "temperatureAvg10dC",
  "temperatureMax10dC",
  "frostHours10d",
  "relativeHumidityAvg24h",
  "soilMoistureAvg24h",
  "soilMoistureMin7d",
  "soilMoistureAvg7d",
  "soilMoistureTrend7d",
  "rainfall3dMm",
  "rainfall7dMm",
  "rainfall30dMm",
  "drySpellDays",
  "evapotranspiration3dMm",
  "evapotranspiration7dMm",
  "evapotranspiration30dMm",
] as const satisfies readonly NumericValueField[];

const optionalCorrectedFields = [
  "temperatureC",
  "temperatureMin24hC",
  "temperatureAvg24hC",
  "temperatureMax24hC",
  "temperatureMin7dC",
  "frostHours7d",
  "relativeHumidity",
  "relativeHumidityMin24h",
  "relativeHumidityMax24h",
  "relativeHumidityAvg7d",
  "soilMoisture",
  "soilMoistureMin24h",
  "soilMoistureMax24h",
  "soilMoistureMax7d",
  "rainfall24hMm",
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
  if (field.startsWith("frostHours")) {
    return [0, field === "frostHours7d" ? 168 : 240];
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
  return field.startsWith("frostHours") ? Math.round(corrected) : corrected;
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
  fields: readonly [NumericValueField, NumericValueField, NumericValueField],
) {
  const first = finiteValue(values, fields[0]);
  const second = finiteValue(values, fields[1]);
  const third = finiteValue(values, fields[2]);
  if (first === undefined || second === undefined || third === undefined) return;
  setNumericValue(values, fields[1], Math.max(first, second));
  setNumericValue(values, fields[2], Math.max(first, second, third));
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

function reconcileFrostWithMinimum(
  values: ConditionValues,
  minimumField: NumericValueField,
  frostField: NumericValueField,
) {
  const minimum = finiteValue(values, minimumField);
  const frostHours = finiteValue(values, frostField);
  if (minimum === undefined || frostHours === undefined) return;
  setNumericValue(values, frostField, minimum > 0 ? 0 : Math.max(1, Math.round(frostHours)));
}

export type ForecastCorrectionState = {
  modelDrySpellDays: number;
  correctedDrySpellDays: number;
};

/**
 * Applies the change forecast by one homogeneous model issuance to the latest
 * observed environmental state. The absolute ECMWF history is therefore used
 * as a change signal, not as a silent replacement for today's AROME history.
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

  enforceIncreasingWindows(values, ["rainfall3dMm", "rainfall7dMm", "rainfall30dMm"]);
  enforceIncreasingWindows(values, [
    "evapotranspiration3dMm",
    "evapotranspiration7dMm",
    "evapotranspiration30dMm",
  ]);
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

  enforceMinAverageMax(values, ["temperatureMin24hC", "temperatureAvg24hC", "temperatureMax24hC"]);
  enforceMinAverageMax(values, ["temperatureMin10dC", "temperatureAvg10dC", "temperatureMax10dC"]);
  enforceMinAverageMax(values, ["relativeHumidityMin24h", "relativeHumidityAvg24h", "relativeHumidityMax24h"]);
  enforceMinAverageMax(values, ["soilMoistureMin24h", "soilMoistureAvg24h", "soilMoistureMax24h"]);
  enforceMinAverageMax(values, ["soilMoistureMin7d", "soilMoistureAvg7d", "soilMoistureMax7d"]);
  reconcileFrostWithMinimum(values, "temperatureMin7dC", "frostHours7d");
  reconcileFrostWithMinimum(values, "temperatureMin10dC", "frostHours10d");

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
