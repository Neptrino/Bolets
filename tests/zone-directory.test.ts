import { describe, expect, it } from "vitest";
import { regionSelectItems } from "@/data/regions";
import { getSpecies, speciesProfiles } from "@/data/species";
import { SPECIES_DISCOVERY_PRIORITY } from "@/src/lib/species-discovery";
import { predictionZoneDirectory } from "@/src/lib/zone-directory";

const expectedRegionIds = [
  "pirineus",
  "prepirineus",
  "emporda",
  "catalunya-central",
  "muntanyes-interiors",
  "montseny",
  "serralades-costeres",
  "serralades-prelitorals",
  "ports",
];

describe("prediction zone directory", () => {
  it("lists the same nine broad regions as the prediction UI", () => {
    const zones = predictionZoneDirectory();

    expect(regionSelectItems.filter(({ value }) => value !== "altres").map(({ value }) => value))
      .toEqual(expectedRegionIds);
    expect(zones.map(({ regionId }) => regionId)).toEqual(expectedRegionIds);
    expect(zones.some(({ regionId }) => regionId === "altres")).toBe(false);
  });

  it("lists five canonical, edible and compatible species for every zone", () => {
    for (const zone of predictionZoneDirectory()) {
      expect(zone.species).toHaveLength(5);
      expect(new Set(zone.species.map(({ speciesId }) => speciesId))).toHaveLength(5);
      expect(zone.compatibleSpeciesCount).toBe(speciesProfiles.filter((species) =>
        species.predictionMode === "current" &&
        ["excellent_edible", "edible", "edible_with_conditions"].includes(species.identity.edibility) &&
        species.ecologicalConfig.regions.includes(zone.regionId)
      ).length);
      expect(zone.compatibleSpeciesCount).toBeGreaterThanOrEqual(zone.species.length);

      const compatiblePriorities = SPECIES_DISCOVERY_PRIORITY.filter((speciesId) =>
        getSpecies(speciesId)?.ecologicalConfig.regions.includes(zone.regionId)
      ).slice(0, zone.species.length);
      expect(zone.species.slice(0, compatiblePriorities.length).map(({ speciesId }) => speciesId))
        .toEqual(compatiblePriorities);

      for (const species of zone.species) {
        expect(getSpecies(species.speciesId)).toBe(species);
        expect(species.predictionMode).toBe("current");
        expect(["excellent_edible", "edible", "edible_with_conditions"])
          .toContain(species.identity.edibility);
        expect(species.ecologicalConfig.regions).toContain(zone.regionId);
      }
    }
  });
});
