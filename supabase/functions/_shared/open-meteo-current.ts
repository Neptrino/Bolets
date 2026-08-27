import {
  HEAT_HOUR_THRESHOLD_C,
  RAINFALL_DAY_THRESHOLD_MM,
  finiteNumber,
  type OpenMeteoLocation,
  type RequestProfile,
} from "./open-meteo-core.ts";
import {
  requiredAtmosphericFields,
  requiredSoilFields,
} from "./open-meteo-config.ts";

function validTime(location: OpenMeteoLocation) {
  const rawTime = location.current?.time;
  if (typeof rawTime === "number" && Number.isInteger(rawTime)) {
    return new Date(rawTime * 1000).toISOString();
  }
  const localTime = typeof rawTime === "string" ? rawTime : undefined;
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
  const currentTime = location.current?.time;
  if (!times.length) return -1;
  if (typeof currentTime !== "string" && typeof currentTime !== "number") return times.length - 1;
  for (let index = times.length - 1; index >= 0; index -= 1) {
    if (
      (typeof currentTime === "number" && typeof times[index] === "number" && times[index] <= currentTime) ||
      (typeof currentTime === "string" && typeof times[index] === "string" && times[index] <= currentTime)
    ) return index;
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

export function drySpellDays(precipitation30d: number[]) {
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

export function rainfallDays(precipitation: number[], days: number) {
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
  const temperature24hWindow = numericWindow(location, "temperature_2m", 24, endIndex);
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
  const temperatureDay = summary(temperature24hWindow, 24);
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
    temperatureMin24hC: temperatureDay.min,
    temperatureAvg24hC: temperatureDay.average,
    temperatureMax24hC: temperatureDay.max,
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

