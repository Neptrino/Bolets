import type { CoordinateBounds, SpatialGridSizeM } from "@/src/lib/types";

export const spatialGridSizes = [250, 500, 1000, 2500, 5000, 10000] as const satisfies readonly SpatialGridSizeM[];

export function isSpatialGridSize(value: number): value is SpatialGridSizeM {
  return spatialGridSizes.some((size) => size === value);
}

export function gridSizeForZoom(zoom: number): SpatialGridSizeM {
  if (zoom >= 14.2) return 250;
  if (zoom >= 13.2) return 500;
  if (zoom >= 11.8) return 1000;
  if (zoom >= 9.4) return 2500;
  if (zoom >= 8.2) return 5000;
  return 10000;
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
