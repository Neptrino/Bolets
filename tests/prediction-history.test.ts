import { afterEach, describe, expect, it, vi } from "vitest";
import { getSpecies } from "@/data/species";
import { PREDICTION_CACHE_VERSION } from "@/src/lib/model-versions";
import { getPredictionCellHistory } from "@/src/lib/predictions";
import { calculateSuitability } from "@/src/lib/scoring";
import type { ConditionSnapshot } from "@/src/lib/types";

afterEach(() => {
  vi.useRealTimers();
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
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return Response.json({
        cellId: "epsg25831:2500:1:1",
        regionId: "pirineus",
        snapshots: [{
          observedAt: "2026-10-10T12:00:00Z",
          source: ["test"],
          sourceResolutionM: 2500,
          confidence: "moderate",
          unavailableFields: ["relativeHumidityAvg24h"],
          values: historicalValues,
        }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const habitatValues: ConditionSnapshot["values"] = {
      altitudeM: 1200,
      habitatAltitudeSuitability: 100,
      forestCompatibility: 100,
      soilCompatibility: 100,
    };
    const timeline = await getPredictionCellHistory("boletus-edulis", {
      cellId: "epsg25831:2500:1:1",
      gridSizeM: 2500,
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

    expect(timeline).toEqual({
      observed: [{ observedAt: "2026-10-10T12:00:00Z", score: expected.score }],
      forecast: null,
    });
    expect(timeline.observed[0].score).toBeGreaterThan(50);
    const historyUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(historyUrl.searchParams.get("historyVersion")).toBe(PREDICTION_CACHE_VERSION);
    expect(historyUrl.searchParams.get("resolution")).toBe("2500");
  });

  it("keeps five future scores separate from observations and tapers horizon confidence", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T13:00:00Z"));
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
    const forecastValues: ConditionSnapshot["values"] = {
      temperatureAvg10dC: 14,
      temperatureMin10dC: 8,
      temperatureMax10dC: 18,
      frostHours10d: 0,
      relativeHumidityAvg24h: 78,
      soilMoistureAvg24h: 0.3,
      rainfall3dMm: 18,
      rainfall7dMm: 25,
      rainfallPrevious23dMm: 45,
      rainfall30dMm: 70,
      drySpellDays: 0,
      evapotranspiration3dMm: 4,
      evapotranspiration7dMm: 10,
      evapotranspiration30dMm: 45,
      soilMoistureMin7d: 0.27,
      soilMoistureAvg7d: 0.3,
      soilMoistureTrend7d: 0.01,
    };
    const validTimes = [1, 2, 3, 4, 5].map((day) =>
      new Date(Date.parse("2026-10-10T12:00:00Z") + day * 86_400_000).toISOString());
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      cellId: "epsg25831:250:1:1",
      regionId: "pirineus",
      snapshots: [],
      forecast: {
        generatedAt: "2026-10-10T12:00:00Z",
        snapshots: validTimes.map((validAt, index) => ({
          validAt,
          horizonHours: (index + 1) * 24,
          source: ["ECMWF IFS HRES via Open-Meteo"],
          sourceResolutionM: 9000,
          confidence: "moderate",
          unavailableFields: [],
          values: forecastValues,
        })),
      },
    })));

    const timeline = await getPredictionCellHistory("boletus-edulis", {
      cellId: "epsg25831:250:1:1",
      gridSizeM: 250,
      regionId: "pirineus",
      values: {
        altitudeM: 1200,
        habitatAltitudeSuitability: 100,
        forestCompatibility: 100,
        soilCompatibility: 100,
        // Current dynamic values must never leak into a future snapshot.
        temperatureAvg10dC: 40,
        relativeHumidityAvg24h: 5,
      },
    });

    expect(timeline.observed).toEqual([]);
    expect(timeline.forecast?.generatedAt).toBe("2026-10-10T12:00:00Z");
    expect(timeline.forecast?.sourceResolutionM).toBe(9000);
    expect(timeline.forecast?.points.map((point) => point.validAt)).toEqual(validTimes);
    expect(timeline.forecast?.points.map((point) => point.horizonConfidence)).toEqual([
      "high", "moderate", "moderate", "limited", "limited",
    ]);
    expect(timeline.forecast?.points.every((point) => point.score !== null && point.score > 50)).toBe(true);

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      cellId: "epsg25831:250:1:1",
      regionId: "pirineus",
      snapshots: [],
      forecast: {
        generatedAt: "2026-10-10T12:00:00Z",
        snapshots: validTimes.map((validAt, index) => ({
          validAt,
          horizonHours: (index + 1) * 24,
          source: ["ECMWF IFS HRES via Open-Meteo"],
          sourceResolutionM: 9000,
          confidence: "moderate",
          unavailableFields: index === 0 ? ["windKmh"] : [],
          values: forecastValues,
        })),
      },
    })));
    const incomplete = await getPredictionCellHistory("boletus-edulis", {
      cellId: "epsg25831:250:1:1",
      gridSizeM: 250,
      regionId: "pirineus",
      values: {
        altitudeM: 1200,
        habitatAltitudeSuitability: 100,
        forestCompatibility: 100,
        soilCompatibility: 100,
      },
    });
    expect(incomplete.forecast?.points[0].score).toBeNull();
    expect(incomplete.forecast?.points.slice(1).every((point) => point.score !== null)).toBe(true);
    vi.useRealTimers();
  });

  it("withholds an expired forecast while preserving observed history", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-13T12:00:00Z"));
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      cellId: "epsg25831:250:1:1",
      regionId: "pirineus",
      snapshots: [],
      forecast: {
        generatedAt: "2026-10-10T12:00:00Z",
        snapshots: [1, 2, 3, 4, 5].map((day) => ({
          validAt: new Date(Date.parse("2026-10-10T12:00:00Z") + day * 86_400_000).toISOString(),
          horizonHours: day * 24,
          source: ["test"], sourceResolutionM: 9000, confidence: "moderate",
          unavailableFields: [], values: {},
        })),
      },
    })));

    const timeline = await getPredictionCellHistory("boletus-edulis", {
      cellId: "epsg25831:250:1:1",
      gridSizeM: 250,
      regionId: "pirineus",
      values: { altitudeM: 1200, forestCompatibility: 100, soilCompatibility: 100 },
    });

    expect(timeline.forecast).toBeNull();
    vi.useRealTimers();
  });

  it("withholds a still-recent issuance once its first target is in the past", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T09:00:00Z"));
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      cellId: "epsg25831:250:1:1",
      regionId: "pirineus",
      snapshots: [],
      forecast: {
        generatedAt: "2026-10-10T12:00:00Z",
        snapshots: [1, 2, 3, 4, 5].map((day) => ({
          validAt: new Date(Date.parse("2026-10-10T08:00:00Z") + day * 86_400_000).toISOString(),
          horizonHours: day * 24,
          source: ["test"], sourceResolutionM: 9000, confidence: "moderate",
          unavailableFields: [], values: {},
        })),
      },
    })));

    const timeline = await getPredictionCellHistory("boletus-edulis", {
      cellId: "epsg25831:250:1:1",
      gridSizeM: 250,
      regionId: "pirineus",
      values: { altitudeM: 1200, forestCompatibility: 100, soilCompatibility: 100 },
    });

    expect(timeline.forecast).toBeNull();
    vi.useRealTimers();
  });
});
