import type { Metadata } from "next";
import { speciesSlugForId } from "@/data/species-slugs";
import type { MediaAsset, SpeciesProfile } from "@/src/lib/types";

export const SITE_NAME = "Bolets Atles";
export const SITE_URL = "https://bolets.app";
export const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/bolets.app/";
export const DEFAULT_DESCRIPTION =
  "Descobreix els bolets de Catalunya: noms, fotografies, identificació, hàbitat i temporada. Guies per aprendre i un mapa per preparar la sortida.";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/opengraph-image`;

const META_DESCRIPTION_MAX_LENGTH = 155;
// The root title template adds ` | Bolets Atles` (15 characters). Keep page
// titles below this limit so the full document title stays within 64 characters.
const PAGE_TITLE_MAX_LENGTH = 49;

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function speciesPath(species: Pick<SpeciesProfile, "speciesId">) {
  return `/bolets/${speciesSlugForId(species.speciesId)}`;
}

export function speciesFieldCardPath(species: Pick<SpeciesProfile, "speciesId">) {
  return `${speciesPath(species)}/targeta`;
}

export function speciesDescription(species: Pick<SpeciesProfile, "identity">) {
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

export function articleMetadata(
  canonicalPath: string,
  title: string,
  description: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      url: canonicalPath,
      title,
      description,
      images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
  };
}

function truncateSeoText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  const truncated = value
    .slice(0, maxLength)
    .replace(/\s+\S*$/, "")
    .trimEnd();

  return `${truncated}…`;
}

function mediaUrl(media: MediaAsset | undefined) {
  if (!media) return undefined;
  return absoluteUrl(media.localPath ?? media.imageUrl ?? media.sourceUrl);
}

export function speciesImage(species: Pick<SpeciesProfile, "media">) {
  return mediaUrl(
    species.media.find((asset) => asset.identificationReference) ??
      species.media[0],
  );
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
