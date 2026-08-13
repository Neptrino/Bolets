import { regionSelectItems } from "@/data/regions";
import { speciesProfiles } from "@/data/species";
import { compareSpeciesDiscoveryPriority } from "@/src/lib/species-discovery";
import type { SpeciesProfile } from "@/src/lib/types";

const edibleStatuses = new Set([
  "excellent_edible",
  "edible",
  "edible_with_conditions",
]);

export interface PredictionZoneDirectoryEntry {
  regionId: (typeof regionSelectItems)[number]["value"];
  label: string;
  compatibleSpeciesCount: number;
  species: SpeciesProfile[];
}

/**
 * Build the broad-zone directory from the same versioned regional ecology as
 * the prediction engine. Catalogue order supplies the editorial shortlist;
 * regional compatibility is never duplicated here.
 */
export function predictionZoneDirectory(
  speciesLimit = 5,
): PredictionZoneDirectoryEntry[] {
  return regionSelectItems
    .filter(({ value }) => value !== "altres")
    .map(({ value: regionId, label }) => {
      const compatibleSpecies = speciesProfiles.filter((species) =>
        species.predictionMode === "current" &&
        edibleStatuses.has(species.identity.edibility) &&
        species.ecologicalConfig.regions.includes(regionId)
      );

      return {
        regionId,
        label,
        compatibleSpeciesCount: compatibleSpecies.length,
        species: compatibleSpecies
          .sort(compareSpeciesDiscoveryPriority)
          .slice(0, speciesLimit),
      };
    });
}
