import "server-only";

import { regionBounds } from "@/data/regions";
import {
  type AreaOverviewItem,
  type CurrentOverviewItem,
} from "@/src/lib/current-overview";
import { opportunityLabel } from "@/src/lib/scoring";
import type {
  AreaPredictionSummary,
  ModelComponent,
  RegionId,
  RegionalPredictionSummary,
  SpatialBounds,
  SpatialGridSizeM,
} from "@/src/lib/types";

interface SimulationEnvironment {
  NODE_ENV?: string;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function component(
  id: ModelComponent["id"],
  label: string,
  score: number,
): ModelComponent {
  return {
    id,
    label,
    score,
    state: score >= 68 ? "favourable" : score >= 42 ? "mixed" : "unfavourable",
  };
}

function simulatedCellBounds(bounds: SpatialBounds, gridSizeM: SpatialGridSizeM) {
  const longitudeSpan = Math.min(
    (bounds.east - bounds.west) * 0.18,
    gridSizeM === 1000 ? 0.012 : 0.12,
  );
  const latitudeSpan = Math.min(
    (bounds.north - bounds.south) * 0.18,
    gridSizeM === 1000 ? 0.009 : 0.09,
  );
  const centreLongitude = (bounds.west + bounds.east) / 2;
  const centreLatitude = (bounds.south + bounds.north) / 2;
  return [
    [centreLongitude - longitudeSpan / 2, centreLatitude - latitudeSpan / 2],
    [centreLongitude + longitudeSpan / 2, centreLatitude + latitudeSpan / 2],
  ] as [[number, number], [number, number]];
}

function simulatedSummary({
  bounds,
  gridSizeM,
  key,
  observedAt,
  regionId,
}: {
  bounds: SpatialBounds;
  gridSizeM: SpatialGridSizeM;
  key: string;
  observedAt: string;
  regionId: RegionId;
}): RegionalPredictionSummary {
  const hash = stableHash(key);
  const bestScore = 36 + (hash % 59);
  const score = Math.max(20, bestScore - 11 - (hash % 7));
  const scoredCellCount = gridSizeM === 1000 ? 64 : 48;
  const positiveCellShare = 0.38 + ((hash >>> 5) % 48) / 100;
  const score20CellShare = Math.max(0.2, positiveCellShare - 0.18);
  const waterScore = Math.max(24, score - 12 + ((hash >>> 9) % 18));
  const temperatureScore = Math.min(96, score + ((hash >>> 13) % 15));
  const components = [
    component("habitatCoverage", "Coberta d’hàbitat compatible", Math.min(96, score + 8)),
    component("altitude", "Idoneïtat altitudinal dins l’hàbitat", Math.min(98, score + 13)),
    component("phenology", "Fenologia", Math.min(94, score + 5)),
    component("water", "Estat hídric unificat", waterScore),
    component("temperature", "Resposta tèrmica", temperatureScore),
    component("extremes", "Exposició a gelada i calor", Math.min(100, score + 17)),
  ];

  return {
    regionId,
    gridSizeM,
    scoredCellCount,
    positiveCellCount: Math.round(scoredCellCount * positiveCellShare),
    score20CellCount: Math.round(scoredCellCount * score20CellShare),
    positiveCellShare,
    score20CellShare,
    scoreRange: [Math.max(1, score - 24), bestScore],
    bestCell: {
      cellId: `simulation:${gridSizeM}:${hash}`,
      score: bestScore,
      cellBounds: simulatedCellBounds(bounds, gridSizeM),
    },
    result: {
      score,
      fruitingConditionsScore: Math.min(100, score + 6),
      opportunityIndex: score,
      rawHabitatCoverage: 0.72,
      effectiveHabitatCoverage: 0.58,
      label: opportunityLabel(score),
      components,
      modelVersion: "development-overview-simulation-v1",
      dataCompleteness: 1,
      missingComponents: [],
    },
    snapshot: {
      regionId,
      observedAt,
      source: ["Simulació local · dades fictícies"],
      confidence: "unknown",
      stale: false,
      unavailableFields: [],
      values: {},
    },
  };
}

export function developmentOverviewSimulation(
  currentItems: CurrentOverviewItem[],
  areaItems: AreaOverviewItem[],
  options: {
    environment?: SimulationEnvironment;
    observedAt?: string;
  } = {},
) {
  const environment = options.environment ?? process.env;
  const hasPublishedData = [...currentItems, ...areaItems]
    .some((item) => item.status === "available" && item.summary);
  if (environment.NODE_ENV !== "development" || hasPublishedData) {
    return { currentItems, areaItems, simulated: false } as const;
  }

  const baseObservedAt = Date.parse(options.observedAt ?? new Date().toISOString());
  const observationAt = (index: number) =>
    new Date(baseObservedAt - index * 4 * 60 * 1_000).toISOString();
  const simulatedCurrentItems = currentItems.map((item, index) => ({
    ...item,
    status: "available" as const,
    summary: simulatedSummary({
      bounds: regionBounds[item.regionId],
      gridSizeM: 10000,
      key: `region:${item.regionId}:${item.speciesId}`,
      observedAt: observationAt(index),
      regionId: item.regionId,
    }),
  }));
  const simulatedAreaItems = areaItems.map((item, index) => {
    const summary = simulatedSummary({
      bounds: item.bounds,
      gridSizeM: 1000,
      key: `area:${item.areaSlug}:${item.speciesId}`,
      observedAt: observationAt(currentItems.length + index),
      regionId: item.regionId,
    });
    return {
      ...item,
      status: "available" as const,
      summary: {
        ...summary,
        areaSlug: item.areaSlug,
        gridSizeM: 1000,
      } satisfies AreaPredictionSummary,
    };
  });

  return {
    currentItems: simulatedCurrentItems,
    areaItems: simulatedAreaItems,
    simulated: true,
  } as const;
}
