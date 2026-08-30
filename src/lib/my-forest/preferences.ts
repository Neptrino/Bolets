import { catalogueSpecies } from "@/data/catalogue";
import { overviewHubs } from "@/src/lib/current-overview";
import type {
  ForestPreferenceOption,
  ForestPreferences,
} from "@/src/lib/my-forest/types";

const collator = new Intl.Collator("ca", { sensitivity: "base" });

export function forestPreferenceOptions() {
  const species: ForestPreferenceOption[] = catalogueSpecies
    .map((profile) => ({
      value: profile.speciesId,
      label: profile.identity.commonName,
      detail: profile.identity.scientificName,
    }))
    .sort((left, right) => collator.compare(left.label, right.label));
  const territories: ForestPreferenceOption[] = overviewHubs()
    .map((hub) => ({
      value: hub.slug,
      label: hub.name,
      detail: hub.typeLabel,
    }))
    .sort((left, right) => collator.compare(left.label, right.label));
  return { species, territories };
}

export function areCanonicalForestPreferences(preferences: ForestPreferences) {
  const options = forestPreferenceOptions();
  const speciesIds = new Set(options.species.map((option) => option.value));
  const territorySlugs = new Set(options.territories.map((option) => option.value));
  return preferences.speciesIds.every((id) => speciesIds.has(id)) &&
    preferences.territorySlugs.every((slug) => territorySlugs.has(slug));
}

export function normaliseCanonicalForestPreferences(
  preferences: ForestPreferences,
): ForestPreferences {
  const options = forestPreferenceOptions();
  const speciesIds = new Set(options.species.map((option) => option.value));
  const territorySlugs = new Set(options.territories.map((option) => option.value));
  return {
    speciesIds: preferences.speciesIds.filter((id) => speciesIds.has(id)),
    territorySlugs: preferences.territorySlugs.filter((slug) => territorySlugs.has(slug)),
  };
}
