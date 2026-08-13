import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import {
  speciesTerritoryGuides,
  territoryGuideForSpecies,
} from "@/src/lib/species-territory-guides";

describe("species territory guide registry", () => {
  it("publishes unique guide paths with valid, non-overlapping species", () => {
    expect(speciesTerritoryGuides.map((guide) => guide.path)).toEqual([
      "/zones/rovellons",
      "/zones/ceps",
    ]);

    const speciesIds = speciesTerritoryGuides.flatMap((guide) => [...guide.speciesIds]);
    expect(new Set(speciesIds).size).toBe(speciesIds.length);

    for (const guide of speciesTerritoryGuides) {
      expect(guide.title.length).toBeGreaterThan(20);
      expect(guide.description.length).toBeGreaterThan(60);
      for (const speciesId of guide.speciesIds) {
        expect(getSpecies(speciesId), speciesId).toBeDefined();
        expect(territoryGuideForSpecies(speciesId)).toBe(guide);
      }
    }
  });

  it("does not invent a territory guide for an unrelated species", () => {
    expect(territoryGuideForSpecies("amanita-phalloides")).toBeUndefined();
  });
});
