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
  "precipitation",
  "et0_fao_evapotranspiration"
];

const soilVariables = ["soil_moisture_3_to_9cm"];

const requiredAtmosphericFields = [
  "temperatureC",
  "temperatureMin24hC",
  "temperatureAvg24hC",
  "temperatureMax24hC",
  "temperatureMin7dC",
  "frostHours7d",
  "temperatureMin10dC",
  "temperatureAvg10dC",
  "temperatureMax10dC",
  "frostHours10d",
  "relativeHumidity",
  "relativeHumidityMin24h",
  "relativeHumidityAvg24h",
  "relativeHumidityMax24h",
  "relativeHumidityAvg7d",
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

export function normalizeOpenMeteo(location: OpenMeteoLocation, soilLocation: OpenMeteoLocation = location, profile: RequestProfile = "complete") {
  const endIndex = lastHourlyIndex(location);
  const soilEndIndex = lastHourlyIndex(soilLocation);
  const temperatures24h = numericWindow(location, "temperature_2m", 24, endIndex);
  const temperatures7d = numericWindow(location, "temperature_2m", 168, endIndex);
  const temperatures10d = numericWindow(location, "temperature_2m", 240, endIndex);
  const humidity24h = numericWindow(location, "relative_humidity_2m", 24, endIndex);
  const humidity7d = numericWindow(location, "relative_humidity_2m", 168, endIndex);
  const soilMoisture24h = numericWindow(soilLocation, "soil_moisture_3_to_9cm", 24, soilEndIndex);
  const soilMoisturePrevious6d = numericWindow(soilLocation, "soil_moisture_3_to_9cm", 144, soilEndIndex - 24);
  const soilMoisture7d = numericWindow(soilLocation, "soil_moisture_3_to_9cm", 168, soilEndIndex);
  const wind24h = numericWindow(location, "wind_speed_10m", 24, endIndex);
  const gusts24h = numericWindow(location, "wind_gusts_10m", 24, endIndex);
  const precipitation3d = numericWindow(location, "precipitation", 72, endIndex);
  const precipitation7d = numericWindow(location, "precipitation", 168, endIndex);
  const precipitation30d = numericWindow(location, "precipitation", 720, endIndex);
  const evapotranspiration3d = numericWindow(location, "et0_fao_evapotranspiration", 72, endIndex);
  const evapotranspiration7d = numericWindow(location, "et0_fao_evapotranspiration", 168, endIndex);
  const evapotranspiration30d = numericWindow(location, "et0_fao_evapotranspiration", 720, endIndex);
  const temperature = summary(temperatures24h, 24);
  const humidity = summary(humidity24h, 24);
  const humidityWeek = summary(humidity7d, 168);
  const soilMoisture = summary(soilMoisture24h, 24);
  const previousSoilMoisture = summary(soilMoisturePrevious6d, 144);
  const soilMoistureWeek = summary(soilMoisture7d, 168);
  const wind = summary(wind24h, 24);
  const gusts = summary(gusts24h, 24);
  const temperature7d = summary(temperatures7d, 168);
  const temperature10d = summary(temperatures10d, 240);
  const hasSevenDays = temperature7d.average !== undefined;
  const hasTenDays = temperature10d.average !== undefined;
  const rainfall3dMm = sum(precipitation3d, 72);
  const rainfall7dMm = sum(precipitation7d, 168);
  const rainfall30dMm = sum(precipitation30d, 720);

  const values = {
    weatherObservedAt: validTime(location),
    temperatureC: finiteNumber(location.current?.temperature_2m),
    temperatureMin24hC: temperature.min,
    temperatureAvg24hC: temperature.average,
    temperatureMax24hC: temperature.max,
    temperatureMin7dC: temperature7d.min,
    frostHours7d: hasSevenDays ? temperatures7d.filter((value) => value <= 0).length : undefined,
    temperatureMin10dC: temperature10d.min,
    temperatureAvg10dC: temperature10d.average,
    temperatureMax10dC: temperature10d.max,
    frostHours10d: hasTenDays ? temperatures10d.filter((value) => value <= 0).length : undefined,
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
    rainfall3dMm,
    rainfall7dMm,
    rainfallPrevious23dMm: rainfall30dMm !== undefined && rainfall7dMm !== undefined
      ? Math.max(0, rainfall30dMm - rainfall7dMm)
      : undefined,
    rainfall30dMm,
    drySpellDays: drySpellDays(precipitation30d),
    evapotranspiration3dMm: sum(evapotranspiration3d, 72),
    evapotranspiration7dMm: sum(evapotranspiration7d, 168),
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
