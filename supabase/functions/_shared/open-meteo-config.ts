import type { RequestProfile } from "./open-meteo-core.ts";

const atmosphericCurrentVariables = [
  "temperature_2m",
  "relative_humidity_2m",
  "wind_speed_10m",
  "wind_gusts_10m"
];

export const atmosphericHourlyVariables = [
  "temperature_2m",
  "relative_humidity_2m",
  "wind_speed_10m",
  "wind_gusts_10m",
  "precipitation",
  "et0_fao_evapotranspiration"
];

const soilVariables = ["soil_moisture_3_to_9cm"];

export const ROLLING_ATMOSPHERE_HISTORY_HOURS = 720;
export const ROLLING_PROVIDER_OVERLAP_HOURS = 72;
export const ROLLING_SEAMLESS_VARIABLES = ["precipitation"] as const;

export const requiredAtmosphericFields = [
  "temperatureC",
  "temperatureAvg7dC",
  "temperatureAvg14dC",
  "frostHours14d",
  "heatHours14d",
  "temperatureAvg20dC",
  "frostHours20d",
  "heatHours20d",
  "relativeHumidity",
  "relativeHumidityMin24h",
  "relativeHumidityAvg24h",
  "relativeHumidityMax24h",
  "relativeHumidityAvg7d",
  "rainfall24hMm",
  "rainfall3dMm",
  "rainfall7dMm",
  "rainfallDays7d",
  "rainfall14dMm",
  "rainfallDays14d",
  "rainfall21dMm",
  "rainfallDays21d",
  "rainfall26dMm",
  "rainfallDays26d",
  "rainfallPrevious23dMm",
  "rainfall30dMm",
  "rainfallDays30d",
  "drySpellDays",
  "evapotranspiration3dMm",
  "evapotranspiration7dMm",
  "evapotranspiration14dMm",
  "evapotranspiration21dMm",
  "evapotranspiration26dMm",
  "evapotranspiration30dMm",
  "windKmh",
  "windAvg24hKmh",
  "windMax24hKmh",
  "windGustMax24hKmh"
] as const;

export const requiredSoilFields = [
  "soilMoisture",
  "soilMoistureMin24h",
  "soilMoistureAvg24h",
  "soilMoistureMax24h",
  "soilMoistureMin7d",
  "soilMoistureAvg7d",
  "soilMoistureMax7d",
  "soilMoistureTrend7d"
] as const;

export function configureOpenMeteoRequest(url: URL, profile: RequestProfile = "complete") {
  const currentVariables = profile === "atmosphere"
    ? atmosphericCurrentVariables
    : profile === "soil"
      ? soilVariables
      : [...atmosphericCurrentVariables, ...soilVariables];
  const hourlyVariables = profile === "atmosphere"
    ? atmosphericHourlyVariables
    : profile === "soil"
      ? soilVariables
      : [...atmosphericHourlyVariables, ...soilVariables];
  url.searchParams.set("past_hours", profile === "soil" ? "168" : "720");
  url.searchParams.set("forecast_hours", "1");
  url.searchParams.set("current", currentVariables.join(","));
  url.searchParams.set("hourly", hourlyVariables.join(","));
  url.searchParams.set("timezone", "Europe/Madrid");
}

/**
 * The observed spatial stream persists its complete 30-day hourly history in
 * Postgres. Normal requests therefore need only a three-day overlap, which is
 * enough to repair two missed daily runs while remaining in Open-Meteo's
 * unweighted (at most two-week) quota tier. A missing or stale state
 * bootstraps the full window.
 * Current values are derived from the last complete hourly sample so the same
 * variables are not charged twice.
 */
export function configureOpenMeteoRollingAtmosphereRequest(url: URL, bootstrap: boolean) {
  url.searchParams.set(
    "past_hours",
    String(bootstrap ? ROLLING_ATMOSPHERE_HISTORY_HOURS : ROLLING_PROVIDER_OVERLAP_HOURS),
  );
  url.searchParams.set("forecast_hours", "1");
  url.searchParams.set("hourly", atmosphericHourlyVariables.join(","));
  url.searchParams.set("models", "arome_france");
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("timeformat", "unixtime");
}

export function configureOpenMeteoRollingSeamlessPrecipitationRequest(
  url: URL,
  bootstrap: boolean,
) {
  url.searchParams.set(
    "past_hours",
    String(bootstrap ? ROLLING_ATMOSPHERE_HISTORY_HOURS : ROLLING_PROVIDER_OVERLAP_HOURS),
  );
  url.searchParams.set("forecast_hours", "1");
  url.searchParams.set("hourly", ROLLING_SEAMLESS_VARIABLES.join(","));
  url.searchParams.set("models", "meteofrance_seamless");
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("timeformat", "unixtime");
}

