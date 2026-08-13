export type EnvironmentConfidence = "high" | "moderate" | "limited" | "unknown";

export type EnvironmentSnapshotRow = {
  observed_at: string;
  sources: string[];
  source_resolution_m: number;
  confidence: EnvironmentConfidence;
  unavailable_fields: string[];
  values: Record<string, unknown>;
};

const averageFields = [
  "weatherGridLatitude",
  "weatherGridLongitude",
  "weatherElevationM",
  "temperatureC",
  "temperatureAvg24hC",
  "temperatureAvg10dC",
  "relativeHumidity",
  "relativeHumidityAvg24h",
  "relativeHumidityAvg7d",
  "rainfall24hMm",
  "rainfall3dMm",
  "rainfall7dMm",
  "rainfallPrevious23dMm",
  "rainfall30dMm",
  "drySpellDays",
  "evapotranspiration3dMm",
  "evapotranspiration7dMm",
  "evapotranspiration30dMm",
  "windKmh",
  "windAvg24hKmh",
  "windGustKmh",
  "soilGridLatitude",
  "soilGridLongitude",
  "soilMoisture",
  "soilMoistureAvg24h",
  "soilMoistureAvg7d",
  "soilMoistureTrend7d",
] as const;

const minimumFields = [
  "temperatureMin24hC",
  "temperatureMin7dC",
  "temperatureMin10dC",
  "relativeHumidityMin24h",
  "soilMoistureMin24h",
  "soilMoistureMin7d",
] as const;

const maximumFields = [
  "atmosphericResolutionM",
  "soilMoistureResolutionM",
  "temperatureMax24hC",
  "temperatureMax10dC",
  "frostHours7d",
  "frostHours10d",
  "relativeHumidityMax24h",
  "soilMoistureMax24h",
  "soilMoistureMax7d",
  "windMax24hKmh",
  "windGustMax24hKmh",
] as const;

function numericValues(rows: EnvironmentSnapshotRow[], field: string) {
  return rows.flatMap((row) => {
    const value = row.values[field];
    return typeof value === "number" && Number.isFinite(value) ? [value] : [];
  });
}

function mode(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort(([leftValue, leftCount], [rightValue, rightCount]) =>
    rightCount - leftCount || leftValue.localeCompare(rightValue))[0]?.[0];
}

function lowestConfidence(rows: EnvironmentSnapshotRow[]): EnvironmentConfidence {
  const confidenceOrder: EnvironmentConfidence[] = ["unknown", "limited", "moderate", "high"];
  return rows.reduce<EnvironmentConfidence>((lowest, row) =>
    confidenceOrder.indexOf(row.confidence) < confidenceOrder.indexOf(lowest)
      ? row.confidence
      : lowest,
  "high");
}

/**
 * Mirrors the coarse current-condition reader: representative values are
 * averaged while safety-sensitive minima and maxima survive aggregation.
 */
export function aggregateEnvironmentRows(rows: EnvironmentSnapshotRow[]) {
  if (!rows.length) throw new Error("Cannot aggregate an empty environment row set");

  const values: Record<string, unknown> = {};
  for (const field of averageFields) {
    const available = numericValues(rows, field);
    if (available.length) {
      const average = available.reduce((total, value) => total + value, 0) / available.length;
      values[field] = field === "weatherElevationM" ? Math.round(average) : average;
    }
  }
  for (const field of minimumFields) {
    const available = numericValues(rows, field);
    if (available.length) values[field] = Math.min(...available);
  }
  for (const field of maximumFields) {
    const available = numericValues(rows, field);
    if (available.length) values[field] = Math.max(...available);
  }

  const weatherObservedAt = rows
    .flatMap((row) => typeof row.values.weatherObservedAt === "string" ? [row.values.weatherObservedAt] : [])
    .sort()
    .at(-1);
  if (weatherObservedAt) values.weatherObservedAt = weatherObservedAt;
  const weatherModel = mode(rows.flatMap((row) =>
    typeof row.values.weatherModel === "string" ? [row.values.weatherModel] : []));
  if (weatherModel) values.weatherModel = weatherModel;

  return {
    observedAt: rows.map((row) => row.observed_at).sort().at(-1)!,
    source: [...new Set(rows.flatMap((row) => row.sources))].sort(),
    sourceResolutionM: Math.max(...rows.map((row) => row.source_resolution_m)),
    confidence: lowestConfidence(rows),
    unavailableFields: [...new Set(rows.flatMap((row) => row.unavailable_fields))].sort(),
    values,
  };
}
