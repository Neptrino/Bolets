import { describe, expect, it } from "vitest";
import { configureOpenMeteoRequest, normalizeOpenMeteo, type OpenMeteoLocation } from "@/supabase/functions/_shared/open-meteo";

const times = Array.from({ length: 24 }, (_, index) => `2026-08-10T${index.toString().padStart(2, "0")}:00`);

describe("Open-Meteo profiles", () => {
  it("keeps AROME atmospheric requests separate from coarse soil moisture", () => {
    const atmosphere = new URL("https://api.open-meteo.com/v1/meteofrance");
    configureOpenMeteoRequest(atmosphere, "atmosphere");
    expect(atmosphere.searchParams.get("current")).toContain("temperature_2m");
    expect(atmosphere.searchParams.get("current")).not.toContain("soil_moisture_3_to_9cm");

    const soil = new URL("https://api.open-meteo.com/v1/forecast");
    configureOpenMeteoRequest(soil, "soil");
    expect(soil.searchParams.get("current")).toBe("soil_moisture_3_to_9cm");
    expect(soil.searchParams.get("hourly")).toBe("soil_moisture_3_to_9cm");
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
        time: Array.from({ length: 168 }, (_, index) => `2026-08-${(4 + Math.floor(index / 24)).toString().padStart(2, "0")}T${(index % 24).toString().padStart(2, "0")}:00`),
        temperature_2m: Array(168).fill(14), relative_humidity_2m: Array(168).fill(76),
        wind_speed_10m: Array(168).fill(7), wind_gusts_10m: Array(168).fill(16), precipitation: Array(168).fill(0.1)
      }
    };

    const normalized = normalizeOpenMeteo(atmosphere, atmosphere, "atmosphere");
    expect(normalized.unavailableFields).not.toContain("soilMoisture");
  });
});
