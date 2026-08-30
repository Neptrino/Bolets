import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { predictionViewportStatus } from "@/src/lib/prediction-map-status";

describe("prediction map rendering", () => {
  const regionMapSources = [
    join(process.cwd(), "components", "region-map.tsx"),
    ...readdirSync(join(process.cwd(), "components", "region-map"))
      .filter((file) => /\.tsx?$/.test(file))
      .map((file) => join(process.cwd(), "components", "region-map", file)),
  ];
  const source = regionMapSources
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  it("paints zero-score cells instead of leaving the map apparently empty", () => {
    expect(source).toContain("context.fillStyle = predictionMapCellColour(cell.score)");
    expect(source).not.toContain("if (cell.score !== 0)");
  });

  it("keeps an explicit loading overlay visible while replacement cells load", () => {
    expect(source).toContain('className="prediction-map-loading"');
    expect(source).toContain("Actualitzant la predicció…");
    expect(source).toContain('ariaBusy={cellState.status === "loading"}');
  });

  it("loads historical evidence separately from the primary habitat grid", () => {
    expect(source).toContain("/api/occurrences?");
    expect(source).toContain("void loadHistoricalEvidence()");
  });

  it("never requests finer than the coarse floor for the combined map", () => {
    expect(source).toContain(
      'speciesId === GLOBAL_SPECIES_ID ? GLOBAL_MINIMUM_GRID_SIZE_M : 250',
    );
    expect(source).toContain("visibleGridSize(localMap, minimumGridSizeM)");
  });

  it("tells combined-map users why the grid stops at its coarse floor", () => {
    expect(source).toContain(
      "globalPrediction && cellState.gridSizeM === GLOBAL_MINIMUM_GRID_SIZE_M",
    );
    expect(source).toContain("Tria una espècie concreta per veure més detall");
  });

  it.each([
    [{ published: 0, excluded: 0, withheld: 0 }, "empty"],
    [{ published: 2, excluded: 0, withheld: 0 }, "ready"],
    [{ published: 0, excluded: 2, withheld: 0 }, "incompatible"],
    [{ published: 0, excluded: 0, withheld: 2 }, "withheld"],
    [{ published: 0, excluded: 1, withheld: 1 }, "mixed"],
    [{ published: 2, excluded: 1, withheld: 1 }, "mixed"],
  ] as const)("classifies viewport counts %o as %s", (counts, status) => {
    expect(predictionViewportStatus(counts)).toBe(status);
  });
});
