import type { MediaAsset, SpeciesProfile } from "@/src/lib/types";

export const SITE_NAME = "Bolets Atles";
export const SITE_URL = "https://bolets.app";
export const DEFAULT_DESCRIPTION =
  "Atles dels bolets de Catalunya amb fitxes d’identificació, hàbitats, temporades i mapes de compatibilitat ecològica.";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/opengraph-image`;

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function speciesPath(species: SpeciesProfile) {
  return `/bolets/${species.speciesId}`;
}

export function speciesDescription(species: SpeciesProfile) {
  const { commonName, scientificName, shortDescription } = species.identity;
  return `${commonName} (${scientificName}): ${shortDescription}`;
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
