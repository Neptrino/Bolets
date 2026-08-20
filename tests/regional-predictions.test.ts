import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { predictionModelVersion } from "@/src/lib/model-versions";
import { summariseAreaPredictions, summariseRegionalPredictions } from "@/src/lib/predictions";
import { opportunityLabel } from "@/src/lib/scoring";
import type {
  ConditionSnapshot,
  ModelComponent,
  PredictionCell,
  RegionId,
} from "@/src/lib/types";

const species = getSpecies("boletus-edulis")!;
const completeHydrothermalValues: ConditionSnapshot["values"] = {
  temperatureAvg7dC: 13,
  temperatureAvg20dC: 13.5,
  frostHours20d: 0,
  heatHours20d: 0,
  relativeHumidityAvg7d: 90,
  soilMoistureMin7d: 0.225,
  soilMoistureAvg7d: 0.24,
  rainfall26dMm: 50,
  rainfallDays26d: 5,
  evapotranspiration26dMm: 5,
  drySpellDays: 0,
  soilTexture: "franca",
};

function component(
  id: ModelComponent["id"],
  score: number | null,
): ModelComponent {
  return {
    id,
    label: id,
    score,
    state: score === null
      ? "unknown"
      : score >= 70
        ? "favourable"
        : score >= 45
          ? "mixed"
          : "unfavourable",
  };
}

function predictionCell({
  cellId,
  regionId = "pirineus",
  fruitingConditionsScore,
  effectiveHabitatCoverage,
  temperatureC,
  phenologyScore = 100,
  gridSizeM = 10000,
  cellBounds = [[1, 42], [1.1, 42.1]],
}: {
  cellId: string;
  regionId?: RegionId;
  fruitingConditionsScore: number | null;
  effectiveHabitatCoverage: number;
  temperatureC: number;
  phenologyScore?: number;
  gridSizeM?: PredictionCell["gridSizeM"];
  cellBounds?: PredictionCell["cellBounds"];
}): PredictionCell {
  const opportunityIndex = fruitingConditionsScore === null
    ? null
    : Math.round(effectiveHabitatCoverage * fruitingConditionsScore);
  return {
    speciesId: species.speciesId,
    cellId,
    regionId,
    observedAt: "2026-10-15T00:00:00Z",
    gridSizeM,
    cellBounds,
    score: opportunityIndex,
    fruitingConditionsScore,
    opportunityIndex,
    effectiveHabitatCoverage,
    label: opportunityIndex === null ? "sense dades" : opportunityLabel(opportunityIndex),
    sourceResolutionM: 10000,
    confidence: "moderate",
    stale: false,
    source: ["ICGC", "Open-Meteo"],
    unavailableFields: [],
    values: {
      ...completeHydrothermalValues,
      temperatureC,
      habitatCoveragePercent: effectiveHabitatCoverage * 100,
      habitatAltitudeSuitability: 100,
    },
    modelVersion: predictionModelVersion(species.modelConfig.version),
    components: [
      component("habitatCoverage", Math.round(effectiveHabitatCoverage * 100)),
      component("altitude", 100),
      component("phenology", phenologyScore),
      component("water", fruitingConditionsScore),
      component("temperature", fruitingConditionsScore),
      component("extremes", 100),
    ],
    occurrenceEvidence: null,
    occurrenceEvidenceStatus: "unavailable",
  };
}

