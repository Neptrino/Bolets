import type { CatalogueGroup } from "@/src/lib/catalogue-list";
import type { SeasonGuideId } from "@/src/lib/season-guides";
import type { SpeciesCardProfile } from "@/src/lib/species-card-profile";

/* In-page filters for the /bolets directory. Kept free of catalogue data so the
   client bundle only carries the parsing and matching; each card arrives with its
   group and seasons already derived on the server. */

/** A directory card with the edibility group and seasons the filters match on. */
export type CatalogueDirectoryEntry = SpeciesCardProfile & {
  catalogueGroup: CatalogueGroup;
  catalogueSeasons: SeasonGuideId[];
};

export interface CatalogueFilters {
  group: CatalogueGroup | null;
  season: SeasonGuideId | null;
}

export const catalogueGroupOptions = [
  { value: "edible", param: "comestibles", label: "Comestibles" },
  { value: "toxic", param: "toxics", label: "Tòxics" },
  { value: "other", param: "no-comestibles", label: "No comestibles" },
] as const satisfies ReadonlyArray<{ value: CatalogueGroup; param: string; label: string }>;

export const catalogueSeasonOptions = [
  { value: "primavera", label: "Primavera" },
  { value: "estiu", label: "Estiu" },
  { value: "tardor", label: "Tardor" },
  { value: "hivern", label: "Hivern" },
] as const satisfies ReadonlyArray<{ value: SeasonGuideId; label: string }>;

export const emptyCatalogueFilters: CatalogueFilters = { group: null, season: null };

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function parseCatalogueFilters(params: { tipus?: string | string[]; estacio?: string | string[] }): CatalogueFilters {
  const tipus = single(params.tipus);
  const estacio = single(params.estacio);
  return {
    group: catalogueGroupOptions.find((option) => option.param === tipus)?.value ?? null,
    season: catalogueSeasonOptions.find((option) => option.value === estacio)?.value ?? null,
  };
}

/** Query string for the directory state, e.g. "?q=cep&tipus=comestibles&estacio=tardor". */
export function catalogueFilterSearch(query: string, filters: CatalogueFilters) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  const group = catalogueGroupOptions.find((option) => option.value === filters.group);
  if (group) params.set("tipus", group.param);
  if (filters.season) params.set("estacio", filters.season);
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function matchesCatalogueFilters(species: CatalogueDirectoryEntry, filters: CatalogueFilters) {
  return (!filters.group || species.catalogueGroup === filters.group)
    && (!filters.season || species.catalogueSeasons.includes(filters.season));
}
