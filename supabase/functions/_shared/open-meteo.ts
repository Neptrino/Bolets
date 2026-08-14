export type OpenMeteoLocation = {
  latitude?: number;
  longitude?: number;
  elevation?: number;
  utc_offset_seconds?: number;
  current?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
};

export type RequestProfile = "complete" | "atmosphere" | "soil";

export const FORECAST_HORIZON_HOURS = [24, 48, 72, 96, 120] as const;
export const FORECAST_BASELINE_HOURS = 0 as const;
const FORECAST_OUTPUT_HOURS = [FORECAST_BASELINE_HOURS, ...FORECAST_HORIZON_HOURS] as const;
// Portable hydrothermal-v1 thresholds. Species vary the decay/half-life of
// these exposures in the scorer, while ingestion keeps one stable contract.
export const RAINFALL_DAY_THRESHOLD_MM = 1;
export const HEAT_HOUR_THRESHOLD_C = 27;

const finiteNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function fetchOpenMeteoLocations(url: URL, context: string, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": "Bolets-Atles/1.0" } });
    if (response.ok) {
      const payload = await response.json() as OpenMeteoLocation | OpenMeteoLocation[];
      return Array.isArray(payload) ? payload : [payload];
    }
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === attempts) throw new Error(`Open-Meteo ${context} request returned ${response.status}`);
    const retryAfterSeconds = Number(response.headers.get("retry-after"));
    await wait(Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.min(retryAfterSeconds * 1000, 15_000)
      : attempt * 1500);
  }
  throw new Error(`Open-Meteo ${context} request failed`);
}

const atmosphericCurrentVariables = [
  "temperature_2m",
  "relative_humidity_2m",
  "wind_speed_10m",
  "wind_gusts_10m"
];

const atmosphericHourlyVariables = [
  "temperature_2m",
  "relative_humidity_2m",
  "wind_speed_10m",
  "wind_gusts_10m",
  "precipitation",
  "et0_fao_evapotranspiration"
];

const soilVariables = ["soil_moisture_3_to_9cm"];

