import {
  FORECAST_OUTPUT_HOURS,
  HEAT_HOUR_THRESHOLD_C,
  type OpenMeteoLocation,
} from "./open-meteo-core.ts";
import {
  atmosphericHourlyVariables,
  requiredAtmosphericFields,
  requiredSoilFields,
} from "./open-meteo-config.ts";
import {
  completeSum,
  completeSummary,
  forecastAtmosphericSeries,
  hourlySeries,
  projectedDrySpellDays,
  projectedRainfallDays,
  projectedSoilTrend,
} from "./open-meteo-series.ts";

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
  const temperature24h = completeSummary(temperature, target, 24);
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
    temperatureMin24hC: temperature24h.min,
    temperatureAvg24hC: temperature24h.average,
    temperatureMax24hC: temperature24h.max,
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