export function configureOpenMeteoForecastRequest(url: URL, profile: "atmosphere" | "soil") {
  const hourlyVariables = profile === "atmosphere"
    ? atmosphericHourlyVariables
    : soilVariables;
  // Keep one extra day beyond the longest trailing window. Forecast-provider
  // model boundaries can omit part of the nominal first historical day; the
  // overlap keeps the horizon-zero 7-day soil and 30-day drought windows
  // complete without shortening either calculation.
  url.searchParams.set("past_hours", profile === "soil" ? "192" : "744");
  // Open-Meteo includes the base hour in this count. 121 samples therefore
  // reach the exact +120 h target used by the fifth daily projection.
  url.searchParams.set("forecast_hours", "121");
  url.searchParams.set("hourly", hourlyVariables.join(","));
  if (profile === "atmosphere") {
    // The ECMWF endpoint otherwise defaults to its coarser 0.25-degree model.
    // Pin the full-resolution IFS HRES feed so the stored 9 km provenance is exact.
    url.searchParams.set("models", "ecmwf_ifs");
  }
  url.searchParams.set("timezone", "Europe/Madrid");
  // Epoch timestamps keep atmosphere and soil aligned across DST changes.
  url.searchParams.set("timeformat", "unixtime");
}

/**
 * Past precipitation for the observed spatial stream. The 2026-08 station
 * sweep showed AROME precipitation is the least trustworthy event-level
 * choice (missed summer storms, phantom autumn ones), while the seamless
 * Météo-France blend tracked gauges closest; thermal fields stay on AROME.
 * The request mirrors configureOpenMeteoRequest's window and timezone so the
 * hourly axis aligns index-for-index with the AROME response.
 */
export function configureOpenMeteoSeamlessPrecipitationRequest(url: URL) {
  url.searchParams.set("past_hours", "720");
  url.searchParams.set("forecast_hours", "1");
  url.searchParams.set("hourly", "precipitation");
  url.searchParams.set("models", "meteofrance_seamless");
  url.searchParams.set("timezone", "Europe/Madrid");
}

/**
 * Fetches the verified atmospheric history that precedes an ECMWF forecast.
 * Forecast windows splice this AROME history with ECMWF future hours so old
 * heat, frost, rain, and drying events age out instead of inheriting ECMWF's
 * different retrospective analysis.
 */
export function configureOpenMeteoForecastHistoryRequest(url: URL) {
  url.searchParams.set("past_hours", "744");
  url.searchParams.set("forecast_hours", "1");
  url.searchParams.set("hourly", atmosphericHourlyVariables.join(","));
  url.searchParams.set("models", "arome_france");
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("timeformat", "unixtime");
}

/**
 * Requests enough operational history to rebuild a snapshot at an earlier
 * valid hour without reading any provider value after that target. The extra
 * day absorbs provider boundary differences while the normalizer still
 * requires every exact hourly sample in the configured trailing window.
 */
export function configureOpenMeteoHistoricalRequest(
  url: URL,
  profile: "atmosphere" | "soil",
  targetAt: string,
  referenceAt = new Date().toISOString(),
) {
  const targetMilliseconds = Date.parse(targetAt);
  const referenceMilliseconds = Date.parse(referenceAt);
  if (!Number.isFinite(targetMilliseconds) || !Number.isFinite(referenceMilliseconds)) {
    throw new Error("Historical Open-Meteo request requires valid target and reference timestamps");
  }
  const ageHours = Math.max(0, Math.ceil((referenceMilliseconds - targetMilliseconds) / 3_600_000));
  const trailingHours = profile === "soil" ? 168 : 720;
  url.searchParams.set("past_hours", String(trailingHours + ageHours + 24));
  url.searchParams.set("forecast_hours", "1");
  url.searchParams.set(
    "hourly",
    (profile === "atmosphere" ? atmosphericHourlyVariables : soilVariables).join(","),
  );
  url.searchParams.set("timezone", "Europe/Madrid");
  url.searchParams.set("timeformat", "unixtime");
}

/**
 * Replays the same AROME grid at one selected cell's terrain elevation.
 * This changes the provider's statistical elevation correction, not the
 * atmospheric model's native horizontal resolution.
 */
export function configureOpenMeteoTerrainThermalRequest(
  url: URL,
  targetAt: string,
  elevationM: number,
  referenceAt = new Date().toISOString(),
) {
  if (!Number.isFinite(elevationM) || elevationM < -100 || elevationM > 5000) {
    throw new RangeError("Terrain thermal elevation is outside the supported range");
  }
  configureOpenMeteoHistoricalRequest(url, "atmosphere", targetAt, referenceAt);
  url.searchParams.set("models", "arome_france");
  url.searchParams.set("elevation", String(elevationM));
}

