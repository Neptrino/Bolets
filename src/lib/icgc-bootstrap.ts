import { STATIC_MEDIA_VERSION } from "./static-media.ts";

export const ICGC_BOOTSTRAP_VERSION = "2026-09-13";
export const ICGC_BOOTSTRAP_KEYS = ["relief", "references"].flatMap(layer =>
  [63, 64, 65].flatMap(x => [46, 47, 48].map(y => `${layer}/7/${x}/${y}`)),
);
const keys = new Set(ICGC_BOOTSTRAP_KEYS);
const routePrefix = "/api/map-tiles/icgc/v2/";

export function icgcBootstrapAssetPath(key: string) {
  return keys.has(key)
    ? `/media/optimized/${STATIC_MEDIA_VERSION}/icgc-bootstrap/${ICGC_BOOTSTRAP_VERSION}/${key}.webp`
    : undefined;
}

/** Only the frozen opening-view tiles use the static CDN; other views keep WMS. */
export function icgcBootstrapTileUrl(url: string) {
  return url.startsWith(routePrefix) ? icgcBootstrapAssetPath(url.slice(routePrefix.length)) : undefined;
}
