import { afterEach, describe, expect, it, vi } from "vitest";
import { getPredictionCells, getRegionalPredictionSummary } from "@/src/lib/predictions";
import { PREDICTION_CACHE_VERSION } from "@/src/lib/model-versions";
import type { PredictionCell } from "@/src/lib/types";

const bounds = { west: 1, south: 41, east: 2, north: 42 };
const cellId = "epsg25831:5000:90:936";

function stubSpatialFeeds(coverage?: number | "unavailable", truncated = false) {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/read-occurrence-support")) {
      return Response.json({
        speciesId: "marasmius-oreades",
        cells: [],
        truncated: false,
        bounds
      });
    }
    return Response.json({
      cells: [{
        cellId,
        regionId: "catalunya-central",
        gridSizeM: 5000,
        bounds: [[1.1, 41.1], [1.15, 41.15]],
        observedAt: "2026-10-11T12:00:00Z",
        source: ["ICGC", "SoilGrids", "Open-Meteo"],
        sourceResolutionM: 9000,
        confidence: "limited",
        stale: false,
        unavailableFields: [],
        values: {
          temperatureAvg24hC: 16,
          temperatureMin24hC: 12,
          temperatureMax24hC: 20,
          temperatureMin7dC: 10,
          frostHours7d: 0,
          relativeHumidityAvg24h: 75,
          soilMoistureAvg24h: 0.24,
          rainfall3dMm: 18,
          rainfall7dMm: 25,
          rainfallPrevious23dMm: 45,
          rainfall30dMm: 70,
          drySpellDays: 0,
          evapotranspiration3dMm: 4,
          evapotranspiration7dMm: 10,
          evapotranspiration30dMm: 45,
          soilMoistureMin7d: 0.22,
          soilMoistureAvg7d: 0.24,
          soilMoistureMax7d: 0.28,
          soilMoistureTrend7d: 0.01,
          altitudeM: 2200,
          ...(coverage === "unavailable"
            ? {}
            : {
                forestCompatibility: (coverage ?? 0) * 100,
                habitatAltitudeSuitability: coverage ? 50 : 0,
              }),
          soilPh: 6.5,
          soilTexture: "franca"
        }
      }],
      truncated,
      bounds
    });
  }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("prediction habitat coverage", () => {
  it("injects the exact compatible 250 m coverage into the habitat factor", async () => {
    stubSpatialFeeds(0.375);

    const result = await getPredictionCells("marasmius-oreades", bounds, 10, 5000);
    const cell = result.cells[0] as PredictionCell;

    expect(cell.values.forestCompatibility).toBe(37.5);
    expect(cell.factors.find((factor) => factor.id === "forest")?.score).toBe(37.5);
    expect(cell.factors.find((factor) => factor.id === "altitude")?.score).toBe(50);
    expect(cell.score).toBeGreaterThan(0);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `predictionVersion=${encodeURIComponent(PREDICTION_CACHE_VERSION)}`,
      ),
      expect.objectContaining({ cache: "force-cache", next: { revalidate: 300 } }),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("versions compact prediction requests at the browser and Supabase cache boundary", async () => {
    stubSpatialFeeds(0.375);

    const result = await getPredictionCells("marasmius-oreades", bounds, 10, 5000, true);

    const environmentRequest = vi.mocked(fetch).mock.calls.find(([input]) =>
      !new URL(String(input)).pathname.endsWith("/read-occurrence-support")
    );
    const url = new URL(String(environmentRequest?.[0]));
    expect(url.searchParams.get("includeHabitat")).toBe("true");
    expect(url.searchParams.get("predictionVersion")).toBe(PREDICTION_CACHE_VERSION);
    expect(url.searchParams.get("viewVersion")).toBe(PREDICTION_CACHE_VERSION);
    expect(result.cells[0]).toMatchObject({ habitatCoverage: 0.375 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("uses the score-only payload and rejects truncated regional reads", async () => {
    stubSpatialFeeds(0.375, true);

    await expect(
      getRegionalPredictionSummary("marasmius-oreades", "catalunya-central"),
    ).rejects.toThrow("Regional prediction response was truncated");

    const environmentRequest = vi.mocked(fetch).mock.calls[0];
    const url = new URL(String(environmentRequest?.[0]));
    expect(url.searchParams.get("view")).toBe("score");
    expect(url.searchParams.get("viewVersion")).toBe(PREDICTION_CACHE_VERSION);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("treats an absent compatible-habitat cell as zero coverage", async () => {
    stubSpatialFeeds();

    const result = await getPredictionCells("marasmius-oreades", bounds, 10, 5000);
    const cell = result.cells[0] as PredictionCell;

    expect(cell.values.forestCompatibility).toBe(0);
    expect(cell.values.habitatAltitudeSuitability).toBe(0);
    expect(cell.score).toBe(0);
  });

  it("reports required rainfall fields that are absent from a legacy snapshot", async () => {
    stubSpatialFeeds(0.375);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/read-occurrence-support")) {
        return Response.json({ speciesId: "marasmius-oreades", cells: [], truncated: false, bounds });
      }
      return Response.json({
        cells: [{
          cellId,
          regionId: "catalunya-central",
          gridSizeM: 5000,
          bounds: [[1.1, 41.1], [1.15, 41.15]],
          observedAt: "2026-10-11T12:00:00Z",
          source: ["Open-Meteo"],
          sourceResolutionM: 9000,
          confidence: "limited",
          stale: false,
          unavailableFields: [],
          values: {
            temperatureAvg24hC: 16,
            relativeHumidityAvg24h: 75,
            soilMoistureAvg24h: 0.24,
            rainfall7dMm: 25,
            altitudeM: 500,
            forestCompatibility: 37.5,
            soilCompatibility: 100,
          },
        }],
        truncated: false,
        bounds,
      });
    });

    const result = await getPredictionCells("marasmius-oreades", bounds, 10, 5000);
    const cell = result.cells[0] as PredictionCell;

    expect(cell.unavailableFields).toEqual(expect.arrayContaining([
      "rainfall3dMm",
      "rainfall30dMm",
      "evapotranspiration30dMm",
      "soilMoistureAvg7d",
    ]));
  });

  it("withholds the score instead of falling back to merged cover labels when coverage is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    stubSpatialFeeds("unavailable");

    const result = await getPredictionCells("marasmius-oreades", bounds, 10, 5000);
    const cell = result.cells[0] as PredictionCell;

    expect(cell.values.forestCompatibility).toBeUndefined();
    expect(cell.values.habitatAltitudeSuitability).toBeUndefined();
    expect(cell.factors.find((factor) => factor.id === "forest")?.score).toBeNull();
    expect(cell.score).toBeNull();
  });
});
