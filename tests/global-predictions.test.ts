import { afterEach, describe, expect, it, vi } from "vitest";
import { cataloniaSpatialBounds } from "@/data/regions";
import {
  GLOBAL_SPECIES_ID,
  bestRegionalSuitability,
  getCandidatePredictionCells,
  getGlobalCellRanking,
  getGlobalPredictionCells,
  globalCandidateSpecies,
  globalSpeciesSetKey,
  isGlobalGridSize,
  rankGlobalSpeciesScores,
  resolveCandidateSlots,
} from "@/src/lib/global-predictions";
import { habitatProfileKey } from "@/src/lib/habitat";
import { bucketsForBounds } from "@/src/lib/map-query";
import { calculateSuitability } from "@/src/lib/scoring";
import { toxicSpecies } from "@/src/lib/species-collections";
import type { ConditionSnapshot, SuitabilityResult } from "@/src/lib/types";

const bounds = { west: 1, south: 41, east: 2, north: 42 };
const cellId = "epsg25831:5000:90:936";

// Complete inputs for every hydrothermal window used across the catalogue so
// no candidate withholds for a missing dynamic field.
const completeValues: ConditionSnapshot["values"] = {
  temperatureC: 12,
  temperatureAvg7dC: 12,
  temperatureAvg14dC: 12,
  temperatureAvg20dC: 12,
  frostHours14d: 0,
  frostHours20d: 0,
  heatHours14d: 0,
  heatHours20d: 0,
  relativeHumidityAvg7d: 88,
  soilMoisture: 0.26,
  soilMoistureMin7d: 0.24,
  soilMoistureAvg7d: 0.26,
  rainfall14dMm: 38,
  rainfallDays14d: 5,
  evapotranspiration14dMm: 9,
  rainfall21dMm: 55,
  rainfallDays21d: 7,
  evapotranspiration21dMm: 14,
  rainfall26dMm: 66,
  rainfallDays26d: 8,
  evapotranspiration26dMm: 17,
  // Matured rain: the trailing week is subtracted from the window.
  rainfall7dMm: 0,
  rainfallDays7d: 0,
  evapotranspiration7dMm: 0,
  drySpellDays: 1,
  soilTexture: "franca",
  altitudeM: 900,
};

const observedAt = "2026-10-11T12:00:00Z";

function habitatProfiles() {
  return globalCandidateSpecies.map((species, index) => ({
    speciesId: species.speciesId,
    slot: index + 1,
    profileKey: habitatProfileKey(species),
    complete: true,
  }));
}

function environmentCell(overrides: Record<string, unknown> = {}) {
  return {
    cellId,
    regionId: "catalunya-central",
    gridSizeM: 5000,
    bounds: [[1.1, 41.1], [1.15, 41.15]],
    observedAt,
    source: ["ICGC", "SoilGrids", "Open-Meteo"],
    sourceResolutionM: 9000,
    confidence: "limited",
    stale: false,
    unavailableFields: [],
    values: completeValues,
    ...overrides,
  };
}

