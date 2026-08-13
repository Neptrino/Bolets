import { describe, expect, it } from "vitest";
import { speciesLocationPages } from "@/data/location-pages";
import { regionSelectItems } from "@/data/regions";
import { getSpecies } from "@/data/species";
import {
  cepSpeciesIds,
  cepTerritoryReadings,
} from "@/src/lib/ceps-guide";

describe("ceps territory guide model", () => {
  it("uses the four canonical current-prediction cep profiles", () => {
    expect(cepSpeciesIds).toEqual([
      "boletus-edulis",
      "boletus-pinophilus",
      "boletus-aereus",
      "boletus-reticulatus",
    ]);

    for (const speciesId of cepSpeciesIds) {
      const species = getSpecies(speciesId);
      expect(species, speciesId).toBeDefined();
      expect(species?.predictionMode, speciesId).toBe("current");
      expect(species?.identity.edibility, speciesId).toBe("excellent_edible");
    }
  });

  it("covers every broad prediction region with a compatible cep", () => {
    const expectedRegions = regionSelectItems
      .filter(({ value }) => value !== "altres")
      .map(({ value }) => value);

    expect(cepTerritoryReadings.map(({ region }) => region)).toEqual(
      expectedRegions,
    );

    for (const reading of cepTerritoryReadings) {
      expect(cepSpeciesIds).toContain(reading.speciesId);
      expect(
        getSpecies(reading.speciesId)?.ecologicalConfig.regions,
        `${reading.speciesId}:${reading.region}`,
      ).toContain(reading.region);
      expect(reading.description.length).toBeGreaterThan(80);
    }
  });

  it("reuses the ten existing local cep guides", () => {
    const localGuides = speciesLocationPages.filter((page) =>
      cepSpeciesIds.some((speciesId) => speciesId === page.speciesId),
    );

    expect(localGuides).toHaveLength(10);
    expect(new Set(localGuides.map(({ areaSlug }) => areaSlug))).toEqual(
      new Set(["ripolles", "bergueda", "montseny", "cerdanya"]),
    );
    expect(
      new Set(localGuides.map(({ speciesId }) => speciesId)),
    ).toEqual(new Set(["boletus-edulis", "boletus-pinophilus"]));
  });
});
