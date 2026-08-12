import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { summariseRegionalPredictions } from "@/src/lib/predictions";
import type { PredictionCell, RegionId } from "@/src/lib/types";

const species = getSpecies("boletus-edulis")!;

function predictionCell({
  cellId,
  regionId = "pirineus",
  score,
  forestScore,
  temperatureC,
  seasonalityScore = 65,
}: {
  cellId: string;
  regionId?: RegionId;
  score: number | null;
  forestScore: number | null;
  temperatureC: number;
  seasonalityScore?: number;
}): PredictionCell {
  return {
    speciesId: species.speciesId,
    cellId,
    regionId,
    observedAt: "2026-08-12T12:00:00Z",
    gridSizeM: 10000,
    cellBounds: [[1, 42], [1.1, 42.1]],
    score,
    label: score === null ? "sense dades" : score >= 65 ? "favorable" : "poc favorable",
    sourceResolutionM: 10000,
    confidence: "moderate",
    stale: false,
    source: ["ICGC", "Open-Meteo"],
    unavailableFields: [],
    values: {
      temperatureC,
      temperatureAvg24hC: temperatureC,
      rainfall3dMm: 18,
      rainfall7dMm: 25,
      rainfallPrevious23dMm: 45,
      rainfall30dMm: 70,
      drySpellDays: 0,
      evapotranspiration3dMm: 4,
      evapotranspiration7dMm: 10,
      evapotranspiration30dMm: 45,
      soilMoisture: 0.3,
      soilMoistureMin7d: 0.25,
      soilMoistureAvg7d: 0.3,
      soilMoistureMax7d: 0.33,
      soilMoistureTrend7d: 0.01,
    },
    modelVersion: species.modelConfig.version,
    factors: species.modelConfig.factors.map((factor) => {
      const factorScore = factor.id === "forest"
        ? forestScore
        : factor.id === "seasonality"
          ? seasonalityScore
          : 70;
      return {
        id: factor.id,
        label: factor.label,
        weight: factor.weight,
        score: factorScore,
        state: factorScore === null
          ? "unknown"
          : factorScore >= 70
            ? "favourable"
            : factorScore >= 45
              ? "mixed"
              : "unfavourable",
      };
    }),
    occurrenceEvidence: null,
    occurrenceEvidenceStatus: "unavailable",
  };
}

describe("regional prediction summaries", () => {
  it("uses a habitat-weighted median of scored compatible cells", () => {
    const summary = summariseRegionalPredictions(species, "pirineus", [
      predictionCell({ cellId: "low", score: 30, forestScore: 20, temperatureC: 12 }),
      predictionCell({ cellId: "high", score: 70, forestScore: 80, temperatureC: 18 }),
      predictionCell({ cellId: "excluded", score: 90, forestScore: 0, temperatureC: 25 }),
      predictionCell({
        cellId: "other-region",
        regionId: "prepirineus",
        score: 95,
        forestScore: 100,
        temperatureC: 30,
      }),
    ]);

    expect(summary).not.toBeNull();
    expect(summary?.result.score).toBe(70);
    expect(summary?.result.label).toBe("favorable");
    expect(summary?.scoredCellCount).toBe(2);
    expect(summary?.snapshot.values.temperatureC).toBeCloseTo(16.8);
  });

  it("publishes zero when all compatible cells are outside the season", () => {
    const summary = summariseRegionalPredictions(species, "pirineus", [
      predictionCell({
        cellId: "inactive",
        score: 0,
        forestScore: 75,
        temperatureC: 16,
        seasonalityScore: 0,
      }),
    ]);

    expect(summary?.result.score).toBe(0);
    expect(
      summary?.result.contributions.find((factor) => factor.id === "seasonality")?.score,
    ).toBe(0);
  });

  it("withholds the regional summary when no compatible cell has a score", () => {
    const summary = summariseRegionalPredictions(species, "pirineus", [
      predictionCell({ cellId: "withheld", score: null, forestScore: 65, temperatureC: 16 }),
    ]);

    expect(summary).toBeNull();
  });
});
