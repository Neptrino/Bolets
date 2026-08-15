import type { MediaAsset, SpeciesProfile } from "@/src/lib/types";

export const SITE_NAME = "Bolets Atles";
export const SITE_URL = "https://bolets.app";
export const DEFAULT_DESCRIPTION =
  "Predicció de bolets a Catalunya: consulteu les condicions actuals per espècie i zona, el mapa de predicció i les fitxes d’hàbitat.";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/opengraph-image`;

const META_DESCRIPTION_MAX_LENGTH = 155;
// The root title template adds ` | Bolets Atles` (15 characters). Keep page
// titles below this limit so the full document title stays within 64 characters.
const PAGE_TITLE_MAX_LENGTH = 49;

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function speciesPath(species: Pick<SpeciesProfile, "speciesId">) {
  return `/bolets/${species.speciesId}`;
}

export function speciesDescription(species: SpeciesProfile) {
  const { commonName, scientificName, shortDescription } = species.identity;
  const description = `${commonName} (${scientificName}): ${shortDescription}`;
  return truncateSeoText(description, META_DESCRIPTION_MAX_LENGTH);
}

export function pageTitle(title: string) {
  return truncateSeoText(title, PAGE_TITLE_MAX_LENGTH);
}

export function metaDescription(description: string) {
  return truncateSeoText(description, META_DESCRIPTION_MAX_LENGTH);
}

function truncateSeoText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  const truncated = value
    .slice(0, maxLength)
    .replace(/\s+\S*$/, "")
    .trimEnd();

  return `${truncated}…`;
}

export function mediaUrl(media: MediaAsset | undefined) {
  if (!media) return undefined;
  return absoluteUrl(media.localPath ?? media.imageUrl ?? media.sourceUrl);
}

export function speciesImage(species: SpeciesProfile) {
  return mediaUrl(
    species.media.find((asset) => asset.identificationReference) ??
      species.media[0],
  );
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
