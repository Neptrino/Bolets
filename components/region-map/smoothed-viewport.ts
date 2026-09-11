import type { PredictionMapCell, SpatialBounds } from "@/src/lib/types";
import type { PredictionRendering } from "./prediction-surface";
import {
  KERNEL_CUTOFF_SIGMAS,
  smoothedRasterScale,
  smoothingSigmaMetres,
} from "./smoothed-field";

const METRES_PER_DEGREE = 111_320;
export type MapProjection = { project(coordinate: [number, number]): { x: number; y: number } };

/** Include every neighbour whose kernel can reach the visible ground. */
export function smoothedQueryBounds(bounds: SpatialBounds, gridSizeM: number): SpatialBounds {
  if (bounds.west >= bounds.east || bounds.south >= bounds.north) return bounds;
  const reach = smoothingSigmaMetres(gridSizeM) * KERNEL_CUTOFF_SIGMAS;
  // Conservative latitude spacing also covers the ellipsoidal grid cells.
  const latitudePadding = reach / 110_574;
  const furthestLatitude = Math.max(Math.abs(bounds.south), Math.abs(bounds.north)) + latitudePadding;
  const longitudePadding = reach / (METRES_PER_DEGREE * Math.cos(furthestLatitude * Math.PI / 180));
  return {
    west: bounds.west - longitudePadding,
    south: bounds.south - latitudePadding,
    east: bounds.east + longitudePadding,
    north: bounds.north + latitudePadding,
  };
}

function pixelsPerMetre(map: MapProjection, longitude: number, latitude: number) {
  const centre = map.project([longitude, latitude]);
  const east = map.project([
    longitude + 1 / (METRES_PER_DEGREE * Math.cos(latitude * Math.PI / 180)),
    latitude,
  ]);
  return Math.hypot(east.x - centre.x, east.y - centre.y);
}

/** Project each sample independently of bucket arrival order and bounding-box size. */
export function projectSmoothedCell(map: MapProjection, cell: PredictionMapCell) {
  const [[west, south], [east, north]] = cell.cellBounds;
  const longitude = (west + east) / 2;
  const latitude = (south + north) / 2;
  const centre = map.project([longitude, latitude]);
  return {
    x: centre.x,
    y: centre.y,
    sigma: smoothingSigmaMetres(cell.gridSizeM) * pixelsPerMetre(map, longitude, latitude),
  };
}

/**
 * Anchor raster pixels to geography, not the viewport. At close zooms the
 * raster keeps the same ground spacing; zooming magnifies the same samples.
 * Paint its actual rounded extent instead of stretching it to fit the canvas.
 */
export function smoothedViewportRaster(map: MapProjection, width: number, height: number, gridSizeM: number) {
  // A fixed Catalonia latitude sets only raster density, never the sample kernel.
  const sigmaPx = smoothingSigmaMetres(gridSizeM) * pixelsPerMetre(map, 2, 42);
  const scale = smoothedRasterScale(width, height, sigmaPx);
  const origin = map.project([0, 0]);
  const left = origin.x + Math.floor(-origin.x / scale) * scale;
  const top = origin.y + Math.floor(-origin.y / scale) * scale;
  return {
    left,
    top,
    scale,
    width: Math.max(1, Math.ceil((width - left) / scale)),
    height: Math.max(1, Math.ceil((height - top) / scale)),
  };
}

/** Keep live and timeline requests on the same canonical neighbouring buckets. */
export function predictionQueryBounds(bounds: SpatialBounds, gridSizeM: number, rendering: PredictionRendering) {
  return rendering === "heatmap" ? smoothedQueryBounds(bounds, gridSizeM) : bounds;
}
