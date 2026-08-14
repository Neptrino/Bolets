import { describe, expect, it } from "vitest";
import {
  aggregateEnvironmentRows,
  type EnvironmentSnapshotRow,
} from "@/supabase/functions/_shared/environment-aggregation";

function row(overrides: Partial<EnvironmentSnapshotRow> = {}): EnvironmentSnapshotRow {
  return {
    observed_at: "2026-08-13T08:00:00Z",
    sources: ["AROME"],
    source_resolution_m: 2500,
    confidence: "high",
    unavailable_fields: [],
    values: {},
    ...overrides,
  };
}

describe("coarse environment history aggregation", () => {
  it("averages hydrothermal conditions while retaining safety-sensitive exposure maxima", () => {
    const aggregate = aggregateEnvironmentRows([
      row({
        values: {
          temperatureAvg7dC: 10,
          temperatureAvg14dC: 11,
          temperatureAvg20dC: 12,
          frostHours14d: 0,
          heatHours14d: 1,
          frostHours20d: 2,
          heatHours20d: 3,
          relativeHumidityAvg24h: 70,
          rainfall24hMm: 4,
          rainfall14dMm: 28,
          rainfallDays14d: 4,
          rainfall21dMm: 42,
          rainfallDays21d: 6,
          rainfall26dMm: 52,
          rainfallDays26d: 8,
          evapotranspiration14dMm: 14,
          evapotranspiration21dMm: 21,
          evapotranspiration26dMm: 26,
          soilMoistureAvg7d: 0.2,
          weatherModel: "AROME",
        },
      }),
      row({
        observed_at: "2026-08-13T09:00:00Z",
        sources: ["AROME", "Open-Meteo soil moisture"],
        source_resolution_m: 9000,
        confidence: "limited",
        unavailable_fields: ["windKmh"],
        values: {
          temperatureAvg7dC: 20,
          temperatureAvg14dC: 21,
          temperatureAvg20dC: 22,
          frostHours14d: 3,
          heatHours14d: 4,
          frostHours20d: 5,
          heatHours20d: 6,
          relativeHumidityAvg24h: 90,
          rainfall24hMm: 8,
          rainfall14dMm: 42,
          rainfallDays14d: 8,
          rainfall21dMm: 63,
          rainfallDays21d: 12,
          rainfall26dMm: 78,
          rainfallDays26d: 16,
          evapotranspiration14dMm: 28,
          evapotranspiration21dMm: 42,
          evapotranspiration26dMm: 52,
          soilMoistureAvg7d: 0.4,
          weatherModel: "AROME",
        },
      }),
    ]);

    expect(aggregate.values).toMatchObject({
      temperatureAvg7dC: 15,
      temperatureAvg14dC: 16,
      temperatureAvg20dC: 17,
      frostHours14d: 3,
      heatHours14d: 4,
      frostHours20d: 5,
      heatHours20d: 6,
      relativeHumidityAvg24h: 80,
      rainfall24hMm: 6,
      rainfall14dMm: 35,
      rainfallDays14d: 6,
      rainfall21dMm: 52.5,
      rainfallDays21d: 9,
      rainfall26dMm: 65,
      rainfallDays26d: 12,
      evapotranspiration14dMm: 21,
      evapotranspiration21dMm: 31.5,
      evapotranspiration26dMm: 39,
      weatherModel: "AROME",
    });
    expect(aggregate.values.soilMoistureAvg7d).toBeCloseTo(0.3);
    expect(aggregate).toMatchObject({
      observedAt: "2026-08-13T09:00:00Z",
      source: ["AROME", "Open-Meteo soil moisture"],
      sourceResolutionM: 9000,
      confidence: "limited",
      unavailableFields: ["windKmh"],
    });
  });

  it("rejects an empty provider set instead of inventing a coarse snapshot", () => {
    expect(() => aggregateEnvironmentRows([])).toThrow(/empty environment row set/i);
  });
});
