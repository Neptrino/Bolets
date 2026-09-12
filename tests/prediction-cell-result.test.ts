import { expect, it } from "vitest";
import { resultFromCell } from "@/src/lib/prediction-cell-result";
import type { PredictionCell } from "@/src/lib/types";

const cell = {
  score: 28, fruitingConditionsScore: 65, opportunityIndex: 28,
  effectiveHabitatCoverage: 0.43, label: "baixa", modelVersion: "published-model",
  values: { habitatCoveragePercent: 55 },
  components: [{ id: "water", score: 70 }, { id: "temperature", score: null }],
  summarisedFrom: { cellId: "best-child", gridSizeM: 2500, cellBounds: [[1, 41], [1.1, 41.1]] },
} as PredictionCell;

it("preserves the published score and components rather than rescoring display-only values", () => {
  expect(resultFromCell(cell)).toEqual({
    score: 28, fruitingConditionsScore: 65, opportunityIndex: 28,
    effectiveHabitatCoverage: 0.43, rawHabitatCoverage: 0.55,
    label: "baixa", modelVersion: "published-model", components: cell.components,
    dataCompleteness: 0.5, missingComponents: ["temperature"],
  });
});

it("keeps withheld and zero readings distinct and handles missing habitat evidence", () => {
  for (const score of [null, 0]) {
    const result = resultFromCell({ ...cell, score, values: {}, components: [] });
    expect(result.score).toBe(score);
    expect(result.rawHabitatCoverage).toBeNull();
    expect(result.dataCompleteness).toBe(0);
  }
});
