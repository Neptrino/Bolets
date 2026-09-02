import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";

import { InstagramSpeciesCard } from "@/components/instagram-species-card";
import {
  INSTAGRAM_SPECIES_SLIDE_COUNT,
  instagramSpeciesPublicationForDate,
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

  let publication: ReturnType<typeof instagramSpeciesPublicationForDate>;
  try {
    publication = instagramSpeciesPublicationForDate(publicationDate, speciesId);
  } catch {
    return new Response("Invalid species publication date", { status: 400 });
  }
  const slide = Number.isInteger(requestedSlide) ? requestedSlide : 1;
  if (slide < 1 || slide > INSTAGRAM_SPECIES_SLIDE_COUNT) {
    return new Response("Invalid species slide", { status: 400 });
  }

  const imageFile = await readFile(join(
    process.cwd(),
    "public",
    publication.profile.imagePath.replace(/^\//, ""),
  ));
  // ImageResponse does not decode embedded WebP. Convert the catalogue image
  // in memory and cache the completed social card at the response boundary.
  const imageJpeg = await sharp(imageFile).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  const imageDataUrl = `data:image/jpeg;base64,${imageJpeg.toString("base64")}`;
  const image = new ImageResponse(
    <InstagramSpeciesCard
      imageDataUrl={imageDataUrl}
      position={publication.position}
      profile={publication.profile}
      slide={slide}
      total={publication.total}
    />,
    { width: 1080, height: 1350 },
  );
  image.headers.set(
    "Cache-Control",
    `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`,
  );
  return image;
}
