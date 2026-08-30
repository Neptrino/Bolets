import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import {
  buildSavedForestReadings,
  savedForestCombinationsWithoutReadings,
  simulateSavedForestReadings,
} from "@/src/lib/my-forest/dashboard";
import type { AreaOverviewItem } from "@/src/lib/current-overview";
import type { AreaPredictionSummary, Month } from "@/src/lib/types";

function summary(): AreaPredictionSummary {
  return {
    areaSlug: "ripolles",
    regionId: "pirineus",
    gridSizeM: 1000,
    scoredCellCount: 10,
    positiveCellCount: 6,
    score20CellCount: 4,
    positiveCellShare: 0.6,
    score20CellShare: 0.4,
    scoreRange: [18, 47],
    bestCell: {
      cellId: "epsg25831:1000:1:1",
      score: 64,
      cellBounds: [[2.1, 42.1], [2.2, 42.2]],
    },
    result: {
      score: 31,
      fruitingConditionsScore: 52,
      opportunityIndex: 31,
      rawHabitatCoverage: 0.7,
      effectiveHabitatCoverage: 0.5,
      label: "mitjana",
      components: [
        { id: "water", label: "Estat hídric unificat", score: 42, state: "unfavourable" },
      ],
      modelVersion: "test",
      dataCompleteness: 1,
      missingComponents: [],
    },
    snapshot: {
      regionId: "pirineus",
      observedAt: "2026-08-29T08:00:00.000Z",
      source: ["test"],
      confidence: "high",
      stale: false,
      unavailableFields: [],
      values: {},
    },
  };
}

function item(status: AreaOverviewItem["status"] = "available"): AreaOverviewItem {
  return {
    areaSlug: "ripolles",
    areaName: "Ripollès",
    areaTypeLabel: "comarca",
    prepositionalName: "al Ripollès",
    regionId: "pirineus",
    bounds: { west: 1.95, south: 42.05, east: 2.5, north: 42.45 },
    path: "/zones/ripolles",
    speciesId: "boletus-edulis",
    speciesName: "Cep",
    seasonalActivity: "good",
    status,
    summary: status === "available" ? summary() : null,
  };
}

const preferences = {
  speciesIds: ["boletus-edulis"],
  territorySlugs: ["ripolles"],
};

describe("El meu bosc current readings", () => {
  it("reuses the available territorial summary and coverage semantics", () => {
    const reading = buildSavedForestReadings(preferences, [item()], "ago")[0]!;
    expect(reading).toMatchObject({
      status: "available",
      speciesId: "boletus-edulis",
      territorySlug: "ripolles",
    });
    expect(reading.summary).toMatchObject({
      positiveCellCount: 6,
      positiveCellShare: 0.6,
      score20CellCount: 4,
      score20CellShare: 0.4,
    });
    const url = new URL(reading.mapPath, "https://bolets.app");
    expect(url.searchParams.get("species")).toBe("boletus-edulis");
    expect(url.searchParams.get("region")).toBe("pirineus");
    expect(["west", "south", "east", "north"].every((key) => url.searchParams.has(key))).toBe(true);
    expect(reading.rainfallWindowDays).toBe(26);
    expect(reading.recentRainWindowDays).toBe(14);
    expect(reading.temperatureWindowDays).toBe(20);
  });

  it("preserves withheld and provider-unavailable states without partial summaries", () => {
    expect(buildSavedForestReadings(preferences, [item("insufficient")], "ago")[0])
      .toMatchObject({ status: "withheld", summary: null });
    expect(buildSavedForestReadings(preferences, [item("unavailable")], "ago")[0])
      .toMatchObject({ status: "unavailable", summary: null });
    expect(buildSavedForestReadings(preferences, [], "ago", true)[0])
      .toMatchObject({ status: "unavailable", summary: null });
  });

  it("shows a saved eligible pair out of season without inventing a score", () => {
    const species = getSpecies("boletus-edulis")!;
    const inactiveMonth = Object.entries(species.ecologicalConfig.seasonality)
      .find(([, activity]) => activity === "inactive")?.[0] as Month;
    const reading = buildSavedForestReadings(preferences, [], inactiveMonth)[0]!;
    expect(reading.status).toBe("outside-season");
    expect(reading.summary).toBeNull();
  });

  it("does not create a new pairing when no canonical local guide supports it", () => {
    expect(buildSavedForestReadings({
      speciesIds: ["amanita-phalloides"],
      territorySlugs: ["ripolles"],
    }, [], "ago")).toEqual([]);
  });

  it("reports saved pairs without a canonical local guide separately", () => {
    const saved = {
      speciesIds: ["boletus-edulis", "cantharellus-cibarius"],
      territorySlugs: ["ripolles", "cerdanya"],
    };
    const readings = buildSavedForestReadings(saved, [], "ago");
    expect(savedForestCombinationsWithoutReadings(saved, readings)).toEqual([{
      speciesId: "cantharellus-cibarius",
      speciesName: "Rossinyol",
      territorySlug: "cerdanya",
      territoryName: "Cerdanya",
    }]);
  });

  it("creates clearly isolated preview summaries without changing the inputs", () => {
    const readings = buildSavedForestReadings({
      speciesIds: [
        "boletus-edulis",
        "cantharellus-cibarius",
        "lactarius-deliciosus",
      ],
      territorySlugs: ["ripolles"],
    }, [], "ago");
    const preview = simulateSavedForestReadings(
      readings,
      new Date("2026-08-29T12:00:00Z"),
    );
    expect(preview.slice(0, 2).every((reading) =>
      reading.status === "available" &&
      reading.summary?.result.modelVersion === "simulation-only" &&
      reading.summary.snapshot.source.includes("simulació local")
    )).toBe(true);
    expect(preview[2]).toMatchObject({ status: "withheld", summary: null });
    expect(readings.every((reading) => reading.summary === null)).toBe(true);
  });
});
