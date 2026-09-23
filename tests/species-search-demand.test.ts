import { describe, expect, it } from "vitest";
import { speciesProfiles } from "@/data/species";
import { compareBySearchDemand, speciesBySearchDemand } from "@/data/species-search-demand";

describe("species search demand order", () => {
  it("lists only catalogue species, once each", () => {
    const ids = new Set(speciesProfiles.map((species) => species.speciesId));
    expect(new Set(speciesBySearchDemand).size).toBe(speciesBySearchDemand.length);
    for (const id of speciesBySearchDemand) expect(ids.has(id), id).toBe(true);
  });

  it("puts listed species first and falls back to the name", () => {
    const sorted = [
      { speciesId: "zz-unlisted-b", name: "Bolet b" },
      { speciesId: "lactarius-sanguifluus", name: "Rovelló" },
      { speciesId: "zz-unlisted-a", name: "Bolet a" },
      { speciesId: "boletus-edulis", name: "Cep" },
    ].sort(compareBySearchDemand);
    expect(sorted.map((item) => item.name)).toEqual(["Cep", "Rovelló", "Bolet a", "Bolet b"]);
  });
});
