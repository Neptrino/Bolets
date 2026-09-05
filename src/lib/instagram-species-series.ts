import { catalogueSpecies, getCatalogueSpecies } from "@/data/catalogue";
import {
  toSpeciesFieldCardProfile,
  type SpeciesFieldCardProfile,
} from "@/src/lib/species-field-card";
import type { CatalogueSpecies, Month, SeasonalActivity } from "@/src/lib/types";

export const INSTAGRAM_SPECIES_SLIDE_COUNT = 5;
export const INSTAGRAM_SPECIES_PUBLICATION_WEEKDAYS = [1, 4] as const;

const SERIES_EPOCH = Date.UTC(2026, 7, 31);
const SERIES_EPOCH_OFFSET = -1;
const DAY_MS = 24 * 60 * 60 * 1_000;
const WEEK_MS = 7 * DAY_MS;

function publicationDateValue(publicationDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) {
    throw new Error(`Invalid Instagram species publication date: ${publicationDate}`);
  }
  const value = Date.parse(`${publicationDate}T00:00:00.000Z`);
  if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== publicationDate) {
    throw new Error(`Invalid Instagram species publication date: ${publicationDate}`);
  }
  return value;
}

export function instagramSpeciesPublicationForDate(
  publicationDate: string,
  speciesId?: string | null,
) {
  const value = publicationDateValue(publicationDate);
  const weekday = new Date(value).getUTCDay();
  const slot = INSTAGRAM_SPECIES_PUBLICATION_WEEKDAYS.indexOf(
    weekday as (typeof INSTAGRAM_SPECIES_PUBLICATION_WEEKDAYS)[number],
  );
  if (slot < 0) {
    throw new Error(`Instagram species publications run only on Monday and Thursday: ${publicationDate}`);
  }

  const week = Math.floor((value - SERIES_EPOCH) / WEEK_MS);
  // The automation is introduced on Thursday 3 September, so that first live
  // slot starts at catalogue position one rather than skipping Monday's item.
  const sequence = week * INSTAGRAM_SPECIES_PUBLICATION_WEEKDAYS.length
    + slot
    + SERIES_EPOCH_OFFSET;
  const automaticIndex = ((sequence % catalogueSpecies.length) + catalogueSpecies.length) % catalogueSpecies.length;
  const species = speciesId ? getCatalogueSpecies(speciesId) : catalogueSpecies[automaticIndex];
  if (!species) throw new Error(`Unknown Instagram species: ${speciesId}`);
  const index = catalogueSpecies.findIndex((candidate) => candidate.speciesId === species.speciesId);

  return {
    automaticSpeciesId: catalogueSpecies[automaticIndex]!.speciesId,
    position: index + 1,
    profile: toSpeciesFieldCardProfile(species),
    publicationDate,
    total: catalogueSpecies.length,
  };
}

export function instagramSpeciesPublicationForSpecies(speciesId: string) {
  const species = getCatalogueSpecies(speciesId);
  if (!species) throw new Error(`Unknown Instagram species: ${speciesId}`);
  const index = catalogueSpecies.findIndex((candidate) => candidate.speciesId === speciesId);
  return {
    position: index + 1,
    profile: toSpeciesFieldCardProfile(species),
    total: catalogueSpecies.length,
  };
}

const MONTH_KEYS: Month[] = ["gen", "feb", "mar", "abr", "mai", "jun", "jul", "ago", "set", "oct", "nov", "des"];

export type InstagramSpeciesSeasonActivity = SeasonalActivity | "unknown";

const SEASON_RANK: Record<InstagramSpeciesSeasonActivity, number> = {
  peak: 0,
  good: 1,
  moderate: 2,
  possible: 3,
  inactive: 4,
  unknown: 5,
};

export const INSTAGRAM_SPECIES_SEASON_LABELS: Record<InstagramSpeciesSeasonActivity, string> = {
  peak: "en pic",
  good: "bona època",
  moderate: "activitat moderada",
  possible: "poc probable",
  inactive: "fora de temporada",
  unknown: "temporada orientativa",
};

export function instagramSpeciesSeasonActivity(
  species: CatalogueSpecies,
  month: Month,
): InstagramSpeciesSeasonActivity {
  return "ecology" in species ? "unknown" : species.ecologicalConfig.seasonality[month];
}

// Orders the catalogue by how active each species is in the publication
// month, so the weekly post follows the forest instead of the alphabet.
// Reference species carry no monthly phenology and close the list.
export function instagramSpeciesSeasonRanking(publicationDate: string) {
  const month = MONTH_KEYS[new Date(publicationDateValue(publicationDate)).getUTCMonth()]!;
  return catalogueSpecies
    .map((species) => {
      const activity = instagramSpeciesSeasonActivity(species, month);
      return {
        speciesId: species.speciesId,
        commonName: species.identity.commonName,
        scientificName: species.identity.scientificName,
        activity,
        label: `${species.identity.commonName} · ${species.identity.scientificName} · ${INSTAGRAM_SPECIES_SEASON_LABELS[activity]}`,
      };
    })
    .sort((left, right) => (
      SEASON_RANK[left.activity] - SEASON_RANK[right.activity]
      || left.commonName.localeCompare(right.commonName, "ca")
    ));
}

export interface InstagramSpeciesLookalikeImage {
  speciesId: string;
  imagePath: string;
  attribution: string | null;
  license: string | null;
}

// Most lookalikes are catalogue species themselves, which gives the
// comparison slide a real second photograph instead of a text panel.
export function instagramSpeciesLookalikeImage(
  profile: Pick<SpeciesFieldCardProfile, "lookalike">,
): InstagramSpeciesLookalikeImage | null {
  const scientificName = profile.lookalike?.scientificName.trim().toLowerCase();
  if (!scientificName) return null;
  const match = catalogueSpecies.find((species) => (
    species.identity.scientificName.trim().toLowerCase() === scientificName
  ));
  const image = match?.media.find((asset) => asset.identificationReference);
  if (!match || !image?.localPath) return null;
  return {
    speciesId: match.speciesId,
    imagePath: image.localPath,
    attribution: image.attribution.trim() || null,
    license: image.license.trim() || null,
  };
}