describe("regional prediction summaries", () => {
  it("uses equal-area O and effective-habitat-weighted F", () => {
    const summary = summariseRegionalPredictions(species, "pirineus", [
      predictionCell({
        cellId: "large-low-f",
        fruitingConditionsScore: 10,
        effectiveHabitatCoverage: 0.9,
        temperatureC: 12,
      }),
      predictionCell({
        cellId: "small-high-f-1",
        fruitingConditionsScore: 100,
        effectiveHabitatCoverage: 0.2,
        temperatureC: 18,
      }),
      predictionCell({
        cellId: "small-high-f-2",
        fruitingConditionsScore: 100,
        effectiveHabitatCoverage: 0.2,
        temperatureC: 24,
      }),
      predictionCell({
        cellId: "excluded",
        fruitingConditionsScore: 100,
        effectiveHabitatCoverage: 0,
        temperatureC: 25,
      }),
      predictionCell({
        cellId: "other-region",
        regionId: "prepirineus",
        fruitingConditionsScore: 100,
        effectiveHabitatCoverage: 1,
        temperatureC: 30,
      }),
    ]);

    expect(summary).not.toBeNull();
    // Equal-area O median: median(9, 20, 20) = 20. Habitat weighting would
    // instead select 9 because the low-F cell carries 90% effective habitat.
    expect(summary?.result.opportunityIndex).toBe(20);
    expect(summary?.result.score).toBe(20);
    // Effective-habitat-weighted F median: the 0.9-weight cell selects F = 10;
    // an equal-area median would be 100.
    expect(summary?.result.fruitingConditionsScore).toBe(10);
    expect(summary?.result.label).toBe("baixa");
    expect(summary?.result.modelVersion).toBe(
      predictionModelVersion(species.modelConfig.version),
    );
    expect(summary?.scoreRange).toEqual([9, 20]);
    expect(summary?.scoredCellCount).toBe(3);
    expect(summary?.positiveCellCount).toBe(3);
    expect(summary?.score20CellCount).toBe(2);
    expect(summary?.positiveCellShare).toBe(1);
    expect(summary?.score20CellShare).toBeCloseTo(2 / 3);
    expect(summary?.bestCell).toMatchObject({ cellId: "small-high-f-1", score: 20 });
    expect(summary?.snapshot.values.temperatureC).toBeCloseTo(19.2 / 1.3);
  });

  it("publishes zero when all compatible cells are outside the season", () => {
    const summary = summariseRegionalPredictions(species, "pirineus", [
      predictionCell({
        cellId: "inactive",
        fruitingConditionsScore: 0,
        effectiveHabitatCoverage: 0.75,
        temperatureC: 16,
        phenologyScore: 0,
      }),
    ]);

    expect(summary?.result.fruitingConditionsScore).toBe(0);
    expect(summary?.result.opportunityIndex).toBe(0);
    expect(summary?.result.score).toBe(0);
    expect(
      summary?.result.components.find((item) => item.id === "phenology")?.score,
    ).toBe(0);
  });

  it("withholds the regional summary when no compatible cell has O", () => {
    const summary = summariseRegionalPredictions(species, "pirineus", [
      predictionCell({
        cellId: "withheld",
        fruitingConditionsScore: null,
        effectiveHabitatCoverage: 0.65,
        temperatureC: 16,
      }),
    ]);

    expect(summary).toBeNull();
  });
});

describe("1 km area prediction summaries", () => {
  it("keeps fine cells, excludes the bucket fringe and reports prevalence", () => {
    const area = {
      slug: "ripolles",
      regionId: "pirineus" as const,
      bounds: { west: 1, south: 42, east: 1.04, north: 42.04 },
    };
    const cells = [
      predictionCell({
        cellId: "best",
        fruitingConditionsScore: 50,
        effectiveHabitatCoverage: 1,
        temperatureC: 14,
        gridSizeM: 1000,
        cellBounds: [[1, 42], [1.01, 42.01]],
      }),
      predictionCell({
        cellId: "positive",
        fruitingConditionsScore: 30,
        effectiveHabitatCoverage: 1,
        temperatureC: 14,
        gridSizeM: 1000,
        cellBounds: [[1.01, 42], [1.02, 42.01]],
      }),
      predictionCell({
        cellId: "zero",
        fruitingConditionsScore: 0,
        effectiveHabitatCoverage: 1,
        temperatureC: 14,
        gridSizeM: 1000,
        cellBounds: [[1.02, 42], [1.03, 42.01]],
      }),
      predictionCell({
        cellId: "bucket-fringe",
        fruitingConditionsScore: 90,
        effectiveHabitatCoverage: 1,
        temperatureC: 14,
        gridSizeM: 1000,
        cellBounds: [[1.08, 42], [1.09, 42.01]],
      }),
    ];

    const summary = summariseAreaPredictions(species, area, cells);

    expect(summary).toMatchObject({
      areaSlug: "ripolles",
      gridSizeM: 1000,
      scoredCellCount: 3,
      positiveCellCount: 2,
      score20CellCount: 2,
      bestCell: { cellId: "best", score: 50 },
    });
    expect(summary?.positiveCellShare).toBeCloseTo(2 / 3);
    expect(summary?.score20CellShare).toBeCloseTo(2 / 3);
  });
});
