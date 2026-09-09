import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getGlobalCellRanking,
  getGlobalPredictionCells,
  globalCandidateSpecies,
} from "@/src/lib/global-predictions";
import { habitatProfileKey } from "@/src/lib/habitat";
import { coverageWeightedScore } from "@/src/lib/coarse-cell-summary";
import { getPredictionCells } from "@/src/lib/predictions";
import type { ConditionSnapshot, PredictionCell, PredictionMapCell } from "@/src/lib/types";

const bucket = { west: 1.5, south: 42, east: 2, north: 42.5 };
const parentId = "epsg25831:5000:79:936";
const otherParentId = "epsg25831:5000:80:936";
const parentBounds = [[1.6, 42.2], [1.65, 42.25]];
const baseValues: ConditionSnapshot["values"] = {
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
  rainfall7dMm: 0,
  rainfallDays7d: 0,
  evapotranspiration7dMm: 0,
  drySpellDays: 0,
  soilTexture: "franca",
  altitudeM: 1200,
  soilPh: 6.5,
  habitatCoveragePercent: 60,
  habitatAltitudeSuitability: 100,
  // Windows the wider edible catalogue scores on, so no combined candidate
  // withholds for a missing dynamic field.
  temperatureC: 11,
  temperatureAvg20dC: 11,
  frostHours20d: 0,
  heatHours20d: 0,
  soilMoisture: 0.26,
  rainfall21dMm: 40,
  rainfallDays21d: 5,
  evapotranspiration21dMm: 8,
  rainfall26dMm: 48,
  rainfallDays26d: 6,
  evapotranspiration26dMm: 10,
};

function habitatProfiles() {
  return globalCandidateSpecies.map((species, index) => ({
    speciesId: species.speciesId,
    slot: index + 1,
    profileKey: habitatProfileKey(species),
    complete: true,
  }));
}

/** Every candidate sees the same habitat, so conditions alone rank the cells. */
function combinedCoverages() {
  return {
    habitatCoverages: globalCandidateSpecies.map(() => 0.6),
    habitatWeightedCoverages: globalCandidateSpecies.map(() => 0.6),
  };
}

function environmentCell(cellId: string, gridSizeM: number, bounds: number[][], values: Partial<ConditionSnapshot["values"]>) {
  return {
    cellId,
    regionId: "pirineus",
    gridSizeM,
    bounds,
    observedAt: "2026-09-09T06:00:00Z",
    source: ["ICGC", "SoilGrids", "Open-Meteo"],
    sourceResolutionM: 2500,
    confidence: "moderate",
    stale: false,
    unavailableFields: [],
    values: { ...baseValues, ...values },
  };
}

/**
 * The coarse cell carries a blended environment whose safety extremes come
 * from its coldest corner; its children are read on their own.
 */
