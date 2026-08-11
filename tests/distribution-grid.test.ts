import { describe, expect, it } from "vitest";
import { cataloniaLandRings } from "@/data/catalonia-land";
import { createDistributionGrid } from "@/src/lib/distribution-grid";

const polygons = [
  {
    regionId: "north" as const,
    coordinates: [[0, 1], [2, 1], [2, 2], [0, 2], [0, 1]] as [number, number][]
  },
  {
    regionId: "south" as const,
    coordinates: [[0, 0], [2, 0], [2, 1], [0, 1], [0, 0]] as [number, number][]
  }
];

describe("distribution grid", () => {
  it("creates cells only inside active ecological regions", () => {
    const cells = createDistributionGrid(polygons, ["north"], {
      bounds: [[0, 0], [2, 2]],
      longitudeStep: 1,
      latitudeStep: 1
    });

    expect(cells).toHaveLength(2);
    expect(cells.every((cell) => cell.regionId === "north")).toBe(true);
    expect(cells.map((cell) => cell.bounds)).toEqual([
      [[0, 1], [1, 2]],
      [[1, 1], [2, 2]]
    ]);
  });

  it("returns no cells when the species has no active region", () => {
    expect(createDistributionGrid(polygons, [], {
      bounds: [[0, 0], [2, 2]],
      longitudeStep: 1,
      latitudeStep: 1
    })).toEqual([]);
  });

  it("excludes cells whose centres fall outside the land mask", () => {
    const cells = createDistributionGrid(polygons, ["north"], {
      bounds: [[0, 1], [2, 2]],
      longitudeStep: 1,
      latitudeStep: 1,
      landMask: [[[0, 1], [1, 1], [1, 2], [0, 2], [0, 1]]]
    });

    expect(cells).toEqual([{
      regionId: "north",
      bounds: [[0, 1], [1, 2]]
    }]);
  });

  it("keeps Barcelona land cells while excluding Mediterranean cells", () => {
    const coastalRegion = [{
      regionId: "coast" as const,
      coordinates: [[2, 41.1], [2.8, 41.1], [2.8, 41.6], [2, 41.6], [2, 41.1]] as [number, number][]
    }];
    const cellsAt = (bounds: [[number, number], [number, number]]) => createDistributionGrid(coastalRegion, ["coast"], {
      bounds,
      longitudeStep: bounds[1][0] - bounds[0][0],
      latitudeStep: bounds[1][1] - bounds[0][1],
      landMask: cataloniaLandRings
    });

    expect(cellsAt([[2, 41.3], [2.2, 41.5]])).toHaveLength(1);
    expect(cellsAt([[2.5, 41.1], [2.7, 41.3]])).toEqual([]);
  });
});
