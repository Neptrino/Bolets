import { describe, expect, it } from "vitest";
import { catalogueSpecies } from "@/data/catalogue";
import { speciesIdentifiers, speciesSameAs } from "@/data/species-identifiers";

describe("species identifiers", () => {
  it("links every catalogue species to Wikidata and GBIF", () => {
    const missing = catalogueSpecies
      .filter((species) => !speciesIdentifiers[species.speciesId]?.wikidata || !speciesIdentifiers[species.speciesId]?.gbif)
      .map((species) => species.speciesId);
    expect(missing).toEqual([]);
  });

  it("keeps identifiers only for species in the catalogue", () => {
    const known = new Set(catalogueSpecies.map((species) => species.speciesId));
    expect(Object.keys(speciesIdentifiers).filter((id) => !known.has(id))).toEqual([]);
  });

  it("uses well-formed ids", () => {
    for (const [speciesId, ids] of Object.entries(speciesIdentifiers)) {
      expect(ids.wikidata, speciesId).toMatch(/^Q\d+$/u);
      expect(Number.isInteger(ids.gbif), speciesId).toBe(true);
    }
  });

  it("builds the sameAs URLs", () => {
    expect(speciesSameAs("lactarius-sanguifluus")).toEqual([
      "https://www.wikidata.org/wiki/Q961386",
      "https://www.gbif.org/species/5248648",
    ]);
    expect(speciesSameAs("unknown-species")).toEqual([]);
  });
});
