import "server-only";

import { renderInstagramSpeciesSlide } from "@/src/lib/instagram-species-card-render";
import {
  INSTAGRAM_SPECIES_SLIDE_COUNT,
  instagramSpeciesPublicationForDate,
  instagramSpeciesPublicationForSpecies,
} from "@/src/lib/instagram-species-series";

export async function instagramSpeciesImageResponse({
  cacheSeconds,
  publicationDate,
  requestedSlide,
  speciesId,
}: {
  cacheSeconds: number;
  publicationDate: string | null;
  requestedSlide: number;
  speciesId?: string | null;
}) {
  if (!publicationDate) return new Response("Species publication date required", { status: 400 });

  let publication;
  try {
    publication = speciesId
      ? { ...instagramSpeciesPublicationForSpecies(speciesId), publicationDate }
      : instagramSpeciesPublicationForDate(publicationDate);
  } catch {
    return new Response("Invalid species publication date", { status: 400 });
  }
  const slide = Number.isInteger(requestedSlide) ? requestedSlide : 1;
  if (slide < 1 || slide > INSTAGRAM_SPECIES_SLIDE_COUNT) {
    return new Response("Invalid species slide", { status: 400 });
  }

  const image = await renderInstagramSpeciesSlide({ profile: publication.profile, slide });
  image.headers.set(
    "Cache-Control",
    `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`,
  );
  return image;
}
