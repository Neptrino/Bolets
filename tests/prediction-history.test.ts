import { afterEach, describe, expect, it, vi } from "vitest";
import { getSpecies } from "@/data/species";
import { getPredictionCellHistory } from "@/src/lib/predictions";
import { calculateSuitability } from "@/src/lib/scoring";
import type { ConditionSnapshot } from "@/src/lib/types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("prediction score history", () => {
  it("never fills missing historical weather with the selected cell's current values", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
    const historicalValues: ConditionSnapshot["values"] = {
      temperatureAvg10dC: 14,
      temperatureMin10dC: 8,
      temperatureMax10dC: 18,
      frostHours10d: 0,
      soilMoistureAvg24h: 0.32,
      rainfall3dMm: 18,
      rainfall7dMm: 25,
      rainfallPrevious23dMm: 45,
      rainfall30dMm: 70,
      drySpellDays: 0,
      evapotranspiration3dMm: 4,
      evapotranspiration7dMm: 10,
      evapotranspiration30dMm: 45,
      soilMoistureMin7d: 0.28,
      soilMoistureAvg7d: 0.32,
      soilMoistureTrend7d: 0.01,
    };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      cellId: "epsg25831:250:1:1",
      regionId: "pirineus",
      snapshots: [{
        observedAt: "2026-10-10T12:00:00Z",
        source: ["test"],
        sourceResolutionM: 2500,
        confidence: "moderate",
        unavailableFields: ["relativeHumidityAvg24h"],
        values: historicalValues,
      }],
    })));

    const habitatValues: ConditionSnapshot["values"] = {
      altitudeM: 1200,
      habitatAltitudeSuitability: 100,
      forestCompatibility: 100,
      soilCompatibility: 100,
    };
    const points = await getPredictionCellHistory("boletus-edulis", {
      cellId: "epsg25831:250:1:1",
      regionId: "pirineus",
      values: {
        ...habitatValues,
        relativeHumidityAvg24h: 20,
        temperatureAvg10dC: 30,
      },
    });
    const expected = calculateSuitability(getSpecies("boletus-edulis")!, {
      regionId: "pirineus",
      observedAt: "2026-10-10T12:00:00Z",
      source: ["test"],
      confidence: "moderate",
      stale: false,
      unavailableFields: ["relativeHumidityAvg24h"],
      values: { ...habitatValues, ...historicalValues },
    });

    expect(points).toEqual([{ observedAt: "2026-10-10T12:00:00Z", score: expected.score }]);
    expect(points[0].score).toBeGreaterThan(50);
  });
});
