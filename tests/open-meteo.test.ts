import { describe, expect, it } from "vitest";
import {
  configureOpenMeteoForecastRequest,
  configureOpenMeteoRequest,
  normalizeOpenMeteo,
  normalizeOpenMeteoForecast,
  type OpenMeteoLocation,
} from "@/supabase/functions/_shared/open-meteo";

const times = Array.from({ length: 24 }, (_, index) => `2026-08-10T${index.toString().padStart(2, "0")}:00`);

function forecastFixture(generatedAt = "2026-08-10T12:34:00Z") {
  const base = Math.floor(Date.parse(generatedAt) / 3_600_000) * 3600;
  const hourlyTimes = Array.from({ length: 840 }, (_, index) => base - 719 * 3600 + index * 3600);
  const target = base + 24 * 3600;
  const temperature = hourlyTimes.map((time) => time === target ? 17 : 14);
  const atmosphere: OpenMeteoLocation = {
    current: { temperature_2m: 99, relative_humidity_2m: 1 },
    hourly: {
      time: hourlyTimes,
      temperature_2m: temperature,
      relative_humidity_2m: Array(840).fill(76),
      wind_speed_10m: Array(840).fill(7),
      wind_gusts_10m: Array(840).fill(16),
      precipitation: Array(840).fill(0.1),
      et0_fao_evapotranspiration: Array(840).fill(0.05),
    },
  };
  const soil: OpenMeteoLocation = {
    current: { soil_moisture_3_to_9cm: 0.99 },
    hourly: {
      time: hourlyTimes,
      soil_moisture_3_to_9cm: Array(840).fill(0.25),
    },
  };
  return { atmosphere, soil, base, target, hourlyTimes };
}

