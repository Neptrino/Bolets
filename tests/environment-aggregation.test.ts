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
  it("averages representative conditions while retaining safety-sensitive extremes", () => {
    const aggregate = aggregateEnvironmentRows([
      row({
        values: {
          temperatureAvg10dC: 10,
          temperatureMin10dC: 4,
          temperatureMax10dC: 16,
          frostHours10d: 0,
          relativeHumidityAvg24h: 70,
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
          temperatureAvg10dC: 20,
          temperatureMin10dC: -2,
          temperatureMax10dC: 31,
          frostHours10d: 3,
          relativeHumidityAvg24h: 90,
          soilMoistureAvg7d: 0.4,
          weatherModel: "AROME",
        },
      }),
    ]);

    expect(aggregate.values).toMatchObject({
      temperatureAvg10dC: 15,
      temperatureMin10dC: -2,
      temperatureMax10dC: 31,
      frostHours10d: 3,
      relativeHumidityAvg24h: 80,
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
