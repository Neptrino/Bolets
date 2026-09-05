import { ImageResponse } from "next/og";
import { instagramPublicImage } from "@/src/lib/instagram-image-assets";

import {
  INSTAGRAM_SPECIES_CARD_HEIGHT,
  INSTAGRAM_SPECIES_CARD_WIDTH,
  InstagramSpeciesCard,
} from "@/components/instagram-species-card";
import { speciesSlugForId } from "@/data/species-slugs";
import { getSpeciesMapPageBySpeciesId } from "@/src/lib/species-map-pages";
import { instagramCardFonts } from "@/src/lib/instagram-card-fonts";
import { instagramSpeciesLookalikeImage } from "@/src/lib/instagram-species-series";
import type { SpeciesFieldCardProfile } from "@/src/lib/species-field-card";

const SITE_HOST = "bolets.app";

export function instagramSpeciesCardUrls(profile: Pick<SpeciesFieldCardProfile, "speciesId">) {
  const mapPage = getSpeciesMapPageBySpeciesId(profile.speciesId);
  return {
    speciesUrl: `${SITE_HOST}/bolets/${speciesSlugForId(profile.speciesId)}`,
    // Only the main species have a dedicated map page; the rest point at the
    // daily overview.
    mapUrl: mapPage ? `${SITE_HOST}/map/${mapPage.slug}` : `${SITE_HOST}/bolets-avui`,
  };
}

export async function renderInstagramSpeciesSlide({
  profile,
  rootDirectory = process.cwd(),
  slide,
}: {
  profile: SpeciesFieldCardProfile;
  rootDirectory?: string;
  slide: number;
}) {
  const lookalike = slide === 4 ? instagramSpeciesLookalikeImage(profile) : null;
  const [fonts, imageDataUrl, lookalikeImageDataUrl] = await Promise.all([
    instagramCardFonts(rootDirectory),
    instagramPublicImage(profile.imagePath, rootDirectory),
    lookalike ? instagramPublicImage(lookalike.imagePath, rootDirectory) : Promise.resolve(null),
  ]);
  const urls = instagramSpeciesCardUrls(profile);
  return new ImageResponse(
    <InstagramSpeciesCard
      imageDataUrl={imageDataUrl}
      lookalikeCredit={lookalike ? { attribution: lookalike.attribution, license: lookalike.license } : null}
      lookalikeImageDataUrl={lookalikeImageDataUrl}
      mapUrl={urls.mapUrl}
      profile={profile}
      slide={slide}
      speciesUrl={urls.speciesUrl}
    />,
    { width: INSTAGRAM_SPECIES_CARD_WIDTH, height: INSTAGRAM_SPECIES_CARD_HEIGHT, fonts },
  );
}
