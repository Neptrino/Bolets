import { Eye, EyeOff } from "lucide-react";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import { cataloniaLandRings } from "@/data/catalonia-land";
import {
  cataloniaRegionsGeoJson,
  regionBounds,
} from "@/data/regions";
import {
  boundsContain,
  gridSizeForViewport,
} from "@/src/lib/map-grid";
import {
  cacheAlignedMapBounds,
  formatMapCoordinate,
} from "@/src/lib/map-query";
import type { PredictionViewportStatus } from "@/src/lib/prediction-map-status";
import type {
  PredictionMapCell,
  RegionId,
  SpatialBounds,
  SpatialGridSizeM,
} from "@/src/lib/types";

const cataloniaBounds: [[number, number], [number, number]] = [
  [0.05, 40.48],
  [3.32, 42.92],
];
const cataloniaSpatialBounds = {
  west: cataloniaBounds[0][0],
  south: cataloniaBounds[0][1],
  east: cataloniaBounds[1][0],
  north: cataloniaBounds[1][1],
};
const defaultBasemapId = "icgc-topographic";
const basemapStorageKey = "bolets-basemap";
const basemapOptions = [
  {
    id: defaultBasemapId,
    label: "Topogràfic",
    shortLabel: "Topo",
    provider: "ICGC",
    description: "Mapa general de l’ICGC",
    preview: "topographic",
  },
  {
    id: "open-map",
    label: "Obert",
    shortLabel: "OSM",
    provider: "OpenStreetMap",
    description: "Mapa estàndard d’OpenStreetMap",
    preview: "open",
  },
  {
    id: "icgc-aerial",
    label: "Ortofoto",
    shortLabel: "Aèria",
    provider: "ICGC",
    description: "Imatge aèria híbrida de l’ICGC",
    preview: "aerial",
  },
  {
    id: "icgc-muted",
    label: "Gris",
    shortLabel: "Gris",
    provider: "ICGC",
    description: "Mapa de l’ICGC amb menys contrast",
    preview: "muted",
  },
] as const;
type BasemapId = (typeof basemapOptions)[number]["id"];

function isBasemapId(value: string | null): value is BasemapId {
  return basemapOptions.some((option) => option.id === value);
}

function storedBasemapId(): BasemapId {
  try {
    const stored = window.localStorage.getItem(basemapStorageKey);
    return isBasemapId(stored) ? stored : defaultBasemapId;
  } catch {
    return defaultBasemapId;
  }
}

function icgcBasemapStyle(
  wmsLayer: "estandard" | "estandard-gris" | "orto-hibrida",
): StyleSpecification {
  const sourceId = `icgc-${wmsLayer}`;
  const background = wmsLayer === "estandard-gris" ? "0xEEEDE8" : "0xF2EBD5";
  const tiles =
    `https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${wmsLayer}` +
    `&STYLES=&FORMAT=image/jpeg&TRANSPARENT=FALSE&BGCOLOR=${background}&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256`;

  return {
    version: 8,
    sources: {
      [sourceId]: {
        type: "raster",
        tiles: [tiles],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 18,
        attribution: "© Institut Cartogràfic i Geològic de Catalunya",
      },
    },
    layers: [
      {
        id: sourceId,
        type: "raster",
        source: sourceId,
        paint: { "raster-fade-duration": 0 },
      },
    ],
  };
}

function openStreetMapStyle(): StyleSpecification {
  const sourceId = "openstreetmap-standard";
  return {
    version: 8,
    sources: {
      [sourceId]: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',
      },
    },
    layers: [
      {
        id: sourceId,
        type: "raster",
        source: sourceId,
        paint: { "raster-fade-duration": 0 },
      },
    ],
  };
}

function basemapStyle(id: BasemapId): StyleSpecification {
  if (id === "open-map") return openStreetMapStyle();
  if (id === "icgc-aerial") return icgcBasemapStyle("orto-hibrida");
  if (id === "icgc-muted") return icgcBasemapStyle("estandard-gris");
  return icgcBasemapStyle("estandard");
}

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
  return `${count} ${count === 1 ? "cel·la" : "cel·les"}`;
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
  variant: "prediction" | "compatibility" | "history";
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
) {
  const gridSizeM = gridSizeForViewport(
    localMap.getZoom(),
    visibleSpatialBounds(localMap),
  );
  // The combined map has no 250 m habitat cache, so it never requests finer
  // than its coarse floor even when the zoom would allow it.
  return gridSizeM < minimumGridSizeM
    ? (minimumGridSizeM as SpatialGridSizeM)
    : gridSizeM;
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
  prepareCanvas,
  rememberBucket,
  storedBasemapId,
  visibleGridParams,
  visibleGridSize,
  visibleSpatialBounds,
  withCataloniaLandClip,
};
export type { BasemapId, CellState, HabitatEvidenceState };
