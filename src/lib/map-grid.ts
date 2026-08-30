import type {
  CoordinateBounds,
  SpatialBounds,
  SpatialGridSizeM,
} from "@/src/lib/types";

const spatialGridSizes = [250, 1000, 2500, 5000, 10000] as const satisfies readonly SpatialGridSizeM[];
// At 1,200 cells the 250 m grid remains comfortably interactive while a user
// can assess a useful local area before needing to zoom further in.
const maximumVisibleGridCells = 1200;

export function isSpatialGridSize(value: number): value is SpatialGridSizeM {
  return spatialGridSizes.some((size) => size === value);
}

/** Apply a detail floor and an optional maximum cell size to a supported grid. */
export function constrainGridSize(
  gridSizeM: SpatialGridSizeM,
  minimumGridSizeM: SpatialGridSizeM = 250,
  maximumGridSizeM?: SpatialGridSizeM,
) {
  const detailFloor = Math.max(gridSizeM, minimumGridSizeM);
  const maximumCellSize = maximumGridSizeM === undefined
    ? spatialGridSizes.at(-1)!
    : Math.max(maximumGridSizeM, minimumGridSizeM);
  return Math.min(detailFloor, maximumCellSize) as SpatialGridSizeM;
}

export function gridSizeForZoom(zoom: number): SpatialGridSizeM {
  if (zoom >= 13.4) return 250;
  if (zoom >= 11.8) return 1000;
  if (zoom >= 9.4) return 2500;
  if (zoom >= 8.2) return 5000;
  return 10000;
}

/**
 * Keeps a wide viewport from requesting thousands of cells just because its
 * zoom level happens to cross a detail threshold. The zoom still defines the
 * finest allowed grid; viewport size may only make it coarser.
 */
export function gridSizeForViewport(
  zoom: number,
  bounds: SpatialBounds,
  cellBudget = maximumVisibleGridCells,
): SpatialGridSizeM {
  const zoomGridSize = gridSizeForZoom(zoom);
  const centreLatitude = (bounds.south + bounds.north) / 2;
  const metresPerLongitudeDegree = 111_320
    * Math.max(Math.cos(centreLatitude * Math.PI / 180), 0.01);
  const widthM = Math.max(bounds.east - bounds.west, 0) * metresPerLongitudeDegree;
  const heightM = Math.max(bounds.north - bounds.south, 0) * 110_574;
  const firstAllowedIndex = spatialGridSizes.indexOf(zoomGridSize);

  for (let index = firstAllowedIndex; index < spatialGridSizes.length; index += 1) {
    const sizeM = spatialGridSizes[index];
    const estimatedCells = Math.ceil(widthM / sizeM) * Math.ceil(heightM / sizeM);
    if (estimatedCells <= cellBudget || index === spatialGridSizes.length - 1)
      return sizeM;
  }

  return spatialGridSizes.at(-1)!;
}

function formatDistance(sizeM: SpatialGridSizeM) {
  if (sizeM < 1000) return `${sizeM} m`;
  return `${String(sizeM / 1000).replace(".", ",")} km`;
}

export function formatGridDimensions(sizeM: SpatialGridSizeM) {
  const distance = formatDistance(sizeM);
  return `${distance} × ${distance}`;
}

export function boundsCentre([southWest, northEast]: CoordinateBounds): [number, number] {
  return [(southWest[0] + northEast[0]) / 2, (southWest[1] + northEast[1]) / 2];
}

export function boundsContain([southWest, northEast]: CoordinateBounds, longitude: number, latitude: number) {
  return longitude >= southWest[0] && longitude <= northEast[0]
    && latitude >= southWest[1] && latitude <= northEast[1];
}