function stubSpatialFeeds() {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/read-occurrence-support")) {
      return Response.json({ speciesId: "lactarius-deliciosus", cells: [], truncated: false, bounds: bucket });
    }
    const resolution = url.searchParams.get("resolution");
    const combined = url.searchParams.get("includeHabitat") === "all";
    const withHabitat = (cell: ReturnType<typeof environmentCell>) =>
      combined ? { ...cell, ...combinedCoverages() } : cell;
    const profiles = combined ? { habitatProfiles: habitatProfiles() } : {};
    if (resolution === "5000") {
      return Response.json({
        cells: [
          withHabitat(environmentCell(parentId, 5000, parentBounds, { frostHours14d: 120, frostHours20d: 120, rainfall14dMm: 12 })),
          withHabitat(environmentCell(otherParentId, 5000, [[1.7, 42.2], [1.75, 42.25]], { frostHours14d: 120, frostHours20d: 120 })),
        ],
        truncated: false,
        bounds: bucket,
        ...profiles,
      });
    }
    if (resolution === "2500") {
      return Response.json({
        cells: [
          withHabitat(environmentCell("epsg25831:2500:158:1872", 2500, [[1.6, 42.2], [1.625, 42.225]], { rainfall14dMm: 12 })),
          withHabitat(environmentCell("epsg25831:2500:158:1873", 2500, [[1.6, 42.225], [1.625, 42.25]], {})),
          withHabitat(environmentCell("epsg25831:2500:159:1873", 2500, [[1.625, 42.225], [1.65, 42.25]], { frostHours14d: 120, frostHours20d: 120 })),
        ],
        truncated: false,
        bounds: bucket,
        ...profiles,
      });
    }
    throw new Error(`Unexpected resolution ${resolution}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("coarse prediction cells summarise their best 2.5 km sector", () => {
  it("colours a compact 5 km cell with the coverage-weighted mean of its children", async () => {
    const fetchMock = stubSpatialFeeds();
    const children = await getPredictionCells("lactarius-deliciosus", bucket, 1000, 2500, true);
    const expected = coverageWeightedScore(children.cells as PredictionMapCell[]);
    const bestChild = Math.max(...children.cells.map((cell) => cell.score ?? -1));
    fetchMock.mockClear();

    const result = await getPredictionCells("lactarius-deliciosus", bucket, 1000, 5000, true);
    const parent = result.cells.find((cell) => cell.cellId === parentId) as PredictionMapCell;
    const orphan = result.cells.find((cell) => cell.cellId === otherParentId) as PredictionMapCell;

    expect(bestChild).toBeGreaterThan(0);
    expect(parent.score).toBe(expected);
    expect(parent.score).toBeLessThan(bestChild);
    expect(parent.gridSizeM).toBe(5000);
    expect(parent.cellBounds).toEqual(parentBounds);
    // A coarse cell with no scored children keeps its own blended reading.
    expect(orphan.score).not.toBeNull();
    // One coarse read plus one 2.5 km read for the same half-degree bucket.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives a detailed 5 km cell its best child's reading while keeping its identity", async () => {
    stubSpatialFeeds();
    const children = await getPredictionCells("lactarius-deliciosus", bucket, 1000, 2500, false);
    const best = [...children.cells as PredictionCell[]].sort((left, right) => (right.score ?? -1) - (left.score ?? -1))[0];

    const result = await getPredictionCells("lactarius-deliciosus", bucket, 16, 5000, false);
    const parent = result.cells.find((cell) => cell.cellId === parentId) as PredictionCell;

    expect(best.cellId.startsWith("epsg25831:2500:158:")).toBe(true);
    expect(parent.cellId).toBe(parentId);
    expect(parent.gridSizeM).toBe(5000);
    expect(parent.cellBounds).toEqual(parentBounds);
    expect(parent.score).toBe(best.score);
    expect(parent.components).toEqual(best.components);
    expect(parent.values).toEqual(best.values);
    expect(parent.summarisedFrom).toEqual({
      cellId: best.cellId,
      gridSizeM: 2500,
      cellBounds: best.cellBounds,
    });
  });

  it("leaves 2.5 km and finer reads untouched", async () => {
    const fetchMock = stubSpatialFeeds();
    const result = await getPredictionCells("lactarius-deliciosus", bucket, 1000, 2500, true);
    expect(result.cells).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("colours a combined 5 km cell with its children's weighted mean and the best child's species", async () => {
    const fetchMock = stubSpatialFeeds();
    const children = await getGlobalPredictionCells(bucket, 1000, 2500);
    const best = [...children.cells].sort((left, right) => (right.score ?? -1) - (left.score ?? -1))[0];
    const expected = coverageWeightedScore(children.cells);
    fetchMock.mockClear();

    const result = await getGlobalPredictionCells(bucket, 1000, 5000);
    const parent = result.cells.find((cell) => cell.cellId === parentId)!;

    expect(best.cellId.startsWith("epsg25831:2500:158:")).toBe(true);
    expect(best.score).toBeGreaterThan(0);
    expect(parent.score).toBe(expected);
    expect(parent.topSpeciesId).toBe(best.topSpeciesId);
    expect(parent.gridSizeM).toBe(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ranks a combined 5 km cell's species from its best child", async () => {
    stubSpatialFeeds();
    const children = await getGlobalPredictionCells(bucket, 1000, 2500);
    const best = [...children.cells].sort((left, right) => (right.score ?? -1) - (left.score ?? -1))[0];
    const childRanking = await getGlobalCellRanking(best.cellId, bucket, 2500);
    const ranking = await getGlobalCellRanking(parentId, bucket, 5000);

    expect(ranking?.mapCell.cellId).toBe(parentId);
    expect(ranking?.mapCell.score).toBe(childRanking?.mapCell.score);
    expect(ranking?.ranking).toEqual(childRanking?.ranking);
  });
});
