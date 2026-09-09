import { describe, expect, it } from "vitest";
import {
  bestChildrenByParent,
  bucketContaining,
  coarseParentCellId,
  coverageWeightedScore,
  summariseChildrenByParent,
  summarisesChildren,
} from "@/src/lib/coarse-cell-summary";

describe("coarse cell summary", () => {
  it("summarises only the 5 km and 10 km grids", () => {
    expect(summarisesChildren(2500)).toBe(false);
    expect(summarisesChildren(5000)).toBe(true);
    expect(summarisesChildren(10000)).toBe(true);
  });

  it("derives the parent id from the child's grid indices", () => {
    expect(coarseParentCellId("epsg25831:2500:158:1873", 5000)).toBe("epsg25831:5000:79:936");
    expect(coarseParentCellId("epsg25831:2500:158:1873", 10000)).toBe("epsg25831:10000:39:468");
    expect(coarseParentCellId("epsg25831:1000:158:1873", 5000)).toBe("epsg25831:5000:31:374");
    expect(coarseParentCellId("epsg25831:5000:79:936", 2500 as never)).toBeNull();
    expect(coarseParentCellId("not-a-cell", 5000)).toBeNull();
  });

  it("keeps the best scored child per parent and skips withheld readings", () => {
    const best = bestChildrenByParent([
      { cellId: "epsg25831:2500:158:1872", score: 34 },
      { cellId: "epsg25831:2500:158:1873", score: 41 },
      { cellId: "epsg25831:2500:159:1872", score: null },
      { cellId: "epsg25831:2500:159:1873", score: 10 },
      { cellId: "epsg25831:2500:160:1873", score: 0 },
    ], 5000);
    expect(best.get("epsg25831:5000:79:936")?.cellId).toBe("epsg25831:2500:158:1873");
    expect(best.get("epsg25831:5000:80:936")?.score).toBe(0);
  });

  it("breaks score ties on the lowest cell id so the pick is stable", () => {
    const best = bestChildrenByParent([
      { cellId: "epsg25831:2500:159:1873", score: 41 },
      { cellId: "epsg25831:2500:158:1873", score: 41 },
    ], 5000);
    expect(best.get("epsg25831:5000:79:936")?.cellId).toBe("epsg25831:2500:158:1873");
  });

  it("finds the bucket holding a cell's centre", () => {
    const buckets = [
      { west: 1, south: 42, east: 1.5, north: 42.5 },
      { west: 1.5, south: 42, east: 2, north: 42.5 },
    ];
    expect(bucketContaining(buckets, [[1.6, 42.1], [1.65, 42.15]])).toBe(buckets[1]);
    expect(bucketContaining(buckets, [[2.6, 42.1], [2.65, 42.15]])).toBeUndefined();
  });

  it("colours a parent by the coverage-weighted mean of its children", () => {
    expect(coverageWeightedScore([
      { cellId: "a", score: 41, habitatCoverage: 0.6 },
      { cellId: "b", score: 34, habitatCoverage: 0.6 },
      { cellId: "c", score: 20, habitatCoverage: 0.2 },
      { cellId: "d", score: 10, habitatCoverage: 0 },
    ])).toBe(35);
    // Missing coverage shares the mean weight; no coverage at all is a plain mean.
    expect(coverageWeightedScore([
      { cellId: "a", score: 40, habitatCoverage: null },
      { cellId: "b", score: 20, habitatCoverage: 0.5 },
    ])).toBe(30);
    expect(coverageWeightedScore([
      { cellId: "a", score: 40, habitatCoverage: null },
      { cellId: "b", score: 21, habitatCoverage: null },
    ])).toBe(31);
    expect(coverageWeightedScore([{ cellId: "a", score: null, habitatCoverage: 0.5 }])).toBeNull();
    expect(coverageWeightedScore([{ cellId: "a", score: 30, habitatCoverage: 0 }])).toBe(30);
  });

  it("pairs each parent's mean colour with its best child", () => {
    const summaries = summariseChildrenByParent([
      { cellId: "epsg25831:2500:158:1872", score: 34, habitatCoverage: 0.6 },
      { cellId: "epsg25831:2500:158:1873", score: 41, habitatCoverage: 0.6 },
      { cellId: "epsg25831:2500:159:1872", score: null, habitatCoverage: 0.6 },
      { cellId: "epsg25831:2500:159:1873", score: 10, habitatCoverage: 0.1 },
    ], 5000);
    const summary = summaries.get("epsg25831:5000:79:936");
    expect(summary?.best.cellId).toBe("epsg25831:2500:158:1873");
    expect(summary?.score).toBe(Math.round((34 * 0.6 + 41 * 0.6 + 10 * 0.1) / 1.3));
  });
});
