import { catalogueSpecies, getCatalogueSpecies } from "@/data/catalogue";
import { toSpeciesFieldCardProfile } from "@/src/lib/species-field-card";

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
