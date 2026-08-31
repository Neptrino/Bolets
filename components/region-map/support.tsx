import { Eye, EyeOff } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  basemapOptions,
  basemapStorageKey,
  basemapStyle,
  defaultBasemapId,
  storedBasemapId,
  type BasemapId,
} from "./basemaps";
import { cataloniaLandRings } from "@/data/catalonia-land";
import {
  cataloniaRegionsGeoJson,
  regionBounds,
  regionCentres,
} from "@/data/regions";
import {
  boundsContain,
  constrainGridSize,
  gridSizeForViewport,
} from "@/src/lib/map-grid";
import {
  cacheAlignedMapBounds,
  formatMapCoordinate,
} from "@/src/lib/map-query";
import { cataloniaMapBounds as cataloniaBounds } from "@/src/lib/map-view-bounds";
import type { PredictionViewportStatus } from "@/src/lib/prediction-map-status";
import type {
  PredictionMapCell,
  RegionId,
  SpatialBounds,
  SpatialGridSizeM,
} from "@/src/lib/types";

const cataloniaSpatialBounds = {
  west: cataloniaBounds[0][0],
  south: cataloniaBounds[0][1],
  east: cataloniaBounds[1][0],
  north: cataloniaBounds[1][1],
};
const fitCatalonia = (map: MapLibreMap, animate = true) => {
  map.fitBounds(cataloniaBounds, {
    padding: { top: 54, right: 54, bottom: 54, left: 54 },
    duration: animate ? 650 : 0,
  });
};

const fitRegion = (map: MapLibreMap, region: RegionId, animate = true) => {
  const bounds = regionBounds[region];
  map.fitBounds(
    [
      [bounds.west, bounds.south],
      [bounds.east, bounds.north],
    ],
    {
      padding: { top: 54, right: 54, bottom: 54, left: 54 },
      duration: animate ? 650 : 0,
      maxZoom: 11.5,
    },
  );
};

const fitSpatialBounds = (
  map: MapLibreMap,
  bounds: SpatialBounds,
  animate = true,
) => {
  map.fitBounds(
    [
      [bounds.west, bounds.south],
      [bounds.east, bounds.north],
    ],
    {
      padding: { top: 54, right: 54, bottom: 54, left: 54 },
      duration: animate ? 650 : 0,
      maxZoom: 11.5,
    },
  );
};

function drawTerritorialWindow(
  context: CanvasRenderingContext2D,
  map: MapLibreMap,
  bounds: SpatialBounds | undefined,
) {
  if (!bounds) return;
  const topLeft = map.project([bounds.west, bounds.north]);
  const bottomRight = map.project([bounds.east, bounds.south]);
  const width = Math.max(bottomRight.x - topLeft.x, 1);
  const height = Math.max(bottomRight.y - topLeft.y, 1);
  context.save();
  context.setLineDash([]);
  context.strokeStyle = "rgba(255, 250, 240, 0.9)";
  context.lineWidth = 5;
  context.strokeRect(topLeft.x, topLeft.y, width, height);
  context.strokeStyle = "rgba(45, 62, 49, 0.94)";
  context.lineWidth = 2;
  context.strokeRect(topLeft.x, topLeft.y, width, height);
  context.restore();
}

function formatCellCount(count: number) {
  return `${count} ${count === 1 ? "sector" : "sectors"}`;
}

type CellState = {
  status: "loading" | "error" | PredictionViewportStatus;
  published: number;
  excluded: number;
  withheld: number;
  truncated: boolean;
  /**
   * Part of the viewport never resolved. Offline this is how a partly
   * downloaded zone presents, and the map must say so rather than passing a
   * viewport with holes off as complete.
   */
  incomplete: boolean;
  gridSizeM: SpatialGridSizeM;
};
type HabitatEvidenceState = {
  available: boolean | null;
  cells: number;
  habitatCells: number;
  records: number;
};
type MapLayerControlProps = {
  id: string;
  label: string;
  controlName: string;
  opacityLabel: string;
  variant: "prediction" | "compatibility" | "history" | "findings" | "personal-findings";
  visible: boolean;
  opacity: number;
  onVisibilityChange: () => void;
  onOpacityChange: (opacity: number) => void;
};

function MapLayerControl({
  id,
  label,
  controlName,
  opacityLabel,
  variant,
  visible,
  opacity,
  onVisibilityChange,
  onOpacityChange,
}: MapLayerControlProps) {
  const toggleLabel = `${visible ? "Amaga" : "Mostra"} ${controlName}`;

  return (
    <div className={`map-cell-visibility-layer map-cell-visibility-layer-${variant}`}>
      <div className="map-cell-visibility-heading">
        <i className="map-cell-visibility-swatch" aria-hidden />
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{visible ? `${opacity}%` : "No visible"}</output>
        <button
          type="button"
          className="map-cell-visibility-toggle"
          onClick={onVisibilityChange}
          aria-pressed={visible}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          {visible ? (
            <Eye size={16} aria-hidden />
          ) : (
            <EyeOff size={16} aria-hidden />
          )}
        </button>
      </div>
      <input
        id={id}
        type="range"
        min="20"
        max="100"
        step="10"
        value={opacity}
        disabled={!visible}
        onChange={(event) => onOpacityChange(Number(event.currentTarget.value))}
        aria-label={opacityLabel}
      />
    </div>
  );
}

