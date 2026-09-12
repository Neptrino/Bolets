const STATIC_MEDIA_ROOT = "/media/";

export const STATIC_MEDIA_VERSION = "v15";
export const STATIC_MEDIA_WIDTHS = [64, 96, 192, 256, 384, 640, 960, 1280, 1920] as const;
export const STATIC_MEDIA_FORMATS = ["webp", "avif"] as const;

export function staticMediaVariantPath(source: string, width: number, format: typeof STATIC_MEDIA_FORMATS[number] = "webp") {
  if (!source.startsWith(STATIC_MEDIA_ROOT) || !source.endsWith(".webp")) {
    throw new Error(`Static media must be a local WebP path: ${source}`);
  }

  const relativePath = source.slice(STATIC_MEDIA_ROOT.length, -".webp".length);
  return `${STATIC_MEDIA_ROOT}optimized/${STATIC_MEDIA_VERSION}/${relativePath}.w${width}.${format}`;
}

export function staticMediaLoader({ src, width }: { src: string; width: number }) {
  return staticMediaVariantPath(src, width);
}

export function staticAvifMediaLoader({ src, width }: { src: string; width: number }) {
  return staticMediaVariantPath(src, width, "avif");
}
