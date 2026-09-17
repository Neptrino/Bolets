import { rainfallRaster, type RainfallMapCell } from "@/components/region-map/rainfall-raster";
import {
  cataloniaStaticMapBounds,
  cataloniaStaticMapWmsUrl,
  cataloniaStaticOverlaySvg,
  cataloniaStaticRequestBounds,
  cataloniaStaticScreenPoint,
} from "@/src/lib/catalonia-static-map";
import type { SpatialBounds } from "@/src/lib/types";

/**
 * The accumulated-rain map: the same Catalonia frame and basemap the signed
 * daily card uses, painted with measured rainfall instead of scores.
 *
 * The public 2.5 km floor protects ecological locations, not weather, but
 * rain is read at 5 km here for a different reason: two cached reads cover
 * the whole country, and a rain field this wide carries no detail a finer
 * grid would add once the smoothing kernel has run.
 */

export const RAIN_MAP_WIDTH = 1200;
export const RAIN_MAP_HEIGHT = 1080;
export const RAIN_MAP_GRID_SIZE_M = 5000;

/** Accumulation window painted by the map, in days. */
export const RAIN_MAP_WINDOW_DAYS = 7;

export function rainMapBounds(width = RAIN_MAP_WIDTH, height = RAIN_MAP_HEIGHT) {
  return cataloniaStaticMapBounds(width, height);
}

export function rainMapWmsUrl(width = RAIN_MAP_WIDTH, height = RAIN_MAP_HEIGHT) {
  return cataloniaStaticMapWmsUrl(width, height);
}

export function rainMapRequestBounds(): SpatialBounds {
  return cataloniaStaticRequestBounds();
}

/** Catalonia in two halves: each stays inside the read's cell limit. */
export function rainMapReadBounds(): SpatialBounds[] {
  const bounds = rainMapRequestBounds();
  const midpoint = (bounds.west + bounds.east) / 2;
  return [
    { ...bounds, east: midpoint },
    { ...bounds, west: midpoint },
  ];
}

export function rainMapRaster(
  cells: RainfallMapCell[],
  width = RAIN_MAP_WIDTH,
  height = RAIN_MAP_HEIGHT,
) {
  const bounds = rainMapBounds(width, height);
  return rainfallRaster(
    { project: coordinate => cataloniaStaticScreenPoint(coordinate, bounds, width, height) },
    cells,
    width,
    height,
  );
}

export function rainMapOverlaySvg(
  raster: NonNullable<ReturnType<typeof rainMapRaster>>,
  imageDataUrl: string,
  width = RAIN_MAP_WIDTH,
  height = RAIN_MAP_HEIGHT,
) {
  return cataloniaStaticOverlaySvg(raster, imageDataUrl, width, height);
}