describe("Open-Meteo profiles", () => {
  it("keeps AROME atmospheric requests separate from coarse soil moisture", () => {
    const atmosphere = new URL("https://api.open-meteo.com/v1/meteofrance");
    configureOpenMeteoRequest(atmosphere, "atmosphere");
    expect(atmosphere.searchParams.get("past_hours")).toBe("720");
    expect(atmosphere.searchParams.get("current")).toContain("temperature_2m");
    expect(atmosphere.searchParams.get("current")).not.toContain("soil_moisture_3_to_9cm");
    expect(atmosphere.searchParams.get("hourly")).toContain("et0_fao_evapotranspiration");

    const soil = new URL("https://api.open-meteo.com/v1/forecast");
    configureOpenMeteoRequest(soil, "soil");
    expect(soil.searchParams.get("past_hours")).toBe("168");
    expect(soil.searchParams.get("current")).toBe("soil_moisture_3_to_9cm");
    expect(soil.searchParams.get("hourly")).toBe("soil_moisture_3_to_9cm");
  });

  it("requests enough UTC-safe hourly data to reach the fifth projection", () => {
    const atmosphere = new URL("https://api.open-meteo.com/v1/ecmwf");
    configureOpenMeteoForecastRequest(atmosphere, "atmosphere");
    expect(atmosphere.searchParams.get("past_hours")).toBe("720");
    expect(atmosphere.searchParams.get("forecast_hours")).toBe("121");
    expect(atmosphere.searchParams.get("timeformat")).toBe("unixtime");
    expect(atmosphere.searchParams.get("models")).toBe("ecmwf_ifs");
    expect(atmosphere.searchParams.get("hourly")).toContain("et0_fao_evapotranspiration");

    const soil = new URL("https://api.open-meteo.com/v1/forecast");
    configureOpenMeteoForecastRequest(soil, "soil");
    expect(soil.searchParams.get("past_hours")).toBe("168");
    expect(soil.searchParams.get("forecast_hours")).toBe("121");
    expect(soil.searchParams.get("hourly")).toBe("soil_moisture_3_to_9cm");
    expect(soil.searchParams.has("models")).toBe(false);
  });

  it("recalculates complete rolling inputs at each of five future target hours", () => {
    const { atmosphere, soil, base } = forecastFixture();
    const forecast = normalizeOpenMeteoForecast(atmosphere, soil, "2026-08-10T12:34:00Z");

    expect(forecast.baseline?.horizonHours).toBe(0);
    expect(Date.parse(forecast.baseline!.validAt) / 1000).toBe(base);
    expect(forecast.baseline?.unavailableFields).toEqual([]);
    expect(forecast.points.map((point) => point.horizonHours)).toEqual([24, 48, 72, 96, 120]);
    expect(forecast.points.map((point) => Date.parse(point.validAt) / 1000)).toEqual(
      [24, 48, 72, 96, 120].map((hours) => base + hours * 3600),
    );
    expect(forecast.points[0].values.temperatureC).toBe(17);
    expect(forecast.points[0].values.temperatureC).not.toBe(99);
    expect(forecast.points[0].values.soilMoisture).toBe(0.25);
    expect(forecast.points[0].values.rainfall24hMm).toBeCloseTo(2.4);
    expect(forecast.points[0].values.rainfall3dMm).toBeCloseTo(7.2);
    expect(forecast.points[0].values.rainfall7dMm).toBeCloseTo(16.8);
    expect(forecast.points[0].values.rainfall30dMm).toBeCloseTo(72);
    expect(forecast.points[0].values.rainfallPrevious23dMm).toBeCloseTo(55.2);
    expect(forecast.points[0].values.evapotranspiration30dMm).toBeCloseTo(36);
    expect(forecast.points[0].values.drySpellDays).toBe(0);
    expect(forecast.points[0].values.soilMoistureTrend7d).toBeCloseTo(0);
    expect(forecast.points.every((point) => point.unavailableFields.length === 0)).toBe(true);
  });

  it("withholds fields whose future hourly series has a gap or duplicate", () => {
    const { atmosphere, soil, target } = forecastFixture();
    const hourly = atmosphere.hourly!;
    (hourly.time as number[]).push(target);
    (hourly.temperature_2m as number[]).push(17);

    const forecast = normalizeOpenMeteoForecast(atmosphere, soil, "2026-08-10T12:34:00Z");

    expect(forecast.points[0].values.temperatureC).toBeUndefined();
    expect(forecast.points[0].values.temperatureAvg24hC).toBeUndefined();
    expect(forecast.points[0].unavailableFields).toContain("temperatureC");
    expect(forecast.points[0].unavailableFields).toContain("temperatureAvg10dC");
  });

  it("keeps exact hourly targets across a Europe/Madrid daylight-saving transition", () => {
    const generatedAt = "2026-03-28T12:34:00Z";
    const { atmosphere, soil, base } = forecastFixture(generatedAt);
    const forecast = normalizeOpenMeteoForecast(atmosphere, soil, generatedAt);

    expect(Date.parse(forecast.points[0].validAt) / 1000).toBe(base + 24 * 3600);
    expect(Date.parse(forecast.points[4].validAt) / 1000).toBe(base + 120 * 3600);
  });

  it("merges high-resolution atmosphere with an independent soil snapshot", () => {
    const atmosphere: OpenMeteoLocation = {
      utc_offset_seconds: 7200,
      current: {
        time: times.at(-1),
        temperature_2m: 16,
        relative_humidity_2m: 74,
        wind_speed_10m: 8,
        wind_gusts_10m: 17
      },
      hourly: {
        time: times,
        temperature_2m: Array(24).fill(14),
        relative_humidity_2m: Array(24).fill(76),
        wind_speed_10m: Array(24).fill(7),
        wind_gusts_10m: Array(24).fill(16),
        precipitation: Array(24).fill(1)
      }
    };
    const soil: OpenMeteoLocation = {
      current: { time: times.at(-1), soil_moisture_3_to_9cm: 0.31 },
      hourly: { time: times, soil_moisture_3_to_9cm: Array(24).fill(0.27) }
    };

    const normalized = normalizeOpenMeteo(atmosphere, soil);
    expect(normalized.values.temperatureC).toBe(16);
    expect(normalized.values.soilMoisture).toBe(0.31);
    expect(normalized.values.soilMoistureAvg24h).toBeCloseTo(0.27);
  });

  it("does not mark intentionally separate soil fields as missing from an atmospheric snapshot", () => {
    const atmosphere: OpenMeteoLocation = {
      utc_offset_seconds: 7200,
      current: { time: times.at(-1), temperature_2m: 16, relative_humidity_2m: 74, wind_speed_10m: 8, wind_gusts_10m: 17 },
      hourly: {
        time: Array.from({ length: 240 }, (_, index) => `2026-08-${(1 + Math.floor(index / 24)).toString().padStart(2, "0")}T${(index % 24).toString().padStart(2, "0")}:00`),
        temperature_2m: Array(240).fill(14), relative_humidity_2m: Array(240).fill(76),
        wind_speed_10m: Array(240).fill(7), wind_gusts_10m: Array(240).fill(16), precipitation: Array(240).fill(0.1)
      }
    };

    const normalized = normalizeOpenMeteo(atmosphere, atmosphere, "atmosphere");
    expect(normalized.values.temperatureMin7dC).toBe(14);
    expect(normalized.values.temperatureMin10dC).toBe(14);
    expect(normalized.values.temperatureAvg10dC).toBe(14);
    expect(normalized.values.temperatureMax10dC).toBe(14);
    expect(normalized.values.relativeHumidityAvg7d).toBe(76);
    expect(normalized.unavailableFields).not.toContain("temperatureAvg10dC");
    expect(normalized.unavailableFields).not.toContain("relativeHumidityAvg7d");
    expect(normalized.unavailableFields).not.toContain("soilMoisture");
  });

  it("normalizes recent rain, antecedent rain, dry-spell, ET0, and seven-day soil memory", () => {
    const hourlyTimes = Array.from({ length: 720 }, (_, index) =>
      new Date(Date.UTC(2026, 6, 1, index)).toISOString().slice(0, 16));
    const atmosphere: OpenMeteoLocation = {
      utc_offset_seconds: 7200,
      current: {
        time: hourlyTimes.at(-1),
        temperature_2m: 16,
        relative_humidity_2m: 74,
        wind_speed_10m: 8,
        wind_gusts_10m: 17,
      },
      hourly: {
        time: hourlyTimes,
        temperature_2m: Array(720).fill(14),
        relative_humidity_2m: Array(720).fill(76),
        wind_speed_10m: Array(720).fill(7),
        wind_gusts_10m: Array(720).fill(16),
        precipitation: [...Array(552).fill(0.1), ...Array(96).fill(0), ...Array(72).fill(0.2)],
        et0_fao_evapotranspiration: Array(720).fill(0.1),
      },
    };
    const soil: OpenMeteoLocation = {
      current: { time: hourlyTimes.at(-1), soil_moisture_3_to_9cm: 0.26 },
      hourly: {
        time: hourlyTimes,
        soil_moisture_3_to_9cm: [...Array(552).fill(0.18), ...Array(144).fill(0.2), ...Array(24).fill(0.26)],
      },
    };

    const normalized = normalizeOpenMeteo(atmosphere, soil);
    expect(normalized.values.rainfall24hMm).toBeCloseTo(4.8);
    expect(normalized.values.rainfall3dMm).toBeCloseTo(14.4);
    expect(normalized.values.rainfall7dMm).toBeCloseTo(14.4);
    expect(normalized.values.rainfallPrevious23dMm).toBeCloseTo(55.2);
    expect(normalized.values.rainfall30dMm).toBeCloseTo(69.6);
    expect(normalized.values.drySpellDays).toBe(0);
    expect(normalized.values.evapotranspiration7dMm).toBeCloseTo(16.8);
    expect(normalized.values.evapotranspiration30dMm).toBeCloseTo(72);
    expect(normalized.values.relativeHumidityAvg7d).toBeCloseTo(76);
    expect(normalized.values.soilMoistureMin7d).toBeCloseTo(0.2);
    expect(normalized.values.soilMoistureAvg7d).toBeCloseTo((144 * 0.2 + 24 * 0.26) / 168);
    expect(normalized.values.soilMoistureTrend7d).toBeCloseTo(0.06);
    expect(normalized.unavailableFields).not.toContain("rainfall30dMm");
    expect(normalized.unavailableFields).not.toContain("soilMoistureTrend7d");
  });
});
