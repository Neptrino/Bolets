export type OpenMeteoLocation = {
  latitude?: number;
  longitude?: number;
  elevation?: number;
  utc_offset_seconds?: number;
  current?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
};

export type RequestProfile = "complete" | "atmosphere" | "soil";

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
  "precipitation"
];

const soilVariables = ["soil_moisture_3_to_9cm"];

const requiredAtmosphericFields = [
  "temperatureC",
  "temperatureMin24hC",
  "temperatureAvg24hC",
  "temperatureMax24hC",
  "temperatureMin7dC",
  "frostHours7d",
  "relativeHumidity",
  "relativeHumidityMin24h",
  "relativeHumidityAvg24h",
  "relativeHumidityMax24h",
  "rainfall7dMm",
  "windKmh",
  "windAvg24hKmh",
  "windMax24hKmh",
  "windGustMax24hKmh"
] as const;

const requiredSoilFields = [
  "soilMoisture",
  "soilMoistureMin24h",
  "soilMoistureAvg24h",
  "soilMoistureMax24h"
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
      : [...atmosphericHourlyVariables.slice(0, 4), ...soilVariables, "precipitation"];
  url.searchParams.set("past_hours", "168");
  url.searchParams.set("forecast_hours", "1");
  url.searchParams.set("current", currentVariables.join(","));
  url.searchParams.set("hourly", hourlyVariables.join(","));
  url.searchParams.set("timezone", "Europe/Madrid");
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

export function normalizeOpenMeteo(location: OpenMeteoLocation, soilLocation: OpenMeteoLocation = location, profile: RequestProfile = "complete") {
  const endIndex = lastHourlyIndex(location);
  const soilEndIndex = lastHourlyIndex(soilLocation);
  const temperatures24h = numericWindow(location, "temperature_2m", 24, endIndex);
  const temperatures7d = numericWindow(location, "temperature_2m", 168, endIndex);
  const humidity24h = numericWindow(location, "relative_humidity_2m", 24, endIndex);
  const soilMoisture24h = numericWindow(soilLocation, "soil_moisture_3_to_9cm", 24, soilEndIndex);
  const wind24h = numericWindow(location, "wind_speed_10m", 24, endIndex);
  const gusts24h = numericWindow(location, "wind_gusts_10m", 24, endIndex);
  const precipitation7d = numericWindow(location, "precipitation", 168, endIndex);
  const temperature = summary(temperatures24h, 24);
  const humidity = summary(humidity24h, 24);
  const soilMoisture = summary(soilMoisture24h, 24);
  const wind = summary(wind24h, 24);
  const gusts = summary(gusts24h, 24);
  const hasSevenDays = temperatures7d.length >= 126;
  const hasRainfallWindow = precipitation7d.length >= 126;

  const values = {
    weatherObservedAt: validTime(location),
    temperatureC: finiteNumber(location.current?.temperature_2m),
    temperatureMin24hC: temperature.min,
    temperatureAvg24hC: temperature.average,
    temperatureMax24hC: temperature.max,
    temperatureMin7dC: hasSevenDays ? Math.min(...temperatures7d) : undefined,
    frostHours7d: hasSevenDays ? temperatures7d.filter((value) => value <= 0).length : undefined,
    relativeHumidity: finiteNumber(location.current?.relative_humidity_2m),
    relativeHumidityMin24h: humidity.min,
    relativeHumidityAvg24h: humidity.average,
    relativeHumidityMax24h: humidity.max,
    soilMoisture: finiteNumber(soilLocation.current?.soil_moisture_3_to_9cm),
    soilMoistureMin24h: soilMoisture.min,
    soilMoistureAvg24h: soilMoisture.average,
    soilMoistureMax24h: soilMoisture.max,
    rainfall7dMm: hasRainfallWindow ? precipitation7d.reduce((total, value) => total + value, 0) : undefined,
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
