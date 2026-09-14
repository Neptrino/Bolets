import type { MediaAsset } from "@/src/lib/types";

/**
 * Generated hero images for the local guide pages (`/zones/<area>/<place>/<species>`).
 *
 * The local guide hero is a full-bleed band with the heading on the left, so a
 * plain reference photograph rarely works there: its subject sits mid-frame and
 * the source resolution is too low for a 2560 px band. Entries here are
 * purpose-made compositions (currently produced with Magnific from the species
 * reference photograph) with the subject in the right half and a dark, quiet
 * left half. Store the file as `public/media/generated/hero/<speciesId>.webp`
 * at 3024×1296 px, the same proportions as the homepage hero, and describe the
 * derivation in `docs/local-guide-hero-images.md`.
 *
 * When a species has no entry, the guide page uses its identification reference
 * photograph in the same full-bleed band.
 */
export const localGuideHeroMedia: Partial<Record<string, MediaAsset>> = {};

export function localGuideHeroImage(speciesId: string): MediaAsset | undefined {
  return localGuideHeroMedia[speciesId];
}
