import { predictionHeatRaster } from "@/components/region-map/prediction-raster";
import {
  cataloniaStaticMapBounds,
  cataloniaStaticMapWmsUrl,
  cataloniaStaticOverlaySvg,
  cataloniaStaticRequestBounds,
  cataloniaStaticScreenPoint,
} from "@/src/lib/catalonia-static-map";
import type { PredictionMapCell, SpatialBounds } from "@/src/lib/types";

export const SOCIAL_CURRENT_MAP_WIDTH = 940;
export const SOCIAL_CURRENT_MAP_HEIGHT = 820;
export const SOCIAL_CURRENT_MAP_GRID_SIZE_M = 2500;

export function socialCurrentMapBounds(
  width = SOCIAL_CURRENT_MAP_WIDTH,
  height = SOCIAL_CURRENT_MAP_HEIGHT,
) {
  return cataloniaStaticMapBounds(width, height);
}

export function socialCurrentMapWmsUrl(
  width = SOCIAL_CURRENT_MAP_WIDTH,
  height = SOCIAL_CURRENT_MAP_HEIGHT,
) {
  return cataloniaStaticMapWmsUrl(width, height);
}

/** Use the same geographic raster, coverage ramp and zero fade as Avui. */
export function socialCurrentMapRaster(
  cells: PredictionMapCell[],
  width = SOCIAL_CURRENT_MAP_WIDTH,
  height = SOCIAL_CURRENT_MAP_HEIGHT,
) {
  const bounds = socialCurrentMapBounds(width, height);
  return predictionHeatRaster(
    { project: coordinate => cataloniaStaticScreenPoint(coordinate, bounds, width, height) },
    cells,
    width,
    height,
  );
}

export function socialCurrentMapOverlaySvg(
  raster: NonNullable<ReturnType<typeof socialCurrentMapRaster>>,
  imageDataUrl: string,
  width = SOCIAL_CURRENT_MAP_WIDTH,
  height = SOCIAL_CURRENT_MAP_HEIGHT,
) {
  return cataloniaStaticOverlaySvg(raster, imageDataUrl, width, height);
}

export function currentMapRequestBounds(): SpatialBounds {
  return cataloniaStaticRequestBounds();
}
