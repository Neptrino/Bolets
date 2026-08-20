import { afterEach, describe, expect, it, vi } from "vitest";
import { getPredictionCells, getRegionalPredictionSummary } from "@/src/lib/predictions";
import { PREDICTION_CACHE_VERSION } from "@/src/lib/model-versions";
import { getSpecies } from "@/data/species";
import { habitatProfileKey } from "@/src/lib/habitat";
import type { ConditionSnapshot, PredictionCell } from "@/src/lib/types";

const bounds = { west: 1, south: 41, east: 2, north: 42 };
const cellId = "epsg25831:5000:90:936";
const completeHydrothermalValues: ConditionSnapshot["values"] = {
  temperatureAvg7dC: 11,
  temperatureAvg14dC: 11,
  frostHours14d: 0,
  heatHours14d: 0,
  relativeHumidityAvg7d: 90,
  soilMoistureMin7d: 0.225,
  soilMoistureAvg7d: 0.24,
  rainfall14dMm: 30,
  rainfallDays14d: 4,
  evapotranspiration14dMm: 5,
  // Matured rain: the trailing week is subtracted from the window.
  rainfall7dMm: 0,
  rainfallDays7d: 0,
  evapotranspiration7dMm: 0,
  drySpellDays: 0,
  soilTexture: "franca",
};

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
    if (url.searchParams.get("includeHabitat") === "all") {
      const species = getSpecies("marasmius-oreades")!;
      const habitatCoverage = coverage === "unavailable" ? 0 : coverage ?? 0;
      return Response.json({
        cells: [{
          cellId,
          regionId: "catalunya-central",
          gridSizeM: 10000,
          bounds: [[1.1, 41.1], [1.2, 41.2]],
          observedAt: "2026-10-11T12:00:00Z",
          source: ["ICGC", "SoilGrids", "Open-Meteo"],
          sourceResolutionM: 9000,
          confidence: "limited",
          stale: false,
          unavailableFields: [],
          values: { ...completeHydrothermalValues, altitudeM: 900, soilPh: 6.5 },
          habitatCoverages: [habitatCoverage],
          habitatWeightedCoverages: [habitatCoverage * 0.5],
        }],
        truncated,
        bounds,
        habitatProfiles: [{
          speciesId: species.speciesId,
          slot: 1,
          profileKey: habitatProfileKey(species),
          complete: true,
        }],
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
          ...completeHydrothermalValues,
          altitudeM: 2200,
          ...(coverage === "unavailable"
            ? {}
            : {
                habitatCoveragePercent: (coverage ?? 0) * 100,
                habitatAltitudeSuitability: coverage ? 50 : 0,
              }),
          soilPh: 6.5,
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

    expect(cell.values.habitatCoveragePercent).toBe(37.5);
    expect(cell.components.find((component) => component.id === "habitatCoverage")?.score)
      .toBe(38);
    expect(cell.components.find((component) => component.id === "altitude")?.score).toBe(50);
    expect(cell.fruitingConditionsScore).toBeGreaterThan(0);
    expect(cell.score).toBe(cell.opportunityIndex);
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

    expect(cell.values.habitatCoveragePercent).toBe(0);
    expect(cell.values.habitatAltitudeSuitability).toBe(0);
    expect(cell.fruitingConditionsScore).toBeGreaterThan(0);
    expect(cell.opportunityIndex).toBe(0);
    expect(cell.score).toBe(0);
  });

  it("reports exact hydrothermal fields omitted from an incomplete snapshot", async () => {
    stubSpatialFeeds(0.375);
    const fetchMock = vi.mocked(fetch);
    const incompleteValues: ConditionSnapshot["values"] = {
      ...completeHydrothermalValues,
      altitudeM: 500,
      habitatCoveragePercent: 37.5,
      habitatAltitudeSuitability: 50,
    };
    delete incompleteValues.rainfall14dMm;
    delete incompleteValues.rainfallDays14d;
    delete incompleteValues.evapotranspiration14dMm;
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
          values: incompleteValues,
        }],
        truncated: false,
        bounds,
      });
    });

    const result = await getPredictionCells("marasmius-oreades", bounds, 10, 5000);
    const cell = result.cells[0] as PredictionCell;

    expect(cell.unavailableFields).toEqual(expect.arrayContaining([
      "rainfall14dMm",
      "rainfallDays14d",
      "evapotranspiration14dMm",
    ]));
    expect(cell.fruitingConditionsScore).toBeNull();
    expect(cell.opportunityIndex).toBeNull();
  });

  it("withholds the score instead of falling back to merged cover labels when coverage is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    stubSpatialFeeds("unavailable");

    const result = await getPredictionCells("marasmius-oreades", bounds, 10, 5000);
    const cell = result.cells[0] as PredictionCell;

    expect(cell.values.habitatCoveragePercent).toBeUndefined();
    expect(cell.values.habitatAltitudeSuitability).toBeUndefined();
    expect(cell.components.find((component) => component.id === "habitatCoverage")?.score)
      .toBeNull();
    expect(cell.fruitingConditionsScore).toBeNull();
    expect(cell.opportunityIndex).toBeNull();
    expect(cell.score).toBeNull();
  });
});
