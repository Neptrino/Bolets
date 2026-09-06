import type { SpeciesCardProfile } from "@/src/lib/species-card-profile";

export function normalizeCatalogueSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ca-ES").replace(/[’'·-]/g, " ").replace(/\s+/g, " ").trim();
}

export function catalogueSearchQuery(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export function filterCatalogue(species: SpeciesCardProfile[], query: string) {
  const terms = normalizeCatalogueSearch(query).split(" ").filter(Boolean);
  if (!terms.length) return species;
  return species.filter((item) => {
    const names = [
      item.identity.commonName, item.identity.scientificName,
      ...item.identity.alternateNames, item.identity.family,
      ...(item.searchAliases ?? []),
    ];
    return names.some((name) => {
      const normalized = normalizeCatalogueSearch(name);
      return terms.every((term) => normalized.includes(term));
    });
  });
}
