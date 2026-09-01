import { cataloniaLandRings } from "@/data/catalonia-land";
import { cataloniaSpatialBounds } from "@/data/regions";
import { predictionHeatmapColour } from "@/src/lib/suitability-scale";
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

function cellRectangle(
  cell: PredictionMapCell,
  bounds: ProjectedBounds,
  width: number,
  height: number,
) {
  if (cell.score === null || cell.score <= 0) return "";
  const [[west, south], [east, north]] = cell.cellBounds;
  const topLeft = screenPoint([west, north], bounds, width, height);
  const bottomRight = screenPoint([east, south], bounds, width, height);
  const padding = 1.25;
  return `<rect x="${(topLeft.x - padding).toFixed(2)}" y="${(topLeft.y - padding).toFixed(2)}" width="${(bottomRight.x - topLeft.x + padding * 2).toFixed(2)}" height="${(bottomRight.y - topLeft.y + padding * 2).toFixed(2)}" fill="${predictionHeatmapColour(cell.score)}"/>`;
}

export function socialCurrentMapOverlaySvg(
  cells: PredictionMapCell[],
  width = SOCIAL_CURRENT_MAP_WIDTH,
  height = SOCIAL_CURRENT_MAP_HEIGHT,
) {
  const bounds = socialCurrentMapBounds(width, height);
  const clipPath = landPath(bounds, width, height);
  const rectangles = cells.map((cell) => cellRectangle(cell, bounds, width, height)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <clipPath id="catalunya"><path d="${clipPath}"/></clipPath>
      <filter id="condition-heat" x="-8%" y="-8%" width="116%" height="116%"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <g clip-path="url(#catalunya)"><g filter="url(#condition-heat)" opacity="0.94">${rectangles}</g></g>
    <path d="${clipPath}" fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="1.4"/>
  </svg>`;
}

export function currentMapRequestBounds(): SpatialBounds {
  return { ...cataloniaSpatialBounds };
}
