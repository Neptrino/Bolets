import { describe, expect, it } from "vitest";
import { catalogueSpecies } from "@/data/catalogue";
import {
  speciesNameGlossaryRows,
  speciesNameSources,
  spanishSpeciesNames,
} from "@/data/species-common-names";

describe("species common-name glossary", () => {
  it("covers every catalogue species without creating parallel species records", () => {
    expect(speciesNameGlossaryRows).toHaveLength(catalogueSpecies.length);
    expect(speciesNameGlossaryRows.map((row) => row.speciesId)).toEqual(catalogueSpecies.map((species) => species.speciesId));
    expect(speciesNameGlossaryRows.every((row) => row.spanish)).toBe(true);
  });

  it("only assigns documented Spanish names to catalogue species", () => {
    const catalogueIds = new Set(catalogueSpecies.map((species) => species.speciesId));
    for (const [speciesId, names] of Object.entries(spanishSpeciesNames)) {
      expect(catalogueIds.has(speciesId), speciesId).toBe(true);
      expect(names.primary.trim(), speciesId).not.toBe("");
      expect(new Set(names.sourceIds).size, speciesId).toBe(names.sourceIds.length);
      for (const sourceId of names.sourceIds) expect(speciesNameSources[sourceId], `${speciesId}:${sourceId}`).toBeDefined();
    }
  });

  it("includes the priority Spanish search terms", () => {
    expect(spanishSpeciesNames["lactarius-deliciosus"].primary).toBe("níscalo");
    expect(spanishSpeciesNames["boletus-edulis"].primary).toBe("boleto");
    expect(spanishSpeciesNames["cantharellus-cibarius"].primary).toBe("rebozuelo");
    expect(spanishSpeciesNames["morchella-esculenta"].primary).toBe("colmenilla");
  });
});
