import { describe, expect, it } from "vitest";
import { toPredictionMapCell } from "@/src/lib/predictions";
import type { PredictionCell } from "@/src/lib/types";

describe("compact prediction map cells", () => {
  it("keeps map geometry and score while omitting detailed conditions", () => {
    const cell = {
      speciesId: "boletus-edulis",
      cellId: "epsg25831:1000:440:4680",
      regionId: "pirineus",
      observedAt: "2026-08-11T13:40:00Z",
      gridSizeM: 1000,
      cellBounds: [[2.2, 42.3], [2.21, 42.31]],
      score: 35,
      label: "poc favorable",
      sourceResolutionM: 2500,
      confidence: "limited",
      stale: false,
      source: ["Météo-France AROME via Open-Meteo"],
      unavailableFields: [],
      values: { temperatureC: 23.6 },
      modelVersion: "ecologia-v1.2",
      factors: [],
      occurrenceEvidence: null,
      occurrenceEvidenceStatus: "no-records"
    } satisfies PredictionCell;

    expect(toPredictionMapCell(cell.speciesId, { ...cell, bounds: cell.cellBounds }, cell)).toEqual({
      speciesId: cell.speciesId,
      cellId: cell.cellId,
      regionId: cell.regionId,
      gridSizeM: cell.gridSizeM,
      cellBounds: cell.cellBounds,
      score: cell.score,
      label: cell.label
    });
  });
});
