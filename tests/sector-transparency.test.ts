import { describe, expect, it } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { drawPredictionSurface } from "@/components/region-map/prediction-surface";
import type { PredictionMapCell, SpatialGridSizeM } from "@/src/lib/types";

/** Capture the actual sector fill, including its colour's own alpha. */
function fill(gridSizeM: SpatialGridSizeM, habitatCoverage: number | null, score: number | null = 10) {
  let result!: { alpha: number; colour: string };
  const context = {
    globalAlpha: 1, fillStyle: "",
    save() {}, restore() {}, setLineDash() {}, strokeRect() {},
    fillRect() {
      result = { colour: this.fillStyle,
        alpha: this.globalAlpha * Number(this.fillStyle.match(/,\s*([\d.]+)\)$/)![1]) };
    },
  };
  const cell: PredictionMapCell = {
    cellId: `test:${gridSizeM}`, gridSizeM, habitatCoverage, score,
    cellBounds: [[1, 41], [1.1, 41.1]],
  };
  drawPredictionSurface({
    cells: [cell], context: context as unknown as CanvasRenderingContext2D,
    localMap: { project: ([x, y]: [number, number]) => ({ x: x * 10000, y: -y * 10000 }) } as unknown as MapLibreMap,
    output: {} as HTMLCanvasElement, rendering: "cells", selectedCellId: null,
  });
  return result;
}

describe("sector transparency", () => {
  it.each([250, 1000, 2500, 5000, 10000] as const)(
    "uses the same coverage fade at %i m", (gridSizeM) => {
      for (const coverage of [0, 0.03, 0.1, 0.3, 0.6, 1]) {
        expect(fill(gridSizeM, coverage)).toEqual(fill(2500, coverage));
      }
      expect(fill(gridSizeM, 0.3).alpha).toBeCloseTo(0.5511, 4);
    },
  );

  it("keeps positive cells with missing or invalid coverage faint", () => {
    for (const coverage of [null, NaN, Infinity]) {
      expect(fill(5000, coverage).alpha).toBeCloseTo(0.84 * 0.06);
    }
    expect(fill(5000, 0.6).alpha).toBeCloseTo(0.84);
  });

  it("preserves the distinct neutral zero and withheld treatments", () => {
    expect(fill(5000, null, 0).alpha).toBeCloseTo(0.1);
    expect(fill(5000, null, null).alpha).toBeCloseTo(0.24);
    expect(fill(5000, null, 0).colour).not.toBe(fill(5000, null, null).colour);
  });
});
