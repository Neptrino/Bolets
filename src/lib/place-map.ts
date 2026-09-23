import type { AreaProfile, PlaceProfile } from "@/data/location-pages";
import type { SpatialBounds } from "@/src/lib/types";

/**
 * Static topographic portraits for the place and zone hub heroes. One ICGC WMS
 * request per hub at render time (scripts/render-place-maps.mts); the WebP
 * files are committed. Bump the version and re-render when framing, tint or
 * size change.
 */
export const PLACE_MAP_VERSION = "v4";
export const PLACE_MAP_WIDTH = 650;
export const PLACE_MAP_HEIGHT = 812;
/** Full-width guide hero: the place sits right of centre, under the species pin. */
export const PLACE_BANNER_WIDTH = 1600;
export const PLACE_BANNER_HEIGHT = 720;
export const PLACE_BANNER_METRES_PER_PIXEL = 14;
export const PLACE_BANNER_FOCUS_X = 0.72;
/** Ground metres per image pixel for a place: ~11 km across, enough to read the valley. */
export const PLACE_MAP_METRES_PER_PIXEL = 17;
/** Pre-rendered by `npm run maps:places`; committed under public/. */
export const PLACE_MAP_DIRECTORY = "public/media/place-maps";
/** Warm the ICGC greys towards the site's paper tone. */
export const PLACE_MAP_TINT = "#d8ccaa";
export const PLACE_MAP_BRIGHTNESS = 1.03;

const EARTH_RADIUS_M = 6378137;
const METRES_PER_DEGREE = 111_320;

export type HubMapSpec = {
  width: number;
  height: number;
  bbox: readonly [west: number, south: number, east: number, north: number];
  groundWidthKm: number;
  scaleBar: { metres: number; widthPercent: number };
  /** Where the subject sits in the frame, as fractions of width and height. */
  focus: { x: number; y: number };
  /** ICGC base: grey relief tinted to paper for portraits, full colour for the guide banner. */
  layer: "topografic-gris" | "estandard";
};

function toWebMercator(longitude: number, latitude: number) {
  const x = (longitude * Math.PI / 180) * EARTH_RADIUS_M;
  const y = Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI / 180) / 2)) * EARTH_RADIUS_M;
  return { x, y };
}

/** A round scale bar that stays between ~12% and ~35% of the image width. */
function scaleBarMetres(groundWidthMetres: number) {
  const candidates = [1000, 2000, 5000, 10_000, 20_000, 50_000];
  return candidates.find((metres) => metres / groundWidthMetres >= 0.12) ?? candidates[candidates.length - 1];
}

export function hubMapSpec(
  subject: [longitude: number, latitude: number],
  metresPerPixel: number,
  frame: { width: number; height: number; focusX?: number; layer?: HubMapSpec["layer"] } = { width: PLACE_MAP_WIDTH, height: PLACE_MAP_HEIGHT },
): HubMapSpec {
  const [longitude, latitude] = subject;
  const focusX = frame.focusX ?? 0.5;
  const mercatorSubject = toWebMercator(longitude, latitude);
  // Mercator stretches lengths by 1/cos(lat); keep the ground scale constant
  // so the scale bar and the framing mean the same thing in every comarca.
  const mercatorPerPixel = metresPerPixel / Math.cos(latitude * Math.PI / 180);
  const frameWidth = frame.width * mercatorPerPixel;
  const frameHeight = frame.height * mercatorPerPixel;
  // Shift the frame so the subject lands at focusX of the width.
  const west = mercatorSubject.x - frameWidth * focusX;
  const south = mercatorSubject.y - frameHeight / 2;
  const groundWidthMetres = frame.width * metresPerPixel;
  const barMetres = scaleBarMetres(groundWidthMetres);
  return {
    width: frame.width,
    height: frame.height,
    bbox: [west, south, west + frameWidth, south + frameHeight] as const,
    groundWidthKm: groundWidthMetres / 1000,
    scaleBar: { metres: barMetres, widthPercent: (barMetres / groundWidthMetres) * 100 },
    focus: { x: focusX, y: 0.5 },
    layer: frame.layer ?? "topografic-gris",
  };
}

/** Landscape band for the local guide hero, with the place under the pin at the right. */
export function placeBannerSpec(place: PlaceProfile) {
  return hubMapSpec(place.mapCentre, PLACE_BANNER_METRES_PER_PIXEL, { width: PLACE_BANNER_WIDTH, height: PLACE_BANNER_HEIGHT, focusX: PLACE_BANNER_FOCUS_X, layer: "estandard" });
}

export function placeMapSpec(place: PlaceProfile) {
  return hubMapSpec(place.mapCentre, PLACE_MAP_METRES_PER_PIXEL);
}

/** Frame the whole reading window of the comarca or massís (its `areaBounds`), with a little air. */
export function areaMapSpec(bounds: SpatialBounds) {
  const latitude = (bounds.north + bounds.south) / 2;
  const widthMetres = (bounds.east - bounds.west) * METRES_PER_DEGREE * Math.cos(latitude * Math.PI / 180);
  const heightMetres = (bounds.north - bounds.south) * METRES_PER_DEGREE;
  const metresPerPixel = Math.max(widthMetres / PLACE_MAP_WIDTH, heightMetres / PLACE_MAP_HEIGHT) * 1.08;
  return hubMapSpec([(bounds.east + bounds.west) / 2, latitude], metresPerPixel);
}

export function placeMapFilePath(place: PlaceProfile, variant: "portrait" | "banner" = "portrait") {
  return `${PLACE_MAP_DIRECTORY}/${place.areaSlug}/${place.slug}${variant === "banner" ? "-banner" : ""}.webp`;
}

export function areaMapFilePath(area: AreaProfile) {
  return `${PLACE_MAP_DIRECTORY}/${area.slug}.webp`;
}

export function placeMapPath(place: PlaceProfile, variant: "portrait" | "banner" = "portrait") {
  return `/media/place-maps/${place.areaSlug}/${place.slug}${variant === "banner" ? "-banner" : ""}.webp?v=${PLACE_MAP_VERSION}`;
}

/** Portrait of a multi-area editorial hub such as the Pyrenees, framed on its areas. */
export const PIRINEU_MAP_SLUG = "pirineu";

export function hubRegionMapFilePath(slug: string) {
  return `${PLACE_MAP_DIRECTORY}/${slug}.webp`;
}

export function hubRegionMapPath(slug: string) {
  return `/media/place-maps/${slug}.webp?v=${PLACE_MAP_VERSION}`;
}

export function areaMapPath(area: AreaProfile) {
  return `/media/place-maps/${area.slug}.webp?v=${PLACE_MAP_VERSION}`;
}

/** ICGC topographic base (hillshade + references), the layers the live map uses. */
export function hubMapUpstreamUrl(spec: HubMapSpec) {
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: spec.layer,
    STYLES: "",
    FORMAT: "image/png",
    TRANSPARENT: "FALSE",
    BGCOLOR: spec.layer === "estandard" ? "0xF2EBD5" : "0xEEEDE8",
    SRS: "EPSG:3857",
    BBOX: spec.bbox.join(","),
    WIDTH: String(spec.width),
    HEIGHT: String(spec.height),
  });
  return `https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wms?${params}`;
}

export function placeMapUpstreamUrl(place: PlaceProfile) {
  return hubMapUpstreamUrl(placeMapSpec(place));
}
