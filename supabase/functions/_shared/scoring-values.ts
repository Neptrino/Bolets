export const scoringValueFields = new Set([
  "temperatureC", "temperatureMin24hC", "temperatureAvg24hC", "temperatureMax24hC",
  "temperatureMin7dC", "frostHours7d", "temperatureMin10dC", "temperatureAvg10dC",
  "temperatureMax10dC", "frostHours10d", "relativeHumidity", "relativeHumidityAvg24h",
  "relativeHumidityAvg7d",
  "soilMoisture", "soilMoistureAvg24h", "soilMoistureMin7d", "soilMoistureAvg7d",
  "soilMoistureTrend7d", "rainfall3dMm", "rainfall7dMm", "rainfallPrevious23dMm",
  "rainfall30dMm", "drySpellDays", "evapotranspiration3dMm", "evapotranspiration7dMm",
  "evapotranspiration30dMm", "altitudeM", "habitatAltitudeSuitability",
  "forestCompatibility", "soilCompatibility",
  "forestTypes", "treeSpecies", "soilPh", "soilTexture", "soilSubstrate",
]);

export function scoringValues(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([field]) => scoringValueFields.has(field)),
  );
}
