export const scoringValueFields = new Set([
  "temperatureC", "temperatureAvg7dC", "temperatureAvg14dC", "frostHours14d",
  "heatHours14d", "temperatureAvg20dC", "frostHours20d", "heatHours20d",
  "relativeHumidity", "relativeHumidityAvg24h", "temperatureAvg24hC",
  "relativeHumidityAvg7d",
  "soilMoisture", "soilMoistureAvg24h", "soilMoistureMin7d", "soilMoistureAvg7d",
  "soilMoistureTrend7d", "rainfall3dMm", "rainfall7dMm", "rainfallDays7d",
  "rainfall14dMm", "rainfallDays14d", "rainfall21dMm", "rainfallDays21d",
  "rainfall26dMm", "rainfallDays26d", "rainfallPrevious23dMm", "rainfall30dMm",
  "rainfallDays30d", "drySpellDays", "evapotranspiration3dMm", "evapotranspiration7dMm",
  "evapotranspiration14dMm", "evapotranspiration21dMm", "evapotranspiration26dMm",
  "evapotranspiration30dMm", "altitudeM", "habitatAltitudeSuitability",
  "habitatCoveragePercent",
  "forestTypes", "treeSpecies", "soilPh", "soilTexture", "soilSubstrate",
]);

export function scoringValues(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([field]) => scoringValueFields.has(field)),
  );
}