function stubGlobalFeed(payload: Record<string, unknown>) {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    void input;
    return Response.json(payload);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("global candidate set", () => {
  it("only includes edible species with a live fruiting model", () => {
    expect(globalCandidateSpecies.length).toBeGreaterThan(20);
    const candidateIds = new Set(globalCandidateSpecies.map((species) => species.speciesId));
    expect(candidateIds.has("tuber-melanosporum")).toBe(false);
    for (const toxic of toxicSpecies) {
      expect(candidateIds.has(toxic.speciesId)).toBe(false);
    }
    for (const species of globalCandidateSpecies) {
      expect(species.predictionMode).toBe("current");
    }
  });

  it("derives a stable set key from the candidate profiles", () => {
    expect(globalSpeciesSetKey).toMatch(/^[a-z0-9]+$/);
  });

  it("restricts the combined map to coarse grids", () => {
    expect(isGlobalGridSize(250)).toBe(false);
    expect(isGlobalGridSize(1000)).toBe(true);
    expect(isGlobalGridSize(10000)).toBe(true);
  });
});

describe("resolveCandidateSlots", () => {
  it("maps every candidate to its cache slot", () => {
    const slots = resolveCandidateSlots(habitatProfiles());
    expect(slots).toHaveLength(globalCandidateSpecies.length);
    expect(slots[0]).toMatchObject({ slot: 1 });
  });

  it("fails loudly when a candidate profile is missing", () => {
    expect(() => resolveCandidateSlots(habitatProfiles().slice(1))).toThrow(/rerun/);
  });

  it("fails loudly when a candidate profile is incomplete or stale", () => {
    const incomplete = habitatProfiles();
    incomplete[0] = { ...incomplete[0], complete: false };
    expect(() => resolveCandidateSlots(incomplete)).toThrow(/rerun/);

    const mismatched = habitatProfiles();
    mismatched[0] = { ...mismatched[0], profileKey: "stale-profile-key" };
    expect(() => resolveCandidateSlots(mismatched)).toThrow(/rerun/);
  });
});

describe("getGlobalPredictionCells", () => {
  it("scores the cell as the max across candidates and attributes the top species", async () => {
    const profiles = habitatProfiles();
    const targetIndex = profiles.findIndex((profile) => profile.speciesId === "boletus-edulis");
    expect(targetIndex).toBeGreaterThanOrEqual(0);
    const coverages = profiles.map(() => 0);
    coverages[targetIndex] = 0.8;
    stubGlobalFeed({
      cells: [environmentCell({
        habitatCoverages: coverages,
        habitatWeightedCoverages: coverages,
      })],
      truncated: false,
      bounds,
      habitatProfiles: profiles,
    });

    const { cells } = await getGlobalPredictionCells(bounds, 10, 5000);
    const expected = calculateSuitability(globalCandidateSpecies[targetIndex], {
      regionId: "catalunya-central",
      observedAt,
      source: ["ICGC", "SoilGrids", "Open-Meteo"],
      confidence: "limited",
      stale: false,
      unavailableFields: [],
      values: {
        ...completeValues,
        habitatCoveragePercent: 80,
        habitatAltitudeSuitability: 100,
      },
    });

    expect(expected.score).toBeGreaterThan(0);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({
      cellId,
      score: expected.score,
      topSpeciesId: "boletus-edulis",
    });
    expect(cells[0].habitatCoverage).toBeCloseTo(0.8, 5);
  });

  it("withholds the combined score when any candidate withholds", async () => {
    const profiles = habitatProfiles();
    const coverages = profiles.map(() => 0);
    coverages[0] = 0.6;
    stubGlobalFeed({
      cells: [environmentCell({
        stale: true,
        habitatCoverages: coverages,
        habitatWeightedCoverages: coverages,
      })],
      truncated: false,
      bounds,
      habitatProfiles: profiles,
    });

    const { cells } = await getGlobalPredictionCells(bounds, 10, 5000);
    expect(cells[0].score).toBeNull();
    expect(cells[0].topSpeciesId).toBeNull();
  });

  it("publishes a verified zero without attribution when no candidate has habitat", async () => {
    // Cells without a cached row omit the arrays entirely: every slot is a
    // verified zero because the all-slots read is never partial.
    stubGlobalFeed({
      cells: [environmentCell()],
      truncated: false,
      bounds,
      habitatProfiles: habitatProfiles(),
    });

    const { cells } = await getGlobalPredictionCells(bounds, 10, 5000);
    expect(cells[0].score).toBe(0);
    expect(cells[0].topSpeciesId).toBeNull();
    expect(cells[0].habitatCoverage).toBeNull();
  });

  it("requests the all-species habitat view with the versioned cache params", async () => {
    const fetchMock = stubGlobalFeed({
      cells: [],
      truncated: false,
      bounds,
      habitatProfiles: habitatProfiles(),
    });

    await getGlobalPredictionCells(bounds, 10, 1000);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("includeHabitat")).toBe("all");
    expect(url.searchParams.get("view")).toBe("score");
    expect(url.searchParams.get("resolution")).toBe("1000");
    expect(url.searchParams.get("setVersion")).toBe(globalSpeciesSetKey);
  });

  it("coalesces adjacent map buckets into one larger environment read", async () => {
    const profiles = habitatProfiles();
    const leftCell = environmentCell({
      cellId: "epsg25831:2500:left",
      gridSizeM: 2500,
      bounds: [[1.05, 41.05], [1.075, 41.075]],
    });
    const rightCell = environmentCell({
      cellId: "epsg25831:2500:right",
      gridSizeM: 2500,
      bounds: [[1.3, 41.05], [1.325, 41.075]],
    });
    const fetchMock = stubGlobalFeed({
      cells: [leftCell, rightCell],
      truncated: false,
      bounds: { west: 1, south: 41, east: 1.5, north: 41.5 },
      habitatProfiles: profiles,
    });

    const [left, right] = await Promise.all([
      getGlobalPredictionCells(
        { west: 1, south: 41, east: 1.25, north: 41.25 },
        1000,
        2500,
      ),
      getGlobalPredictionCells(
        { west: 1.25, south: 41, east: 1.5, north: 41.25 },
        1000,
        2500,
      ),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(Object.fromEntries([
      "west", "south", "east", "north", "limit",
    ].map((key) => [key, url.searchParams.get(key)]))).toEqual({
      west: "1",
      south: "41",
      east: "1.5",
      north: "41.5",
      limit: "1000",
    });
    expect(url.searchParams.get("readShapeVersion")).toBe("global-map-shard-2x2-coalesced-v1");
    expect(left.cells.map((cell) => cell.cellId)).toEqual(["epsg25831:2500:left"]);
    expect(right.cells.map((cell) => cell.cellId)).toEqual(["epsg25831:2500:right"]);
  });

  it("reduces the full 2.5 km Catalonia map from 154 bucket requests to 42 reads", async () => {
    const fetchMock = stubGlobalFeed({
      cells: [],
      truncated: false,
      bounds: cataloniaSpatialBounds,
      habitatProfiles: habitatProfiles(),
    });
    const buckets = bucketsForBounds(
      cataloniaSpatialBounds,
      2500,
      cataloniaSpatialBounds,
    );

    expect(buckets).toHaveLength(154);
    await Promise.all(buckets.map((bucket) =>
      getGlobalPredictionCells(bucket, 1000, 2500)));

    expect(fetchMock).toHaveBeenCalledTimes(42);
  });
});

describe("getCandidatePredictionCells", () => {
  it("scores several territorial species from one shared environment request", async () => {
    const profiles = habitatProfiles();
    const speciesIds = ["boletus-edulis", "cantharellus-cibarius"];
    const coverages = profiles.map(() => 0);
    for (const speciesId of speciesIds) {
      coverages[profiles.findIndex((profile) => profile.speciesId === speciesId)] = 0.7;
    }
    const fetchMock = stubGlobalFeed({
      cells: [environmentCell({
        habitatCoverages: coverages,
        habitatWeightedCoverages: coverages,
      })],
      truncated: false,
      bounds,
      habitatProfiles: profiles,
    });

    const result = await getCandidatePredictionCells(bounds, speciesIds, 1000, 5000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Object.keys(result.cellsBySpecies).sort()).toEqual([...speciesIds].sort());
    for (const speciesId of speciesIds) {
      expect(result.cellsBySpecies[speciesId]).toHaveLength(1);
      expect(result.cellsBySpecies[speciesId]![0]).toMatchObject({
        speciesId,
        cellId,
        gridSizeM: 5000,
        occurrenceEvidenceStatus: "unavailable",
      });
    }
  });
});

describe("getGlobalCellRanking", () => {
  it("ranks candidate species by combined score", async () => {
    const profiles = habitatProfiles();
    const first = profiles.findIndex((profile) => profile.speciesId === "boletus-edulis");
    const second = profiles.findIndex((profile) => profile.speciesId === "lactarius-deliciosus");
    const coverages = profiles.map(() => 0);
    coverages[first] = 0.9;
    coverages[second] = 0.25;
    stubGlobalFeed({
      cells: [environmentCell({
        habitatCoverages: coverages,
        habitatWeightedCoverages: coverages,
      })],
      truncated: false,
      bounds,
      habitatProfiles: profiles,
    });

    const detail = await getGlobalCellRanking(cellId, bounds, 5000);
    expect(detail).not.toBeNull();
    expect(detail!.ranking.length).toBeGreaterThanOrEqual(2);
    expect(detail!.ranking[0].speciesId).toBe("boletus-edulis");
    const scores = detail!.ranking.map((item) => item.score);
    expect([...scores].sort((left, right) => right - left)).toEqual(scores);
    expect(detail!.mapCell.topSpeciesId).toBe("boletus-edulis");
  });

  it("returns null for a cell outside the payload", async () => {
    stubGlobalFeed({
      cells: [],
      truncated: false,
      bounds,
      habitatProfiles: habitatProfiles(),
    });

    await expect(getGlobalCellRanking("missing-cell", bounds, 5000)).resolves.toBeNull();
  });
});

describe("rankGlobalSpeciesScores", () => {
  const resultWith = (score: number | null, fruiting: number | null): SuitabilityResult => ({
    score,
    fruitingConditionsScore: fruiting,
    opportunityIndex: score,
    rawHabitatCoverage: null,
    effectiveHabitatCoverage: null,
    label: "mitjana",
    components: [],
    modelVersion: "test",
    dataCompleteness: 1,
    missingComponents: [],
  });

  it("drops zero and withheld scores and breaks ties by fruiting conditions", () => {
    const [first, second, third] = globalCandidateSpecies;
    const ranking = rankGlobalSpeciesScores([
      { species: first, result: resultWith(40, 50) },
      { species: second, result: resultWith(40, 80) },
      { species: third, result: resultWith(0, 10) },
    ]);
    expect(ranking.map((item) => item.speciesId)).toEqual([
      second.speciesId,
      first.speciesId,
    ]);
  });
});

describe("bestRegionalSuitability", () => {
  it("returns the strongest scoring candidate for a regional snapshot", () => {
    const snapshot: ConditionSnapshot = {
      regionId: "prepirineus",
      observedAt,
      source: ["test"],
      confidence: "moderate",
      stale: false,
      unavailableFields: [],
      values: {
        ...completeValues,
        habitatCoveragePercent: 60,
        habitatAltitudeSuitability: 90,
      },
    };
    const best = bestRegionalSuitability(snapshot);
    expect(best).not.toBeNull();
    expect(best!.result.score).not.toBeNull();
    const bestScore = best!.result.score!;
    for (const species of globalCandidateSpecies) {
      const result = calculateSuitability(species, snapshot);
      if (result.score !== null) expect(result.score).toBeLessThanOrEqual(bestScore);
    }
  });

  it("returns null when every candidate withholds", () => {
    const snapshot: ConditionSnapshot = {
      regionId: "prepirineus",
      observedAt,
      source: ["test"],
      confidence: "unknown",
      stale: true,
      unavailableFields: [],
      values: { habitatCoveragePercent: 40, habitatAltitudeSuitability: 80 },
    };
    expect(bestRegionalSuitability(snapshot)).toBeNull();
  });

  it("exposes the shared species id for the combined map", () => {
    expect(GLOBAL_SPECIES_ID).toBe("all");
  });
});
