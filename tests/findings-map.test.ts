import { describe, expect, it } from "vitest";
import {
  findingCellAt,
  findingCellColour,
  findingCellFillOpacity,
  findingCellsInBounds,
  personalFindingBounds,
  personalFindingMapData,
} from "@/src/lib/findings/map";
import type { PublicFindingCell } from "@/src/lib/findings/types";

const cells: PublicFindingCell[] = [
  {
    cellId: "inside",
    bounds: { west: 1, south: 41, east: 1.1, north: 41.1 },
    findingCount: 2,
    supportedCount: 0,
    latestObservedOn: "2026-08-28",
    speciesCounts: {},
  },
  {
    cellId: "outside",
    bounds: { west: 2, south: 42, east: 2.1, north: 42.1 },
    findingCount: 4,
    supportedCount: 0,
    latestObservedOn: "2026-08-28",
    speciesCounts: {},
  },
];

describe("findings map", () => {
  it("counts only cells that overlap the visible viewport", () => {
    expect(findingCellsInBounds(cells, { west: 0.9, south: 40.9, east: 1.2, north: 41.2 }))
      .toEqual([cells[0]]);
  });

  it("does not include a cell that only touches the viewport edge", () => {
    expect(findingCellsInBounds(cells, { west: 1.1, south: 41, east: 1.5, north: 41.5 }))
      .toEqual([]);
  });

  it("finds the privacy cell beneath a coordinate", () => {
    expect(findingCellAt(cells, 1.05, 41.05)?.cellId).toBe("inside");
    expect(findingCellAt(cells, 1.1, 41.05)).toBeUndefined();
  });

  it("uses progressively stronger colours for denser cells", () => {
    expect([findingCellColour(1), findingCellColour(5), findingCellColour(15)])
      .toEqual(["#d88445", "#9c4f2b", "#425c49"]);
  });

  it("softens large cells while keeping overview cells legible", () => {
    expect(findingCellFillOpacity(24, 24)).toBe(0.78);
    expect(findingCellFillOpacity(220, 220)).toBe(0.26);
    expect(findingCellFillOpacity(80, 80)).toBeGreaterThan(0.26);
    expect(findingCellFillOpacity(80, 80)).toBeLessThan(0.78);
  });

  it("keeps exact private points separate from coarse-only privacy cells", () => {
    const data = personalFindingMapData([
      {
        id: "exact",
        reportedSpeciesName: "Cep",
        exactLocation: { longitude: 2.15, latitude: 42.05, accuracyM: 8 },
        cellBounds: { west: 2.1, south: 42, east: 2.2, north: 42.1 },
      },
      {
        id: "coarse",
        reportedSpeciesName: "Rossinyol",
        exactLocation: null,
        cellBounds: { west: 1.9, south: 41.8, east: 2, north: 41.9 },
      },
    ]);

    expect(data.exactPoints.features).toHaveLength(1);
    expect(data.exactPoints.features[0]?.geometry.coordinates).toEqual([2.15, 42.05]);
    expect(data.coarseCells.features).toHaveLength(1);
    expect(data.coarseCells.features[0]?.geometry.coordinates[0]).toEqual([
      [1.9, 41.8],
      [2, 41.8],
      [2, 41.9],
      [1.9, 41.9],
      [1.9, 41.8],
    ]);
  });

  it("fits personal maps to exact points and complete coarse privacy cells", () => {
    expect(personalFindingBounds([
      {
        id: "exact",
        reportedSpeciesName: "Cep",
        exactLocation: { longitude: 2.15, latitude: 42.05, accuracyM: 8 },
        cellBounds: { west: 2.1, south: 42, east: 2.2, north: 42.1 },
      },
      {
        id: "coarse",
        reportedSpeciesName: "Rossinyol",
        exactLocation: null,
        cellBounds: { west: 1.9, south: 41.8, east: 2, north: 41.9 },
      },
    ])).toEqual({ west: 1.9, south: 41.8, east: 2.15, north: 42.05 });
  });

  it("has no personal map bounds when there are no findings", () => {
    expect(personalFindingBounds([])).toBeNull();
  });
});
