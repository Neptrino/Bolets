import { describe, expect, it } from "vitest";
import { aggregateLocalGuideFacts, localGuideFactsSchema } from "@/src/lib/local-guide-facts";
import type { PotentialHabitatCell, SpatialBounds } from "@/src/lib/types";

const bounds: SpatialBounds = { west: 2, south: 42, east: 2.2, north: 42.2 };

function cell(
  cellId: string,
  coverage: number,
  altitudeWeightedCoverage: number,
  cellBounds: PotentialHabitatCell["cellBounds"] = [[2.01, 42.01], [2.02, 42.02]],
): PotentialHabitatCell {
  return {
    speciesId: "boletus-edulis",
    cellId,
    regionId: "pirineus",
    gridSizeM: 1000,
    cellBounds,
    coverage,
    altitudeWeightedCoverage,
    eligibleCellCount: 16,
    sourceResolutionM: 250,
    confidence: "high",
    source: ["icgc-land-cover", "icgc-terrain", "soilgrids"],
  };
}

describe("local guide facts", () => {
  it("derives area-equivalent habitat facts from the public 1 km lattice", () => {
    const facts = aggregateLocalGuideFacts([
      cell("one", 0.5, 0.4),
      cell("two", 0.25, 0.1),
      cell("outside", 1, 1, [[2.3, 42.3], [2.31, 42.31]]),
    ], bounds, "entorn de Camprodon");

    expect(facts).not.toBeNull();
    expect(facts?.scope).toBe("public-reading-window");
    expect(facts?.gridSizeM).toBe(1000);
    expect(facts?.facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ metric: "compatible-area", value: 0.75, unit: "km²" }),
      expect.objectContaining({ metric: "compatible-cells", value: 2, unit: "cel·les" }),
      expect.objectContaining({ metric: "altitude-retention", value: 100 * (0.5 / 0.75), unit: "%" }),
    ]));
    expect(localGuideFactsSchema.parse(facts)).toEqual(facts);
  });

  it("withholds facts instead of treating missing or invalid coverage as evidence", () => {
    expect(aggregateLocalGuideFacts([], bounds, "entorn de Camprodon")).toBeNull();
    expect(aggregateLocalGuideFacts([
      cell("invalid", 0.2, 0.3),
    ], bounds, "entorn de Camprodon")).toBeNull();
  });

  it("does not count cells whose centre falls outside the public reading window", () => {
    expect(aggregateLocalGuideFacts([
      cell("outside", 0.8, 0.8, [[2.205, 42.1], [2.215, 42.11]]),
    ], bounds, "entorn de Camprodon")).toBeNull();
  });
});
