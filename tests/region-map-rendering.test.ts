import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { predictionViewportStatus } from "@/src/lib/prediction-map-status";

describe("prediction map rendering", () => {
  const regionMapSource = readFileSync(
    join(process.cwd(), "components", "region-map.tsx"),
    "utf8",
  );
  const regionMapSources = [
    join(process.cwd(), "components", "region-map.tsx"),
    ...readdirSync(join(process.cwd(), "components", "region-map"))
      .filter((file) => /\.tsx?$/.test(file))
      .map((file) => join(process.cwd(), "components", "region-map", file)),
  ];
  const source = regionMapSources
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const todayPageSource = readFileSync(
    join(process.cwd(), "app", "bolets-avui", "page.tsx"),
    "utf8",
  );

  it("paints zero-score cells instead of leaving the map apparently empty", () => {
    expect(source).toContain("context.fillStyle = predictionMapCellColour(cell.score)");
    expect(source).not.toContain("if (cell.score !== 0)");
  });

  it("offers an opt-in smooth heat surface while retaining exact cells by default", () => {
    expect(source).toContain('predictionRendering = "cells"');
    expect(source).toContain('rendering === "heatmap"');
    expect(source).toContain("predictionHeatmapColour(cell.score)");
    expect(source).toContain("withCataloniaLandClip(context, localMap");
  });

  it("keeps an explicit loading overlay visible while replacement cells load", () => {
    expect(source).toContain('className="prediction-map-loading"');
    expect(source).toContain("Actualitzant les condicions…");
    expect(source).toContain('ariaBusy={cellState.status === "loading"}');
  });

  it("reveals fine-grid buckets progressively instead of blocking on the last one", () => {
    expect(source).toContain("prioritizeBucketsAround(");
    expect(source).toContain('className="map-data-state map-refining-state"');
    expect(source).toContain("Completant el mapa…");
  });

  it("fits the initial camera before waiting for basemap tiles to load", () => {
    const initialLoadListener = regionMapSource.indexOf('localMap.once("load"');
    expect(initialLoadListener).toBeGreaterThan(0);
    expect(
      regionMapSource.lastIndexOf(
        "fitRegion(localMap, initialRegion.current, false)",
        initialLoadListener,
      ),
    ).toBeGreaterThan(0);
    expect(
      regionMapSource.indexOf(
        "fitRegion(localMap, initialRegion.current, false)",
        initialLoadListener,
      ),
    ).toBe(-1);
  });

  it("loads historical evidence separately from the primary habitat grid", () => {
    expect(source).toContain("/api/occurrences?");
    expect(source).toContain("void loadHistoricalEvidence()");
  });

  it("never requests finer than the coarse floor for the combined map", () => {
    expect(source).toContain("contributorAccess.minimumResolutionM");
    expect(source).toContain("Math.max(GLOBAL_MINIMUM_GRID_SIZE_M, detailedMinimumGridSizeM)");
    expect(source).toContain("predictionMinimumGridSizeM,\n        maximumPredictionGridSizeM");
  });

  it("starts the Avui heatmap at 2.5 km resolution", () => {
    expect(todayPageSource).toContain("maximumPredictionGridSizeM={2500}");
    expect(source).toContain("initialInteractive.current ? undefined : 12");
  });

  it("keeps the Avui overview static while maps remain interactive by default", () => {
    expect(source).toContain("interactive = true");
    expect(source).toContain("showResetButton={interactive}");
    expect(todayPageSource).toContain("interactive={false}");
    expect(todayPageSource).not.toContain("Amplieu, desplaceu-vos");
  });

  it("hides only the persistent ready badge on the Avui map", () => {
    expect(source).toContain('cellState.status === "ready" && !showReadyStatus');
    expect(todayPageSource).toContain("showReadyStatus={false}");
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
