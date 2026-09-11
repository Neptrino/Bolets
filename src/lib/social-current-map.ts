import { cataloniaLandRings } from "@/data/catalonia-land";
import { cataloniaSpatialBounds } from "@/data/regions";
import { predictionHeatRaster } from "@/components/region-map/prediction-raster";
import type { PredictionMapCell, SpatialBounds } from "@/src/lib/types";

export const SOCIAL_CURRENT_MAP_WIDTH = 940;
export const SOCIAL_CURRENT_MAP_HEIGHT = 820;
export const SOCIAL_CURRENT_MAP_GRID_SIZE_M = 2500;

const WEB_MERCATOR_RADIUS = 6_378_137;

type ProjectedBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

function mercatorPoint([longitude, latitude]: [number, number]) {
  const longitudeRadians = longitude * Math.PI / 180;
  const latitudeRadians = Math.min(85.05112878, Math.max(-85.05112878, latitude)) * Math.PI / 180;
  return {
    x: WEB_MERCATOR_RADIUS * longitudeRadians,
    y: WEB_MERCATOR_RADIUS * Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2)),
  };
}

export function socialCurrentMapBounds(
  width = SOCIAL_CURRENT_MAP_WIDTH,
  height = SOCIAL_CURRENT_MAP_HEIGHT,
): ProjectedBounds {
  const southWest = mercatorPoint([cataloniaSpatialBounds.west, cataloniaSpatialBounds.south]);
  const northEast = mercatorPoint([cataloniaSpatialBounds.east, cataloniaSpatialBounds.north]);
  const padding = 1.08;
  let projectedWidth = (northEast.x - southWest.x) * padding;
  let projectedHeight = (northEast.y - southWest.y) * padding;
  const targetRatio = width / height;
  if (projectedWidth / projectedHeight < targetRatio) projectedWidth = projectedHeight * targetRatio;
  else projectedHeight = projectedWidth / targetRatio;
  const centreX = (southWest.x + northEast.x) / 2;
  const centreY = (southWest.y + northEast.y) / 2;
  return {
    west: centreX - projectedWidth / 2,
    south: centreY - projectedHeight / 2,
    east: centreX + projectedWidth / 2,
    north: centreY + projectedHeight / 2,
  };
}

export function socialCurrentMapWmsUrl(
  width = SOCIAL_CURRENT_MAP_WIDTH,
  height = SOCIAL_CURRENT_MAP_HEIGHT,
) {
  const bounds = socialCurrentMapBounds(width, height);
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: "topografic-gris",
    STYLES: "",
    FORMAT: "image/png",
    TRANSPARENT: "FALSE",
    BGCOLOR: "0xEEEDE8",
    SRS: "EPSG:3857",
    BBOX: [bounds.west, bounds.south, bounds.east, bounds.north].join(","),
    WIDTH: String(width),
    HEIGHT: String(height),
  });
  return `https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wms?${params}`;
}

function screenPoint(
  coordinate: [number, number],
  bounds: ProjectedBounds,
  width: number,
  height: number,
) {
  const point = mercatorPoint(coordinate);
  return {
    x: (point.x - bounds.west) / (bounds.east - bounds.west) * width,
    y: (bounds.north - point.y) / (bounds.north - bounds.south) * height,
  };
}

function landPath(bounds: ProjectedBounds, width: number, height: number) {
  return cataloniaLandRings.map((ring) => ring.map((coordinate, index) => {
    const point = screenPoint(coordinate, bounds, width, height);
    return `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }).join(" ") + " Z").join(" ");
}

/** Use the same geographic raster, coverage ramp and zero fade as Avui. */
export function socialCurrentMapRaster(
  cells: PredictionMapCell[],
  width = SOCIAL_CURRENT_MAP_WIDTH,
  height = SOCIAL_CURRENT_MAP_HEIGHT,
) {
  const bounds = socialCurrentMapBounds(width, height);
  return predictionHeatRaster({ project: coordinate => screenPoint(coordinate, bounds, width, height) }, cells, width, height);
}

export function socialCurrentMapOverlaySvg(
  raster: NonNullable<ReturnType<typeof socialCurrentMapRaster>>,
  imageDataUrl: string,
  width = SOCIAL_CURRENT_MAP_WIDTH,
  height = SOCIAL_CURRENT_MAP_HEIGHT,
) {
  const clipPath = landPath(socialCurrentMapBounds(width, height), width, height);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><clipPath id="catalunya"><path d="${clipPath}"/></clipPath></defs>
    <g clip-path="url(#catalunya)"><image href="${imageDataUrl}" x="${raster.left}" y="${raster.top}" width="${raster.width * raster.scale}" height="${raster.height * raster.scale}"/></g>
  </svg>`;
}

export function currentMapRequestBounds(): SpatialBounds {
  return { ...cataloniaSpatialBounds };
}
