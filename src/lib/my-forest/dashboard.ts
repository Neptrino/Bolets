import { getSpecies } from "@/data/species";
import { getCatalogueSpecies } from "@/data/catalogue";
import { modelConfigForSpecies } from "@/data/model-priors";
import {
  overviewHubs,
  type AreaOverviewItem,
} from "@/src/lib/current-overview";
import type {
  ForestPreferences,
  SavedForestReading,
  SavedForestUnavailableCombination,
} from "@/src/lib/my-forest/types";
import { territorialMapPath } from "@/src/lib/territorial-map";
import type { AreaPredictionSummary, Month } from "@/src/lib/types";

const edibleStatuses = new Set([
  "excellent_edible",
  "edible",
  "edible_with_conditions",
]);

export function buildSavedForestReadings(
  preferences: ForestPreferences,
  overviewItems: AreaOverviewItem[],
  month: Month,
  overviewUnavailable = false,
): SavedForestReading[] {
  const hubs = new Map(overviewHubs().map((hub) => [hub.slug, hub]));
  const overview = new Map(overviewItems.map((item) => [
    `${item.areaSlug}:${item.speciesId}`,
    item,
  ]));
  const readings: SavedForestReading[] = [];

  for (const territorySlug of preferences.territorySlugs) {
    const hub = hubs.get(territorySlug);
    if (!hub) continue;
    const guideSpecies = new Set(hub.guides.map((guide) => guide.speciesId));
    for (const speciesId of preferences.speciesIds) {
      const species = getSpecies(speciesId);
      if (!species || species.predictionMode !== "current" ||
        !edibleStatuses.has(species.identity.edibility) ||
        !species.ecologicalConfig.regions.includes(hub.regionId) ||
        !guideSpecies.has(speciesId)) continue;

      const activity = species.ecologicalConfig.seasonality[month];
      const model = modelConfigForSpecies(
        species.speciesId,
        species.ecologicalConfig.climate.temperatureRange,
        species.ecologicalConfig.seasonality,
        undefined,
        species.ecologicalConfig.habitat.altitude,
      );
      if (model.status !== "supported") continue;
      const item = overview.get(`${territorySlug}:${speciesId}`);
      const status = activity === "inactive"
        ? "outside-season" as const
        : item?.status === "available"
          ? "available" as const
          : item?.status === "unavailable"
            ? "unavailable" as const
            : overviewUnavailable
              ? "unavailable" as const
              : "withheld" as const;
      const recentRainWindowDays = "recentWindowDays" in model.water
        ? model.water.recentWindowDays
        : null;

      readings.push({
        speciesId,
        speciesName: species.identity.commonName,
        territorySlug,
        territoryName: hub.name,
        territoryType: hub.typeLabel,
        territoryPath: hub.path,
        mapPath: territorialMapPath(speciesId, hub.regionId, hub.bounds),
        status,
        seasonalActivity: activity,
        rainfallWindowDays: model.water.rainfallWindowDays,
        recentRainWindowDays,
        temperatureWindowDays: model.temperature.windowDays,
        summary: status === "available" ? item?.summary ?? null : null,
      });
    }
  }
  return readings;
}

export function savedForestCombinationsWithoutReadings(
  preferences: ForestPreferences,
  readings: SavedForestReading[],
): SavedForestUnavailableCombination[] {
  const readingKeys = new Set(readings.map((reading) =>
    `${reading.territorySlug}:${reading.speciesId}`
  ));
  const hubs = new Map(overviewHubs().map((hub) => [hub.slug, hub]));
  const unavailable: SavedForestUnavailableCombination[] = [];

  for (const territorySlug of preferences.territorySlugs) {
    const hub = hubs.get(territorySlug);
    if (!hub) continue;
    for (const speciesId of preferences.speciesIds) {
      if (readingKeys.has(`${territorySlug}:${speciesId}`)) continue;
      const species = getCatalogueSpecies(speciesId);
      if (!species) continue;
      unavailable.push({
        speciesId,
        speciesName: species.identity.commonName,
        territorySlug,
        territoryName: hub.name,
      });
    }
  }
  return unavailable;
}

const simulatedScores = [68, 43] as const;

export function simulateSavedForestReadings(
  readings: SavedForestReading[],
  observedAt = new Date(),
): SavedForestReading[] {
  const hubs = new Map(overviewHubs().map((hub) => [hub.slug, hub]));
  let simulatedIndex = 0;

  return readings.map((reading) => {
    const hub = hubs.get(reading.territorySlug);
    const score = simulatedScores[simulatedIndex];
    if (!hub || score === undefined) {
      return simulatedIndex === simulatedScores.length
        ? { ...reading, status: "withheld", summary: null }
        : reading;
    }
    simulatedIndex += 1;
    const positiveCellCount = score === 68 ? 72 : 48;
    const score20CellCount = score === 68 ? 51 : 29;
    const scoredCellCount = 96;
    const summary: AreaPredictionSummary = {
      areaSlug: reading.territorySlug,
      regionId: hub.regionId,
      gridSizeM: 1000,
      scoredCellCount,
      positiveCellCount,
      score20CellCount,
      positiveCellShare: positiveCellCount / scoredCellCount,
      score20CellShare: score20CellCount / scoredCellCount,
      scoreRange: score === 68 ? [12, 68] : [8, 43],
      bestCell: {
        cellId: `simulation:${reading.territorySlug}:${reading.speciesId}`,
        score,
        cellBounds: [
          [hub.bounds.west, hub.bounds.south],
          [hub.bounds.east, hub.bounds.north],
        ],
      },
      result: {
        score: score === 68 ? 46 : 28,
        fruitingConditionsScore: score === 68 ? 74 : 51,
        opportunityIndex: score === 68 ? 46 : 28,
        rawHabitatCoverage: score === 68 ? 0.71 : 0.56,
        effectiveHabitatCoverage: score === 68 ? 0.62 : 0.47,
        label: score === 68 ? "mitjana" : "baixa",
        components: [
          { id: "water", label: "Estat hídric unificat", score: score === 68 ? 78 : 49, state: score === 68 ? "favourable" : "mixed" },
          { id: "temperature", label: "Resposta tèrmica", score: score === 68 ? 72 : 61, state: "favourable" },
          { id: "habitatCoverage", label: "Hàbitat efectiu", score: score === 68 ? 62 : 47, state: "mixed" },
        ],
        modelVersion: "simulation-only",
        dataCompleteness: 1,
        missingComponents: [],
      },
      snapshot: {
        regionId: hub.regionId,
        observedAt: observedAt.toISOString(),
        source: ["simulació local"],
        confidence: "limited",
        stale: false,
        unavailableFields: [],
        values: {},
      },
    };
    return { ...reading, status: "available", summary };
  });
}