const requiredAtmosphericFields = [
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

const requiredSoilFields = [
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

function validTime(location: OpenMeteoLocation) {
  const localTime = typeof location.current?.time === "string" ? location.current.time : undefined;
  const offsetSeconds = finiteNumber(location.utc_offset_seconds);
  if (!localTime || offsetSeconds === undefined) return undefined;
  const sign = offsetSeconds < 0 ? "-" : "+";
  const absoluteMinutes = Math.abs(offsetSeconds) / 60;
  const hours = Math.floor(absoluteMinutes / 60).toString().padStart(2, "0");
  const minutes = Math.floor(absoluteMinutes % 60).toString().padStart(2, "0");
  return `${localTime}${sign}${hours}:${minutes}`;
}

function lastHourlyIndex(location: OpenMeteoLocation) {
  const times = Array.isArray(location.hourly?.time) ? location.hourly.time : [];
  const currentTime = typeof location.current?.time === "string" ? location.current.time : undefined;
  if (!times.length) return -1;
  if (!currentTime) return times.length - 1;
  for (let index = times.length - 1; index >= 0; index -= 1) {
    if (typeof times[index] === "string" && times[index] <= currentTime) return index;
  }
  return -1;
}

function numericWindow(location: OpenMeteoLocation, key: string, hours: number, endIndex: number) {
  const source = Array.isArray(location.hourly?.[key]) ? location.hourly[key] as unknown[] : [];
  if (endIndex < 0 || !source.length) return [];
  return source
    .slice(Math.max(0, endIndex - hours + 1), endIndex + 1)
    .map(finiteNumber)
    .filter((value): value is number => value !== undefined);
}

function summary(values: number[], expectedHours: number) {
  if (values.length < Math.floor(expectedHours * .75)) return {};
  return {
    min: Math.min(...values),
    average: values.reduce((total, value) => total + value, 0) / values.length,
    max: Math.max(...values)
  };
}

function sum(values: number[], expectedHours: number) {
  if (values.length < Math.floor(expectedHours * .75)) return undefined;
  return values.reduce((total, value) => total + value, 0);
}

function thresholdHours(
  values: number[],
  expectedHours: number,
  matches: (value: number) => boolean,
) {
  if (values.length !== expectedHours) return undefined;
  return values.filter(matches).length;
}

function drySpellDays(precipitation30d: number[]) {
  if (precipitation30d.length < 540) return undefined;
  let dryDays = 0;
  for (let end = precipitation30d.length; end > 0 && dryDays < 30; end -= 24) {
    const start = Math.max(0, end - 24);
    const dailyTotal = precipitation30d
      .slice(start, end)
      .reduce((total, value) => total + value, 0);
    // Less than 1 mm per rolling 24 h does not reset the dry-spell memory.
    if (dailyTotal >= 1) break;
    dryDays += 1;
  }
  return dryDays;
}

function rainfallDays(precipitation: number[], days: number) {
  const expectedHours = days * 24;
  if (precipitation.length !== expectedHours) return undefined;
  // Consecutive trailing 24-hour bins end at the snapshot's valid hour; no bin
  // contains provider values later than the score or forecast valid time.
  let count = 0;
  for (let start = 0; start < expectedHours; start += 24) {
    const dailyTotal = precipitation
      .slice(start, start + 24)
      .reduce((total, value) => total + value, 0);
    if (dailyTotal >= RAINFALL_DAY_THRESHOLD_MM) count += 1;
  }
  return count;
}

export function normalizeOpenMeteo(location: OpenMeteoLocation, soilLocation: OpenMeteoLocation = location, profile: RequestProfile = "complete") {
  const endIndex = lastHourlyIndex(location);
  const soilEndIndex = lastHourlyIndex(soilLocation);
  const temperatures7d = numericWindow(location, "temperature_2m", 168, endIndex);
  const temperatures14d = numericWindow(location, "temperature_2m", 336, endIndex);
  const temperatures20d = numericWindow(location, "temperature_2m", 480, endIndex);
  const humidity24h = numericWindow(location, "relative_humidity_2m", 24, endIndex);
  const humidity7d = numericWindow(location, "relative_humidity_2m", 168, endIndex);
  const soilMoisture24h = numericWindow(soilLocation, "soil_moisture_3_to_9cm", 24, soilEndIndex);
  const soilMoisturePrevious6d = numericWindow(soilLocation, "soil_moisture_3_to_9cm", 144, soilEndIndex - 24);
  const soilMoisture7d = numericWindow(soilLocation, "soil_moisture_3_to_9cm", 168, soilEndIndex);
  const wind24h = numericWindow(location, "wind_speed_10m", 24, endIndex);
  const gusts24h = numericWindow(location, "wind_gusts_10m", 24, endIndex);
  const precipitation24h = numericWindow(location, "precipitation", 24, endIndex);
  const precipitation3d = numericWindow(location, "precipitation", 72, endIndex);
  const precipitation7d = numericWindow(location, "precipitation", 168, endIndex);
  const precipitation14d = numericWindow(location, "precipitation", 336, endIndex);
  const precipitation21d = numericWindow(location, "precipitation", 504, endIndex);
  const precipitation26d = numericWindow(location, "precipitation", 624, endIndex);
  const precipitation30d = numericWindow(location, "precipitation", 720, endIndex);
  const evapotranspiration3d = numericWindow(location, "et0_fao_evapotranspiration", 72, endIndex);
  const evapotranspiration7d = numericWindow(location, "et0_fao_evapotranspiration", 168, endIndex);
  const evapotranspiration14d = numericWindow(location, "et0_fao_evapotranspiration", 336, endIndex);
  const evapotranspiration21d = numericWindow(location, "et0_fao_evapotranspiration", 504, endIndex);
  const evapotranspiration26d = numericWindow(location, "et0_fao_evapotranspiration", 624, endIndex);
  const evapotranspiration30d = numericWindow(location, "et0_fao_evapotranspiration", 720, endIndex);
  const humidity = summary(humidity24h, 24);
  const humidityWeek = summary(humidity7d, 168);
  const soilMoisture = summary(soilMoisture24h, 24);
  const previousSoilMoisture = summary(soilMoisturePrevious6d, 144);
  const soilMoistureWeek = summary(soilMoisture7d, 168);
  const wind = summary(wind24h, 24);
  const gusts = summary(gusts24h, 24);
  const temperature7d = summary(temperatures7d, 168);
  const temperature14d = summary(temperatures14d, 336);
  const temperature20d = summary(temperatures20d, 480);
  const rainfall24hMm = sum(precipitation24h, 24);
  const rainfall3dMm = sum(precipitation3d, 72);
  const rainfall7dMm = sum(precipitation7d, 168);
  const rainfall14dMm = sum(precipitation14d, 336);
  const rainfall21dMm = sum(precipitation21d, 504);
  const rainfall26dMm = sum(precipitation26d, 624);
  const rainfall30dMm = sum(precipitation30d, 720);

  const values = {
    weatherObservedAt: validTime(location),
    temperatureC: finiteNumber(location.current?.temperature_2m),
    temperatureAvg7dC: temperature7d.average,
    temperatureAvg14dC: temperature14d.average,
    frostHours14d: thresholdHours(temperatures14d, 336, (value) => value <= 0),
    heatHours14d: thresholdHours(
      temperatures14d,
      336,
      (value) => value >= HEAT_HOUR_THRESHOLD_C,
    ),
    temperatureAvg20dC: temperature20d.average,
    frostHours20d: thresholdHours(temperatures20d, 480, (value) => value <= 0),
    heatHours20d: thresholdHours(
      temperatures20d,
      480,
      (value) => value >= HEAT_HOUR_THRESHOLD_C,
    ),
    relativeHumidity: finiteNumber(location.current?.relative_humidity_2m),
    relativeHumidityMin24h: humidity.min,
    relativeHumidityAvg24h: humidity.average,
    relativeHumidityMax24h: humidity.max,
    relativeHumidityAvg7d: humidityWeek.average,
    soilMoisture: finiteNumber(soilLocation.current?.soil_moisture_3_to_9cm),
    soilMoistureMin24h: soilMoisture.min,
    soilMoistureAvg24h: soilMoisture.average,
    soilMoistureMax24h: soilMoisture.max,
    soilMoistureMin7d: soilMoistureWeek.min,
    soilMoistureAvg7d: soilMoistureWeek.average,
    soilMoistureMax7d: soilMoistureWeek.max,
    soilMoistureTrend7d: soilMoisture.average !== undefined && previousSoilMoisture.average !== undefined
      ? soilMoisture.average - previousSoilMoisture.average
      : undefined,
    rainfall24hMm,
    rainfall3dMm,
    rainfall7dMm,
    rainfallDays7d: rainfallDays(precipitation7d, 7),
    rainfall14dMm,
    rainfallDays14d: rainfallDays(precipitation14d, 14),
    rainfall21dMm,
    rainfallDays21d: rainfallDays(precipitation21d, 21),
    rainfall26dMm,
    rainfallDays26d: rainfallDays(precipitation26d, 26),
    rainfallPrevious23dMm: rainfall30dMm !== undefined && rainfall7dMm !== undefined
      ? Math.max(0, rainfall30dMm - rainfall7dMm)
      : undefined,
    rainfall30dMm,
    rainfallDays30d: rainfallDays(precipitation30d, 30),
    drySpellDays: drySpellDays(precipitation30d),
    evapotranspiration3dMm: sum(evapotranspiration3d, 72),
    evapotranspiration7dMm: sum(evapotranspiration7d, 168),
    evapotranspiration14dMm: sum(evapotranspiration14d, 336),
    evapotranspiration21dMm: sum(evapotranspiration21d, 504),
    evapotranspiration26dMm: sum(evapotranspiration26d, 624),
    evapotranspiration30dMm: sum(evapotranspiration30d, 720),
    windKmh: finiteNumber(location.current?.wind_speed_10m),
    windAvg24hKmh: wind.average,
    windMax24hKmh: wind.max,
    windGustKmh: finiteNumber(location.current?.wind_gusts_10m),
    windGustMax24hKmh: gusts.max
  };

  return {
    values,
    unavailableFields: [
      ...(profile === "soil" ? [] : requiredAtmosphericFields),
      ...(profile === "atmosphere" ? [] : requiredSoilFields)
    ].filter((field) => values[field] === undefined)
  };
}

type HourlySeries = Map<number, number>;

function epochSecond(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string" || !/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) return undefined;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : undefined;
}

function hourlySeries(location: OpenMeteoLocation, key: string): HourlySeries {
  const times = Array.isArray(location.hourly?.time) ? location.hourly.time : [];
  const source = Array.isArray(location.hourly?.[key]) ? location.hourly[key] as unknown[] : [];
  const values = new Map<number, number>();
  const seenTimes = new Set<number>();
  const duplicates = new Set<number>();
  for (let index = 0; index < Math.min(times.length, source.length); index += 1) {
    const time = epochSecond(times[index]);
    if (time === undefined) continue;
    if (seenTimes.has(time)) duplicates.add(time);
    seenTimes.add(time);
    const value = finiteNumber(source[index]);
    if (value === undefined) continue;
    values.set(time, value);
  }
  for (const time of duplicates) values.delete(time);
  return values;
}

function forecastAtmosphericSeries(
  forecast: OpenMeteoLocation,
  key: string,
  history?: OpenMeteoLocation,
  cutover?: number,
) {
  const future = hourlySeries(forecast, key);
  if (!history || cutover === undefined) return future;

  const combined = new Map<number, number>();
  for (const [time, value] of hourlySeries(history, key)) {
    if (time <= cutover) combined.set(time, value);
  }
  for (const [time, value] of future) {
    if (time > cutover) combined.set(time, value);
  }
  return combined;
}

function completeWindow(series: HourlySeries, target: number, hours: number) {
  const values: number[] = [];
  for (let time = target - (hours - 1) * 3600; time <= target; time += 3600) {
    const value = series.get(time);
    if (value === undefined) return undefined;
    values.push(value);
  }
  return values;
}

function completeSummary(series: HourlySeries, target: number, hours: number) {
  const values = completeWindow(series, target, hours);
  if (!values) return {};
  return {
    min: Math.min(...values),
    average: values.reduce((total, value) => total + value, 0) / values.length,
    max: Math.max(...values),
    values,
  };
}

function completeSum(series: HourlySeries, target: number, hours: number) {
  const values = completeWindow(series, target, hours);
  return values?.reduce((total, value) => total + value, 0);
}

function projectedDrySpellDays(series: HourlySeries, target: number) {
  const values = completeWindow(series, target, 720);
  if (!values) return undefined;
  return drySpellDays(values);
}

function projectedRainfallDays(series: HourlySeries, target: number, days: number) {
  const values = completeWindow(series, target, days * 24);
  return values ? rainfallDays(values, days) : undefined;
}

function projectedSoilTrend(series: HourlySeries, target: number) {
  const recent = completeWindow(series, target, 24);
  const previous = completeWindow(series, target - 24 * 3600, 144);
  if (!recent || !previous) return undefined;
  const average = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
  return average(recent) - average(previous);
}

function normalizedValuesAtTarget(
  atmosphere: OpenMeteoLocation,
  soil: OpenMeteoLocation,
  target: number,
  historicalAtmosphere?: OpenMeteoLocation,
  atmosphericCutover?: number,
) {
  const atmosphericSeries = (key: string) => forecastAtmosphericSeries(
    atmosphere,
    key,
    historicalAtmosphere,
    atmosphericCutover,
  );
  const temperature = atmosphericSeries("temperature_2m");
  const humidity = atmosphericSeries("relative_humidity_2m");
  const wind = atmosphericSeries("wind_speed_10m");
  const gusts = atmosphericSeries("wind_gusts_10m");
  const precipitation = atmosphericSeries("precipitation");
  const evapotranspiration = atmosphericSeries("et0_fao_evapotranspiration");
  const soilMoisture = hourlySeries(soil, "soil_moisture_3_to_9cm");
  const temperature7d = completeSummary(temperature, target, 168);
  const temperature14d = completeSummary(temperature, target, 336);
  const temperature20d = completeSummary(temperature, target, 480);
  const humidity24h = completeSummary(humidity, target, 24);
  const humidity7d = completeSummary(humidity, target, 168);
  const soil24h = completeSummary(soilMoisture, target, 24);
  const soil7d = completeSummary(soilMoisture, target, 168);
  const wind24h = completeSummary(wind, target, 24);
  const gust24h = completeSummary(gusts, target, 24);
  const rainfall24hMm = completeSum(precipitation, target, 24);
  const rainfall3dMm = completeSum(precipitation, target, 72);
  const rainfall7dMm = completeSum(precipitation, target, 168);
  const rainfall14dMm = completeSum(precipitation, target, 336);
  const rainfall21dMm = completeSum(precipitation, target, 504);
  const rainfall26dMm = completeSum(precipitation, target, 624);
  const rainfall30dMm = completeSum(precipitation, target, 720);
  return {
    weatherObservedAt: new Date(target * 1000).toISOString(),
    temperatureC: temperature.get(target),
    temperatureAvg7dC: temperature7d.average,
    temperatureAvg14dC: temperature14d.average,
    frostHours14d: temperature14d.values?.filter((value) => value <= 0).length,
    heatHours14d: temperature14d.values?.filter((value) => value >= HEAT_HOUR_THRESHOLD_C).length,
    temperatureAvg20dC: temperature20d.average,
    frostHours20d: temperature20d.values?.filter((value) => value <= 0).length,
    heatHours20d: temperature20d.values?.filter((value) => value >= HEAT_HOUR_THRESHOLD_C).length,
    relativeHumidity: humidity.get(target),
    relativeHumidityMin24h: humidity24h.min,
    relativeHumidityAvg24h: humidity24h.average,
    relativeHumidityMax24h: humidity24h.max,
    relativeHumidityAvg7d: humidity7d.average,
    soilMoisture: soilMoisture.get(target),
    soilMoistureMin24h: soil24h.min,
    soilMoistureAvg24h: soil24h.average,
    soilMoistureMax24h: soil24h.max,
    soilMoistureMin7d: soil7d.min,
    soilMoistureAvg7d: soil7d.average,
    soilMoistureMax7d: soil7d.max,
    soilMoistureTrend7d: projectedSoilTrend(soilMoisture, target),
    rainfall24hMm,
    rainfall3dMm,
    rainfall7dMm,
    rainfallDays7d: projectedRainfallDays(precipitation, target, 7),
    rainfall14dMm,
    rainfallDays14d: projectedRainfallDays(precipitation, target, 14),
    rainfall21dMm,
    rainfallDays21d: projectedRainfallDays(precipitation, target, 21),
    rainfall26dMm,
    rainfallDays26d: projectedRainfallDays(precipitation, target, 26),
    rainfallPrevious23dMm: rainfall30dMm !== undefined && rainfall7dMm !== undefined
      ? Math.max(0, rainfall30dMm - rainfall7dMm)
      : undefined,
    rainfall30dMm,
    rainfallDays30d: projectedRainfallDays(precipitation, target, 30),
    drySpellDays: projectedDrySpellDays(precipitation, target),
    evapotranspiration3dMm: completeSum(evapotranspiration, target, 72),
    evapotranspiration7dMm: completeSum(evapotranspiration, target, 168),
    evapotranspiration14dMm: completeSum(evapotranspiration, target, 336),
    evapotranspiration21dMm: completeSum(evapotranspiration, target, 504),
    evapotranspiration26dMm: completeSum(evapotranspiration, target, 624),
    evapotranspiration30dMm: completeSum(evapotranspiration, target, 720),
    windKmh: wind.get(target),
    windAvg24hKmh: wind24h.average,
    windMax24hKmh: wind24h.max,
    windGustKmh: gusts.get(target),
    windGustMax24hKmh: gust24h.max,
  };
}

/** Rebuilds one historical provider snapshot at its original valid hour. */
export function normalizeOpenMeteoAt(
  location: OpenMeteoLocation,
  targetAt: string,
  profile: "atmosphere" | "soil",
) {
  const targetMilliseconds = Date.parse(targetAt);
  if (!Number.isFinite(targetMilliseconds)) throw new Error("Historical snapshot target is invalid");
  const target = Math.floor(targetMilliseconds / 3_600_000) * 3600;
  const values = profile === "atmosphere"
    ? normalizedValuesAtTarget(location, {}, target)
    : normalizedValuesAtTarget({}, location, target);
  const required = profile === "atmosphere" ? requiredAtmosphericFields : requiredSoilFields;
  return {
    values,
    unavailableFields: required.filter((field) => values[field] === undefined),
  };
}

export type OpenMeteoForecastPoint = {
  validAt: string;
  horizonHours: typeof FORECAST_OUTPUT_HOURS[number];
  unavailableFields: string[];
  values: Record<string, number | string | undefined>;
};

/**
 * Builds daily future snapshots from one forecast issuance. Every rolling
 * value is recalculated at its future valid hour. Missing or duplicated hours
 * make the affected field unavailable instead of silently shortening a window.
 */
export function normalizeOpenMeteoForecast(
  atmosphere: OpenMeteoLocation,
  soil: OpenMeteoLocation,
  generatedAt: string,
  historicalAtmosphere?: OpenMeteoLocation,
) {
  const temperature = hourlySeries(atmosphere, "temperature_2m");
  const humidity = hourlySeries(atmosphere, "relative_humidity_2m");
  const wind = hourlySeries(atmosphere, "wind_speed_10m");
  const gusts = hourlySeries(atmosphere, "wind_gusts_10m");
  const precipitation = hourlySeries(atmosphere, "precipitation");
  const evapotranspiration = hourlySeries(atmosphere, "et0_fao_evapotranspiration");
  const soilMoisture = hourlySeries(soil, "soil_moisture_3_to_9cm");
  const historicalSeries = historicalAtmosphere
    ? atmosphericHourlyVariables.map((key) => hourlySeries(historicalAtmosphere, key))
    : [];
  const requiredSeries = [
    temperature,
    humidity,
    wind,
    gusts,
    precipitation,
    evapotranspiration,
    soilMoisture,
    ...historicalSeries,
  ];
  const generatedAtSeconds = Math.floor(Date.parse(generatedAt) / 3_600_000) * 3600;
  let baseHour: number | undefined;
  for (let candidate = generatedAtSeconds; candidate >= generatedAtSeconds - 6 * 3600; candidate -= 3600) {
    if (requiredSeries.every((series) => series.has(candidate))) {
      baseHour = candidate;
      break;
    }
  }
  if (baseHour === undefined) {
    return {
      generatedAt,
      baseline: undefined,
      points: [] as OpenMeteoForecastPoint[],
    };
  }

  const output = FORECAST_OUTPUT_HOURS.map((horizonHours) => {
    const target = baseHour! + horizonHours * 3600;
    const values = normalizedValuesAtTarget(
      atmosphere,
      soil,
      target,
      historicalAtmosphere,
      baseHour,
    );
    return {
      validAt: values.weatherObservedAt,
      horizonHours,
      unavailableFields: [...requiredAtmosphericFields, ...requiredSoilFields]
        .filter((field) => values[field] === undefined),
      values,
    } satisfies OpenMeteoForecastPoint;
  });

  const [baseline, ...points] = output;
  return { generatedAt, baseline, points };
}
