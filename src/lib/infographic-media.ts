import { staticMediaVariantPath } from "@/src/lib/static-media";

export const INFOGRAPHIC_POSTER_PATH = "/downloads/infografies/bolets-catalunya-infografia.png";
export const INFOGRAPHIC_PDF_PATH = "/downloads/infografies/bolets-catalunya-infografia.pdf";
export const INFOGRAPHIC_CREDITS_PATH = "/downloads/infografies/bolets-catalunya-infografia-credits.txt";
export const INFOGRAPHIC_PREVIEW_PATH = "/media/editorial/bolets-catalunya-infografia.webp";
export const INFOGRAPHIC_WIDTH = 3508;
export const INFOGRAPHIC_HEIGHT = 4961;

export function infographicVariantHeight(width: number) {
  return Math.round((width * INFOGRAPHIC_HEIGHT) / INFOGRAPHIC_WIDTH);
}

/** Largest variant the page renders: sitemap and structured data name the same file Google indexes. */
export const INFOGRAPHIC_INDEXED_WIDTH = 1920;
export const INFOGRAPHIC_INDEXED_IMAGE_PATH = staticMediaVariantPath(INFOGRAPHIC_PREVIEW_PATH, INFOGRAPHIC_INDEXED_WIDTH);
