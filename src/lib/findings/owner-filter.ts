import { catalogueSpecies } from "@/data/catalogue";

export function normalizeOwnerFindingSearch(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("ca");
}

export function matchingOwnerFindingSpeciesIds(value: string) {
  const search = normalizeOwnerFindingSearch(value.trim()).slice(0, 80);
  if (!search) return undefined;
  return catalogueSpecies.filter((species) => normalizeOwnerFindingSearch([
    species.identity.commonName,
    species.identity.scientificName,
    species.speciesId,
  ].join(" ")).includes(search)).map((species) => species.speciesId);
}

export function ownerFindingsPage(value: string | null) {
  return Math.max(1, Math.min(10_000, Number.parseInt(value ?? "1", 10) || 1));
}