function visibleSpatialBounds(localMap: MapLibreMap): SpatialBounds {
  const bounds = localMap.getBounds();
  return {
    west: Math.max(bounds.getWest(), cataloniaBounds[0][0]),
    south: Math.max(bounds.getSouth(), cataloniaBounds[0][1]),
    east: Math.min(bounds.getEast(), cataloniaBounds[1][0]),
    north: Math.min(bounds.getNorth(), cataloniaBounds[1][1]),
  };
}

function visibleGridSize(
  localMap: MapLibreMap,
  minimumGridSizeM: SpatialGridSizeM = 250,
  maximumGridSizeM?: SpatialGridSizeM,
) {
  const gridSizeM = gridSizeForViewport(
    localMap.getZoom(),
    visibleSpatialBounds(localMap),
  );
  // The combined map has no 250 m habitat cache, so it never requests finer
  // than its detail floor even when the zoom would allow it. Editorial map
  // surfaces may also opt into a smaller maximum cell size than the ordinary
  // viewport budget would choose.
  return constrainGridSize(gridSizeM, minimumGridSizeM, maximumGridSizeM);
}

function visibleGridParams(localMap: MapLibreMap, speciesId: string, gridSizeM: SpatialGridSizeM, extras?: Record<string, string>) {
  const cacheBounds = cacheAlignedMapBounds(
    visibleSpatialBounds(localMap),
    gridSizeM,
    cataloniaSpatialBounds,
  );
  return new URLSearchParams({
    species: speciesId,
    west: formatMapCoordinate(cacheBounds.west),
    south: formatMapCoordinate(cacheBounds.south),
    east: formatMapCoordinate(cacheBounds.east),
    north: formatMapCoordinate(cacheBounds.north),
    limit: "1000",
    resolution: String(gridSizeM),
    ...extras,
  });
}

/**
 * A long session pans over far more ground than it shows. Retaining every
 * bucket ever fetched would grow without bound, so the oldest are dropped once
 * the store passes a few screenfuls' worth; they are cheap to fetch again.
 */
const RETAINED_BUCKETS = 240;

function rememberBucket<T>(store: Map<string, T[]>, url: string, cells: T[]) {
  store.delete(url);
  store.set(url, cells);
  while (store.size > RETAINED_BUCKETS) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

function findCell(cells: Iterable<PredictionMapCell>, longitude: number, latitude: number) {
  for (const cell of cells) {
    if (boundsContain(cell.cellBounds, longitude, latitude)) return cell;
  }
}

function prepareCanvas(canvas: HTMLCanvasElement) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  if (
    canvas.width !== Math.round(width * pixelRatio) ||
    canvas.height !== Math.round(height * pixelRatio)
  ) {
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  return context;
}

function createHistoricalEvidencePattern(context: CanvasRenderingContext2D) {
  const tile = document.createElement("canvas");
  tile.width = 10;
  tile.height = 10;
  const tileContext = tile.getContext("2d");
  if (!tileContext) return null;
  tileContext.strokeStyle = "rgba(177, 42, 144, 0.88)";
  tileContext.lineWidth = 2;
  tileContext.beginPath();
  tileContext.moveTo(-2, 10);
  tileContext.lineTo(10, -2);
  tileContext.moveTo(6, 12);
  tileContext.lineTo(12, 6);
  tileContext.stroke();
  return context.createPattern(tile, "repeat");
}

function withCataloniaLandClip(
  context: CanvasRenderingContext2D,
  localMap: MapLibreMap,
  draw: () => void,
) {
  context.save();
  context.beginPath();
  for (const ring of cataloniaLandRings) {
    ring.forEach(([longitude, latitude], index) => {
      const point = localMap.project([longitude, latitude]);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
  }
  context.clip();
  draw();
  context.restore();
}

function distributionCentre(activeRegions: RegionId[]): [number, number] {
  const coordinates = cataloniaRegionsGeoJson.features.flatMap((feature) => {
    const regionId = feature.properties?.id as RegionId | undefined;
    return regionId &&
      activeRegions.includes(regionId) &&
      feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates[0]
      : [];
  });
  if (!coordinates.length) return [1.7, 41.7];
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  return [
    (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  ];
}

function initialRegionMapView({
  activeRegions,
  focusBounds,
  mapCentre,
  mapZoom,
  prediction,
  region,
}: {
  activeRegions: RegionId[];
  focusBounds?: SpatialBounds;
  mapCentre?: [number, number];
  mapZoom?: number;
  prediction: boolean;
  region?: RegionId;
}) {
  const center: [number, number] = mapCentre
    ? mapCentre
    : focusBounds
      ? [
          (focusBounds.west + focusBounds.east) / 2,
          (focusBounds.south + focusBounds.north) / 2,
        ]
      : prediction && region
        ? regionCentres[region]
        : distributionCentre(activeRegions);
  const zoom = mapCentre || focusBounds
    ? (mapZoom ?? 10.8)
    : prediction && region
      ? 9.8
      : 6.2;

  return { center, zoom };
}

export {
  MapLayerControl,
  basemapOptions,
  basemapStorageKey,
  basemapStyle,
  cataloniaBounds,
  cataloniaSpatialBounds,
  createHistoricalEvidencePattern,
  defaultBasemapId,
  distributionCentre,
  drawTerritorialWindow,
  findCell,
  fitCatalonia,
  fitRegion,
  fitSpatialBounds,
  formatCellCount,
  initialRegionMapView,
  prepareCanvas,
  rememberBucket,
  storedBasemapId,
  visibleGridParams,
  visibleGridSize,
  visibleSpatialBounds,
  withCataloniaLandClip,
};
export type { BasemapId, CellState, HabitatEvidenceState };
