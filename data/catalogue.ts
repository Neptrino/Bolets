import { speciesProfiles } from "@/data/species";
import { referenceSpeciesProfiles } from "@/data/reference-species";
import type { CatalogueSpecies } from "@/src/lib/types";

// Public discovery includes descriptive profiles; prediction consumers must
// continue using data/species, whose records have the required model evidence.
export const catalogueSpecies: CatalogueSpecies[] = [...speciesProfiles, ...referenceSpeciesProfiles]
  .sort((left, right) => left.identity.commonName.localeCompare(right.identity.commonName, "ca", { sensitivity: "base" }));

export function getCatalogueSpecies(id: string) {
  return catalogueSpecies.find((species) => species.speciesId === id);
}
