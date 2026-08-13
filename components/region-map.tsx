"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Grid3X3,
  LoaderCircle,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  FullscreenControl,
  GeolocateControl,
  Map as MapLibre,
  NavigationControl,
  type Map as MapLibreMap,
  type MapMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import { MapModeControl } from "@/components/map-mode-control";
import { cataloniaLandRings } from "@/data/catalonia-land";
import { cataloniaRegionsGeoJson, regionCentres } from "@/data/regions";
import {
  habitatCellColour,
  habitatCellIntensity,
  isHabitatCellCorroborated,
} from "@/src/lib/habitat-map";
import {
  boundsContain,
  formatGridDimensions,
  gridSizeForViewport,
} from "@/src/lib/map-grid";
import {
  HABITAT_MODEL_VERSION,
  PREDICTION_CACHE_VERSION,
} from "@/src/lib/model-versions";
import { cacheAlignedMapBounds, formatMapCoordinate } from "@/src/lib/map-query";
import { predictionMapCellColour } from "@/src/lib/suitability-scale";
import { fetchJsonWithRetry } from "@/src/lib/fetch-json";
import type {
  OccurrenceSupportCell,
  MapViewMode,
  PotentialHabitatMapCell,
  PredictionCell,
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

type CellState = {
  status: "loading" | "empty" | "incompatible" | "withheld" | "ready" | "error";
  published: number;
  excluded: number;
  withheld: number;
  truncated: boolean;
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

function visibleGridSize(localMap: MapLibreMap) {
  return gridSizeForViewport(
    localMap.getZoom(),
    visibleSpatialBounds(localMap),
  );
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

export function RegionMap({
  activeRegions = [],
  autoGeolocate = true,
  compactLegend = false,
  initialCentre,
  initialZoom,
  selectedRegion,
  speciesId,
  habitat = false,
  mode = "prediction",
  predictionAvailable = true,
  selectedCellId,
  className = "",
  fullscreenTarget = "viewport",
  onCellSelect,
}: {
  activeRegions?: RegionId[];
  autoGeolocate?: boolean;
  compactLegend?: boolean;
  initialCentre?: [number, number];
  initialZoom?: number;
  selectedRegion?: RegionId;
  speciesId?: string;
  habitat?: boolean;
  mode?: MapViewMode;
  predictionAvailable?: boolean;
  selectedCellId?: string;
  className?: string;
  fullscreenTarget?: "viewport" | "parent";
  onCellSelect?: (cell?: PredictionCell) => void;
}) {
  const showCompatibility = habitat || mode === "compatibility";
  const node = useRef<HTMLDivElement>(null);
  const cellCanvas = useRef<HTMLCanvasElement>(null);
  const historicalEvidenceCanvas = useRef<HTMLCanvasElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const geolocateControl = useRef<GeolocateControl | null>(null);
  const initialSpeciesId = useRef(speciesId);
  const initialHabitat = useRef(habitat);
  const initialAutoGeolocate = useRef(autoGeolocate);
  const initialMapCentre = useRef(initialCentre);
  const initialMapZoom = useRef(initialZoom);
  const initialRegion = useRef(selectedRegion);
  const initialActiveRegions = useRef(activeRegions);
  const initialFullscreenTarget = useRef(fullscreenTarget);
  const previousRegion = useRef(selectedRegion);
  const previousSpeciesId = useRef(speciesId);
  const initialGeolocationTriggered = useRef(false);
  const request = useRef<AbortController | null>(null);
  const evidenceRequest = useRef<AbortController | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const basemapChangeId = useRef(0);
  const activeRequestKey = useRef<string | null>(null);
  const completedRequestKey = useRef<string | null>(null);
  const cellsById = useRef(new Map<string, PredictionMapCell>());
  const habitatCellsById = useRef(new Map<string, PotentialHabitatMapCell>());
  const corroboratedHabitatCellIds = useRef(new Set<string>());
  const selectedCellIdRef = useRef<string | null>(null);
  const drawCellsRef = useRef<() => void>(() => undefined);
  const cellOpacityId = useId();
  const historicalEvidenceOpacityId = useId();
  const layerControlsId = useId();
  const basemapChoiceName = useId();
  const [layerControlsExpanded, setLayerControlsExpanded] = useState(false);
  const [selectedBasemapId, setSelectedBasemapId] =
    useState<BasemapId>(defaultBasemapId);
  const [basemapStatus, setBasemapStatus] =
    useState<"idle" | "loading" | "error">("idle");
  const [cellsVisible, setCellsVisible] = useState(true);
  const [cellOpacity, setCellOpacity] = useState(100);
  const [historicalEvidenceVisible, setHistoricalEvidenceVisible] =
    useState(true);
  const [historicalEvidenceOpacity, setHistoricalEvidenceOpacity] =
    useState(100);
  const [cellState, setCellState] = useState<CellState>({
    status: "loading",
    published: 0,
    excluded: 0,
    withheld: 0,
    truncated: false,
    gridSizeM: 250,
  });
  const [habitatEvidenceState, setHabitatEvidenceState] =
    useState<HabitatEvidenceState>({
      available: null,
      cells: 0,
      habitatCells: 0,
      records: 0,
    });

  useEffect(() => {
    const narrowMap = window.matchMedia("(max-width: 680px)");
    let collapseFrame: number | undefined;
    const collapseForNarrowMap = (event: MediaQueryListEvent) => {
      if (event.matches) setLayerControlsExpanded(false);
    };
    if (narrowMap.matches) {
      collapseFrame = window.requestAnimationFrame(() =>
        setLayerControlsExpanded(false),
      );
    }
    narrowMap.addEventListener("change", collapseForNarrowMap);
    return () => {
      if (collapseFrame !== undefined)
        window.cancelAnimationFrame(collapseFrame);
      narrowMap.removeEventListener("change", collapseForNarrowMap);
    };
  }, []);

  useEffect(() => {
    if (!node.current || map.current) return;

    const mapRoot = node.current.closest<HTMLElement>(".region-map");
    const fullscreenContainer = initialFullscreenTarget.current === "parent"
      ? mapRoot?.parentElement
      : node.current.parentElement;
    const isPredictionMap = Boolean(
      initialSpeciesId.current && !initialHabitat.current,
    );
    const initialBasemapId = storedBasemapId();
    setSelectedBasemapId(initialBasemapId);
    const localMap = new MapLibre({
      container: node.current,
      style: basemapStyle(initialBasemapId),
      center:
        initialMapCentre.current
          ? initialMapCentre.current
          : isPredictionMap && initialRegion.current
          ? regionCentres[initialRegion.current]
          : distributionCentre(initialActiveRegions.current),
      zoom:
        initialMapCentre.current
          ? (initialMapZoom.current ?? 10.8)
          : isPredictionMap && initialRegion.current
            ? 12.8
            : 6.2,
      attributionControl: { compact: true },
      maplibreLogo: false,
      maxBounds: [
        [-0.5, 40.1],
        [3.9, 43.2],
      ],
      interactive: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      locale: {
        "NavigationControl.ZoomIn": "Apropar",
        "NavigationControl.ZoomOut": "Allunyar",
        "FullscreenControl.Enter": "Veure el mapa a pantalla completa",
        "FullscreenControl.Exit": "Sortir de pantalla completa",
        "GeolocateControl.FindMyLocation": "Mostra la meva ubicació",
        "GeolocateControl.LocationNotAvailable": "Ubicació no disponible",
        "AttributionControl.ToggleAttribution": "Mostra l’atribució del mapa",
      },
    });
    map.current = localMap;
    localMap.addControl(
      new NavigationControl({ showCompass: false }),
      "top-right",
    );
    localMap.addControl(
      new FullscreenControl(
        fullscreenContainer ? { container: fullscreenContainer } : undefined,
      ),
      "top-right",
    );
    const geolocate = initialSpeciesId.current && initialAutoGeolocate.current
      ? new GeolocateControl({
          positionOptions: {
            enableHighAccuracy: !initialHabitat.current,
            maximumAge: 300_000,
            timeout: initialHabitat.current ? 3_000 : 8_000,
          },
          fitBoundsOptions: {
            maxZoom: initialHabitat.current ? 11.2 : 14,
            duration: 650,
          },
          trackUserLocation: false,
          showAccuracyCircle: true,
          showUserLocation: true,
        })
      : undefined;
    geolocateControl.current = geolocate ?? null;
    if (geolocate) localMap.addControl(geolocate, "top-right");
    localMap.once("load", () => {
      localMap.resize();
      if (!isPredictionMap && !initialMapCentre.current)
        fitCatalonia(localMap, false);
      drawCellsRef.current();
    });

    const resizeObserver = new ResizeObserver(() => {
      localMap.resize();
      drawCellsRef.current();
    });
    resizeObserver.observe(node.current);

    return () => {
      resizeObserver.disconnect();
      localMap.remove();
      map.current = null;
      geolocateControl.current = null;
    };
  }, []);

  useEffect(() => {
    const localMap = map.current;
    const regionChanged = selectedRegion !== previousRegion.current;
    const speciesChanged = speciesId !== previousSpeciesId.current;
    previousRegion.current = selectedRegion;
    previousSpeciesId.current = speciesId;
    if (
      !localMap ||
      !initialSpeciesId.current ||
      initialHabitat.current ||
      !selectedRegion ||
      !regionChanged ||
      speciesChanged
    )
      return;

    const focusRegion = () =>
      localMap.easeTo({
        center: regionCentres[selectedRegion],
        zoom: 12.8,
        duration: 650,
      });

    if (localMap.loaded()) focusRegion();
    else localMap.once("load", focusRegion);

    return () => {
      localMap.off("load", focusRegion);
    };
  }, [selectedRegion, speciesId]);

  useEffect(() => {
    selectedCellIdRef.current = selectedCellId ?? null;
    drawCellsRef.current();
  }, [selectedCellId]);

  useEffect(() => {
    const localMap = map.current;
    if (!localMap || !speciesId || !showCompatibility) return;

    let drawFrame: number | undefined;
    let locationFallback: number | undefined;
    let historicalEvidencePattern: CanvasPattern | null = null;
    let initialViewLoaded = false;

    const drawHabitat = () => {
      const canvas = cellCanvas.current;
      const evidenceCanvas = historicalEvidenceCanvas.current;
      if (!canvas || !evidenceCanvas) return;
      const context = prepareCanvas(canvas);
      const evidenceContext = prepareCanvas(evidenceCanvas);
      if (!context || !evidenceContext) return;

      withCataloniaLandClip(context, localMap, () => {
        for (const cell of habitatCellsById.current.values()) {
          const [[west, south], [east, north]] = cell.cellBounds;
          const topLeft = localMap.project([west, north]);
          const bottomRight = localMap.project([east, south]);
          const width = Math.max(bottomRight.x - topLeft.x, 1);
          const height = Math.max(bottomRight.y - topLeft.y, 1);
          const gap = Math.min(0.8, width * 0.08, height * 0.08);
          context.fillStyle = habitatCellColour(habitatCellIntensity(cell));
          context.fillRect(
            topLeft.x + gap,
            topLeft.y + gap,
            Math.max(width - gap * 2, 1),
            Math.max(height - gap * 2, 1),
          );
        }
      });
      withCataloniaLandClip(evidenceContext, localMap, () => {
        historicalEvidencePattern ??=
          createHistoricalEvidencePattern(evidenceContext);
        if (!historicalEvidencePattern) return;

        for (const cell of habitatCellsById.current.values()) {
          if (!corroboratedHabitatCellIds.current.has(cell.cellId)) continue;
          const [[west, south], [east, north]] = cell.cellBounds;
          const topLeft = localMap.project([west, north]);
          const bottomRight = localMap.project([east, south]);
          const width = Math.max(bottomRight.x - topLeft.x, 1);
          const height = Math.max(bottomRight.y - topLeft.y, 1);
          const gap = Math.min(0.8, width * 0.08, height * 0.08);
          evidenceContext.fillStyle = historicalEvidencePattern;
          evidenceContext.fillRect(
            topLeft.x + gap,
            topLeft.y + gap,
            Math.max(width - gap * 2, 1),
            Math.max(height - gap * 2, 1),
          );
        }
      });
    };

    const scheduleDrawHabitat = () => {
      if (drawFrame !== undefined) return;
      drawFrame = window.requestAnimationFrame(() => {
        drawFrame = undefined;
        drawHabitat();
      });
    };

    drawCellsRef.current = scheduleDrawHabitat;
    habitatCellsById.current = new Map();
    corroboratedHabitatCellIds.current = new Set();
    completedRequestKey.current = null;
    scheduleDrawHabitat();
    setHabitatEvidenceState({
      available: null,
      cells: 0,
      habitatCells: 0,
      records: 0,
    });
    setCellState({
      status: "loading",
      published: 0,
      excluded: 0,
      withheld: 0,
      truncated: false,
      gridSizeM: visibleGridSize(localMap),
    });

    const loadHabitat = async () => {
      const gridSizeM = visibleGridSize(localMap);
      const params = visibleGridParams(localMap, speciesId, gridSizeM, {
        v: HABITAT_MODEL_VERSION,
        view: "map",
      });
      const requestKey = `habitat:${params}`;
      if (
        requestKey === activeRequestKey.current ||
        requestKey === completedRequestKey.current
      )
        return;
      request.current?.abort();
      evidenceRequest.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      activeRequestKey.current = requestKey;
      setCellState((current) => ({ ...current, status: "loading", gridSizeM }));
      try {
        const payload = await fetchJsonWithRetry<{
          cells: PotentialHabitatMapCell[];
          truncated: boolean;
        }>(`/api/habitat?${params}`, controller.signal, 1);
        if (request.current !== controller || controller.signal.aborted) return;
        habitatCellsById.current = new Map(
          payload.cells.map((cell) => [cell.cellId, cell]),
        );
        corroboratedHabitatCellIds.current = new Set();
        completedRequestKey.current = requestKey;
        scheduleDrawHabitat();
        setCellState({
          status: payload.cells.length ? "ready" : "empty",
          published: payload.cells.length,
          excluded: 0,
          withheld: 0,
          truncated: payload.truncated,
          gridSizeM,
        });
        void loadHistoricalEvidence();
      } catch (error) {
        if (
          request.current !== controller ||
          (error instanceof DOMException && error.name === "AbortError")
        )
          return;
        completedRequestKey.current = null;
        if (!habitatCellsById.current.size)
          setHabitatEvidenceState({
            available: null,
            cells: 0,
            habitatCells: 0,
            records: 0,
          });
        setCellState((current) =>
          habitatCellsById.current.size
            ? { ...current, status: "ready" }
            : {
                status: "error",
                published: 0,
                excluded: 0,
                withheld: 0,
                truncated: false,
                gridSizeM,
              },
        );
      } finally {
        if (request.current === controller) request.current = null;
        if (activeRequestKey.current === requestKey)
          activeRequestKey.current = null;
      }
    };

    const loadHistoricalEvidence = async () => {
      const params = visibleGridParams(localMap, speciesId, 10_000);
      evidenceRequest.current?.abort();
      const controller = new AbortController();
      evidenceRequest.current = controller;
      setHabitatEvidenceState({
        available: null,
        cells: 0,
        habitatCells: 0,
        records: 0,
      });
      try {
        const payload = await fetchJsonWithRetry<{
          available: boolean;
          cells: Array<Pick<OccurrenceSupportCell, "bounds" | "recordCount">>;
        }>(`/api/occurrences?${params}`, controller.signal, 1, 5_000);
        if (
          evidenceRequest.current !== controller ||
          controller.signal.aborted
        )
          return;
        corroboratedHabitatCellIds.current = new Set(
          [...habitatCellsById.current.values()]
            .filter((cell) => isHabitatCellCorroborated(cell, payload.cells))
            .map((cell) => cell.cellId),
        );
        setHabitatEvidenceState({
          available: payload.available,
          cells: payload.cells.length,
          habitatCells: corroboratedHabitatCellIds.current.size,
          records: payload.cells.reduce(
            (total, cell) => total + cell.recordCount,
            0,
          ),
        });
        scheduleDrawHabitat();
      } catch (error) {
        if (
          evidenceRequest.current !== controller ||
          (error instanceof DOMException && error.name === "AbortError")
        )
          return;
        corroboratedHabitatCellIds.current = new Set();
        setHabitatEvidenceState({
          available: false,
          cells: 0,
          habitatCells: 0,
          records: 0,
        });
        scheduleDrawHabitat();
      } finally {
        if (evidenceRequest.current === controller)
          evidenceRequest.current = null;
      }
    };

    localMap.on("move", scheduleDrawHabitat);
    const focusAndLoad = (centre?: [number, number], zoom?: number) => {
      const firstLoad = !initialViewLoaded;
      initialViewLoaded = true;
      if (centre && zoom) localMap.jumpTo({ center: centre, zoom });
      else if (selectedRegion)
        localMap.jumpTo({ center: regionCentres[selectedRegion], zoom: 9.8 });
      else fitCatalonia(localMap, false);

      if (firstLoad) {
        localMap.on("moveend", loadHabitat);
        void loadHabitat();
      }
    };
    const focusFallback = () => focusAndLoad();
    const locator = geolocateControl.current;
    const clearLocationListeners = () => {
      if (!locator) return;
      locator.off("geolocate", handleLocation);
      locator.off("error", handleLocationUnavailable);
      locator.off("outofmaxbounds", handleLocationUnavailable);
    };
    const handleLocation = (event: { coords: GeolocationCoordinates }) => {
      clearLocationListeners();
      if (locationFallback !== undefined)
        window.clearTimeout(locationFallback);
      const centre: [number, number] = [
        event.coords.longitude,
        event.coords.latitude,
      ];
      if (boundsContain(cataloniaBounds, centre[0], centre[1]))
        focusAndLoad(centre, 11.2);
      else if (!initialViewLoaded) focusFallback();
    };
    const handleLocationUnavailable = () => {
      clearLocationListeners();
      if (locationFallback !== undefined)
        window.clearTimeout(locationFallback);
      if (!initialViewLoaded) focusFallback();
    };
    const activate = () => {
      if (!habitat) {
        initialViewLoaded = true;
        localMap.on("moveend", loadHabitat);
        void loadHabitat();
        return;
      }
      if (!initialAutoGeolocate.current && initialMapCentre.current) {
        focusAndLoad(
          initialMapCentre.current,
          initialMapZoom.current ?? 10.8,
        );
        return;
      }
      if (!locator || !window.navigator.geolocation) {
        focusFallback();
        return;
      }
      locator.on("geolocate", handleLocation);
      locator.on("error", handleLocationUnavailable);
      locator.on("outofmaxbounds", handleLocationUnavailable);
      locationFallback = window.setTimeout(focusFallback, 750);
      locator.trigger();
    };

    if (localMap.loaded()) activate();
    else localMap.once("load", activate);
    return () => {
      const controller = request.current;
      controller?.abort();
      if (request.current === controller) request.current = null;
      const evidenceController = evidenceRequest.current;
      evidenceController?.abort();
      if (evidenceRequest.current === evidenceController)
        evidenceRequest.current = null;
      activeRequestKey.current = null;
      clearLocationListeners();
      if (locationFallback !== undefined)
        window.clearTimeout(locationFallback);
      if (drawFrame !== undefined) window.cancelAnimationFrame(drawFrame);
      localMap.off("load", activate);
      localMap.off("moveend", loadHabitat);
      localMap.off("move", scheduleDrawHabitat);
      drawCellsRef.current = () => undefined;
    };
  }, [habitat, selectedRegion, showCompatibility, speciesId]);

  useEffect(() => {
    const localMap = map.current;
    if (!localMap || !speciesId || showCompatibility) return;

    const locator = geolocateControl.current;
    let geolocationReloadFrame: number | undefined;
    let waitingForGeolocationMoveEnd = false;

    const drawCells = () => {
      const canvas = cellCanvas.current;
      if (!canvas) return;
      const context = prepareCanvas(canvas);
      if (!context) return;
      withCataloniaLandClip(context, localMap, () => {
        for (const cell of cellsById.current.values()) {
          const [[west, south], [east, north]] = cell.cellBounds;
          const topLeft = localMap.project([west, north]);
          const bottomRight = localMap.project([east, south]);
          const cellWidth = Math.max(bottomRight.x - topLeft.x, 1);
          const cellHeight = Math.max(bottomRight.y - topLeft.y, 1);
          const selected = cell.cellId === selectedCellIdRef.current;
          context.fillStyle = predictionMapCellColour(cell.score, cell.habitatCoverage);
          context.fillRect(topLeft.x, topLeft.y, cellWidth, cellHeight);
          context.strokeStyle = selected
            ? "#3b3b3b"
            : cell.score === 0
              ? "rgba(92, 87, 78, 0.58)"
              : "rgba(242, 235, 213, 0.78)";
          context.lineWidth = selected ? 2.5 : 0.65;
          context.setLineDash(cell.score === 0 && !selected ? [3, 3] : []);
          context.strokeRect(topLeft.x, topLeft.y, cellWidth, cellHeight);
          context.setLineDash([]);
        }
      });
    };
    drawCellsRef.current = drawCells;

    // A species change must not leave the previous species painted while the
    // replacement request is in flight. Clear it immediately and keep the
    // loading state active until the new cells have been drawn.
    cellsById.current = new Map();
    completedRequestKey.current = null;
    drawCells();
    setCellState({
      status: "loading",
      published: 0,
      excluded: 0,
      withheld: 0,
      truncated: false,
      gridSizeM: visibleGridSize(localMap),
    });

    const loadCells = async () => {
      const gridSizeM = visibleGridSize(localMap);
      const params = visibleGridParams(localMap, speciesId, gridSizeM, {
        view: "map",
        v: PREDICTION_CACHE_VERSION,
      });
      const requestKey = params.toString();
      if (
        requestKey === activeRequestKey.current ||
        requestKey === completedRequestKey.current
      )
        return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      activeRequestKey.current = requestKey;
      setCellState((current) => ({ ...current, status: "loading", gridSizeM }));
      try {
        const payload = await fetchJsonWithRetry<{
          cells: PredictionMapCell[];
          truncated: boolean;
        }>(`/api/predictions?${params}`, controller.signal);
        if (request.current !== controller || controller.signal.aborted) return;
        cellsById.current = new Map(
          payload.cells.map((cell) => [cell.cellId, cell]),
        );
        completedRequestKey.current = requestKey;
        if (
          selectedCellIdRef.current &&
          !cellsById.current.has(selectedCellIdRef.current)
        ) {
          selectedCellIdRef.current = null;
          onCellSelect?.(undefined);
        }
        drawCells();
        const published = payload.cells.filter(
          (cell) => cell.score !== null && cell.score > 0,
        ).length;
        const excluded = payload.cells.filter(
          (cell) => cell.score === 0,
        ).length;
        const withheld = payload.cells.length - published - excluded;
        setCellState({
          status: !payload.cells.length
            ? "empty"
            : published
              ? "ready"
              : excluded
                ? "incompatible"
                : "withheld",
          published,
          excluded,
          withheld,
          truncated: payload.truncated,
          gridSizeM,
        });
      } catch (error) {
        if (
          request.current !== controller ||
          (error instanceof DOMException && error.name === "AbortError")
        )
          return;
        completedRequestKey.current = null;
        setCellState((current) =>
          cellsById.current.size
            ? { ...current, status: "ready" }
            : {
                status: "error",
                published: 0,
                excluded: 0,
                withheld: 0,
                truncated: false,
                gridSizeM,
              },
        );
      } finally {
        if (request.current === controller) request.current = null;
        if (activeRequestKey.current === requestKey)
          activeRequestKey.current = null;
      }
    };

    const loadCellDetails = async (cell: PredictionMapCell) => {
      detailRequest.current?.abort();
      const controller = new AbortController();
      detailRequest.current = controller;
      const [[west, south], [east, north]] = cell.cellBounds;
      const params = new URLSearchParams({
        species: speciesId,
        west: String(west),
        south: String(south),
        east: String(east),
        north: String(north),
        limit: "16",
        resolution: String(cell.gridSizeM),
        cell: cell.cellId,
        v: PREDICTION_CACHE_VERSION,
      });
      try {
        const payload = await fetchJsonWithRetry<{ cell: PredictionCell }>(
          `/api/predictions?${params}`,
          controller.signal,
        );
        if (
          detailRequest.current === controller &&
          !controller.signal.aborted &&
          selectedCellIdRef.current === cell.cellId
        )
          onCellSelect?.(payload.cell);
      } catch (error) {
        if (
          detailRequest.current !== controller ||
          (error instanceof DOMException && error.name === "AbortError")
        )
          return;
        if (selectedCellIdRef.current === cell.cellId) {
          selectedCellIdRef.current = null;
          drawCells();
          onCellSelect?.(undefined);
        }
      } finally {
        if (detailRequest.current === controller) detailRequest.current = null;
      }
    };

    const handleCellClick = (event: MapMouseEvent) => {
      const cell = findCell(cellsById.current.values(), event.lngLat.lng, event.lngLat.lat);
      if (!cell) return;
      selectedCellIdRef.current = cell.cellId;
      drawCells();
      void loadCellDetails(cell);
    };
    const updatePointer = (event: MapMouseEvent) => {
      const overCell = findCell(cellsById.current.values(), event.lngLat.lng, event.lngLat.lat);
      localMap.getCanvas().style.cursor = overCell ? "pointer" : "";
    };
    const reloadGeolocatedCells = () => {
      waitingForGeolocationMoveEnd = false;
      void loadCells();
    };
    const handleGeolocate = () => {
      if (localMap.isMoving()) {
        if (!waitingForGeolocationMoveEnd) {
          waitingForGeolocationMoveEnd = true;
          localMap.once("moveend", reloadGeolocatedCells);
        }
        return;
      }
      if (geolocationReloadFrame !== undefined)
        window.cancelAnimationFrame(geolocationReloadFrame);
      geolocationReloadFrame = window.requestAnimationFrame(() => {
        geolocationReloadFrame = undefined;
        reloadGeolocatedCells();
      });
    };
    const activate = () => {
      localMap.on("click", handleCellClick);
      localMap.on("mousemove", updatePointer);
      localMap.on("move", drawCells);
      locator?.on("geolocate", handleGeolocate);
      void loadCells();
      if (
        locator &&
        window.navigator.geolocation &&
        !initialGeolocationTriggered.current
      ) {
        initialGeolocationTriggered.current = true;
        locator.trigger();
      }
    };

    if (localMap.loaded()) activate();
    else localMap.once("load", activate);
    localMap.on("moveend", loadCells);
    return () => {
      const controller = request.current;
      controller?.abort();
      if (request.current === controller) request.current = null;
      const detailController = detailRequest.current;
      detailController?.abort();
      if (detailRequest.current === detailController)
        detailRequest.current = null;
      activeRequestKey.current = null;
      if (geolocationReloadFrame !== undefined)
        window.cancelAnimationFrame(geolocationReloadFrame);
      localMap.off("moveend", reloadGeolocatedCells);
      localMap.off("load", activate);
      localMap.off("moveend", loadCells);
      localMap.off("click", handleCellClick);
      localMap.off("mousemove", updatePointer);
      localMap.off("move", drawCells);
      locator?.off("geolocate", handleGeolocate);
      drawCellsRef.current = () => undefined;
    };
  }, [showCompatibility, speciesId, onCellSelect]);

  const changeBasemap = (nextBasemapId: BasemapId) => {
    const localMap = map.current;
    if (!localMap || nextBasemapId === selectedBasemapId) return;

    const previousBasemapId = selectedBasemapId;
    const changeId = basemapChangeId.current + 1;
    basemapChangeId.current = changeId;
    setSelectedBasemapId(nextBasemapId);
    setBasemapStatus("loading");

    try {
      localMap.once("style.load", () => {
        if (basemapChangeId.current !== changeId) return;
        setBasemapStatus("idle");
        drawCellsRef.current();
      });
      localMap.setStyle(basemapStyle(nextBasemapId));
      try {
        window.localStorage.setItem(basemapStorageKey, nextBasemapId);
      } catch {
        // The selected basemap still works when browser storage is unavailable.
      }
    } catch {
      if (basemapChangeId.current !== changeId) return;
      setSelectedBasemapId(previousBasemapId);
      setBasemapStatus("error");
    }
  };

  const gridDimensions = formatGridDimensions(cellState.gridSizeM);
  const habitatEvidenceCopy =
    habitatEvidenceState.available === null
      ? "Carregant registres…"
      : habitatEvidenceState.available === false
        ? "Registres de FungaCAT no disponibles."
        : habitatEvidenceState.habitatCells
          ? `${habitatEvidenceState.records} registres en ${habitatEvidenceState.cells} quadrícules de 10 km; ${habitatEvidenceState.habitatCells} sectors coincideixen.`
          : habitatEvidenceState.cells
            ? `${habitatEvidenceState.records} registres en ${habitatEvidenceState.cells} quadrícules de 10 km; cap coincidència visible.`
            : "Cap registre visible; no implica absència.";
  const statusCopy = showCompatibility
    ? cellState.status === "ready"
      ? {
          title: "Coberta del sòl, altitud i pH compatibles",
          detail: cellState.truncated
            ? `Resolució actual: ${gridDimensions}. Apropeu-vos per carregar la resta.`
            : cellState.gridSizeM > 250
              ? `Resolució actual: ${gridDimensions}. Apropeu-vos per veure la graella de 250 m.`
              : `Resolució actual: ${gridDimensions}.`,
        }
      : cellState.status === "loading"
        ? {
            title: "Comprovant coberta del sòl, altitud i pH…",
            detail: `Comprovant coberta del sòl, altitud i pH a ${gridDimensions}.`,
          }
        : cellState.status === "error"
          ? {
              title: "No s’han pogut carregar les zones compatibles",
              detail:
                "La base cartogràfica continua disponible; torna-ho a provar movent el mapa.",
            }
          : {
              title: "Cap zona compatible en aquesta vista",
              detail:
                "No hi ha cel·les on coincideixin la coberta del sòl, l’altitud i el pH requerits.",
            }
    : cellState.status === "ready"
      ? {
          title: "Predicció disponible",
          detail: `Resolució: ${gridDimensions}.`,
        }
        : cellState.status === "incompatible"
          ? {
            title: `${cellState.excluded} cel·les amb puntuació 0`,
            detail:
              "Es mostren en vermell: ara no tenen hàbitat compatible o l’espècie queda fora de la temporada activa.",
          }
        : cellState.status === "withheld"
          ? {
              title: "Cel·les disponibles, predicció retinguda",
              detail:
                "Falten factors crítics, les dades són antigues o la cobertura no supera el llindar mínim.",
            }
          : cellState.status === "loading"
            ? {
                title: `Carregant la graella de ${gridDimensions}…`,
                detail:
                  "Consultant l’última instantània ambiental per a aquesta vista.",
              }
            : cellState.status === "error"
              ? {
                  title: "No s’han pogut carregar les cel·les",
                  detail:
                    "La base cartogràfica continua disponible; torna-ho a provar movent el mapa.",
                }
              : {
                  title: `Encara no hi ha cel·les de ${gridDimensions} publicades`,
                  detail:
                    "La predicció per cel·la s’activarà quan la ingestió espacial publiqui sòl, bosc, relleu i temps verificats.",
                };

  return (
    <div
      className={`region-map${habitat ? " region-map-habitat" : ""}${showCompatibility ? " region-map-compatibility" : ""} ${className}`}
      data-active-region-count={activeRegions.length}
      data-selected-region={selectedRegion}
      data-basemap={selectedBasemapId}
      data-map-mode={showCompatibility ? "compatibility" : "prediction"}
      aria-busy={cellState.status === "loading"}
      aria-label="Mapa interactiu de Catalunya. Arrossega per desplaçar-te i utilitza els controls per canviar l’escala o el fons cartogràfic."
      role="region"
    >
      <div className="region-map-viewport">
        <div ref={node} className="region-map-surface" />
        <canvas
          ref={cellCanvas}
          className="region-map-cells"
          style={{ opacity: cellsVisible ? cellOpacity / 100 : 0 }}
          aria-hidden
        />
        {showCompatibility ? (
          <canvas
            ref={historicalEvidenceCanvas}
            className="region-map-history"
            style={{
              opacity: historicalEvidenceVisible
                ? historicalEvidenceOpacity / 100
                : 0,
            }}
            aria-hidden
          />
        ) : null}
        {habitat && cellState.status === "loading" ? (
          <div className="habitat-map-loading" aria-hidden="true">
            <LoaderCircle size={16} />
            <span>Carregant mapa i zones compatibles…</span>
          </div>
        ) : null}
        {speciesId && !habitat && cellState.status === "loading" ? (
          <div className="prediction-map-loading" role="status" aria-live="polite">
            <div>
              <LoaderCircle size={24} aria-hidden />
              <strong>{showCompatibility ? "Actualitzant la compatibilitat…" : "Actualitzant la predicció…"}</strong>
              <span>{showCompatibility
                ? `Carregant les zones compatibles de ${gridDimensions} per a aquesta espècie.`
                : `Carregant les cel·les de ${gridDimensions} per a aquesta espècie.`}</span>
            </div>
          </div>
        ) : null}
        {speciesId && !habitat && cellState.status !== "loading" ? (
          <div className="map-data-state" aria-live="polite">
            <Grid3X3 size={18} aria-hidden />
            <div>
              <strong>{statusCopy.title}</strong>
              <span>{statusCopy.detail}</span>
            </div>
          </div>
        ) : null}
        {speciesId ? (
          <div
            className={`map-cell-visibility${layerControlsExpanded ? "" : " is-collapsed"}`}
          >
            <div className="map-cell-visibility-header">
              <strong className="map-cell-visibility-title">
                Capes del mapa
              </strong>
              <button
                type="button"
                className="map-cell-visibility-panel-toggle"
                aria-controls={layerControlsId}
                aria-expanded={layerControlsExpanded}
                aria-label={
                  layerControlsExpanded
                    ? "Amaga els controls del mapa"
                    : "Mostra els controls del mapa"
                }
                title={
                  layerControlsExpanded
                    ? "Amaga els controls del mapa"
                    : "Mostra els controls del mapa"
                }
                onClick={() =>
                  setLayerControlsExpanded((expanded) => !expanded)
                }
              >
                {layerControlsExpanded ? (
                  <X size={16} aria-hidden />
                ) : (
                  <SlidersHorizontal size={16} aria-hidden />
                )}
              </button>
            </div>
            <div
              id={layerControlsId}
              className="map-cell-visibility-controls"
              role="group"
              aria-label="Capes del mapa"
              hidden={!layerControlsExpanded}
            >
              {!habitat ? (
                <MapModeControl
                  mode={mode}
                  predictionAvailable={predictionAvailable}
                />
              ) : null}
              <fieldset
                className="map-basemap-control"
                disabled={basemapStatus === "loading"}
                aria-busy={basemapStatus === "loading"}
              >
                <legend>Fons cartogràfic</legend>
                <div className="map-basemap-options">
                  {basemapOptions.map((option) => (
                    <label
                      key={option.id}
                      className="map-basemap-option"
                      title={option.description}
                    >
                      <input
                        type="radio"
                        name={basemapChoiceName}
                        value={option.id}
                        checked={selectedBasemapId === option.id}
                        aria-label={`${option.label}: ${option.description}`}
                        onChange={() => changeBasemap(option.id)}
                      />
                      <span
                        className={`map-basemap-preview map-basemap-preview-${option.preview}`}
                        aria-hidden
                      />
                      <span className="map-basemap-option-label">
                        {option.shortLabel}
                      </span>
                      <span className="map-basemap-option-provider">
                        {option.provider}
                      </span>
                    </label>
                  ))}
                </div>
                {basemapStatus !== "idle" ? (
                  <p className="map-basemap-status" aria-live="polite">
                    {basemapStatus === "loading"
                      ? "Canviant el fons…"
                      : "No s’ha pogut carregar aquest fons."}
                  </p>
                ) : null}
              </fieldset>
              <MapLayerControl
                id={cellOpacityId}
                label={showCompatibility ? "Zones compatibles" : "Predicció"}
                controlName={
                  showCompatibility ? "les zones compatibles" : "la predicció"
                }
                opacityLabel={
                  showCompatibility
                    ? "Opacitat de les zones compatibles"
                    : "Opacitat de la predicció"
                }
                variant={showCompatibility ? "compatibility" : "prediction"}
                visible={cellsVisible}
                opacity={cellOpacity}
                onVisibilityChange={() =>
                  setCellsVisible((visible) => !visible)
                }
                onOpacityChange={setCellOpacity}
              />
              {showCompatibility ? (
                <MapLayerControl
                  id={historicalEvidenceOpacityId}
                  label="Registres històrics"
                  controlName="els registres històrics"
                  opacityLabel="Opacitat dels registres històrics"
                  variant="history"
                  visible={historicalEvidenceVisible}
                  opacity={historicalEvidenceOpacity}
                  onVisibilityChange={() =>
                    setHistoricalEvidenceVisible((visible) => !visible)
                  }
                  onOpacityChange={setHistoricalEvidenceOpacity}
                />
              ) : null}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className="map-reset-button"
          onClick={() => {
            if (!map.current) return;
            fitCatalonia(map.current);
          }}
          aria-label="Veure tot Catalunya"
        >
          Tot Catalunya
        </button>
      </div>
      {habitat ? (
        <aside
          className="habitat-map-legend"
          aria-label="Com llegir les zones compatibles"
        >
          <div className="habitat-map-legend-heading">
            <Grid3X3 size={18} aria-hidden />
            <div aria-live="polite">
              <strong>{statusCopy.title}</strong>
              <span>{statusCopy.detail}</span>
            </div>
          </div>
          <div className="habitat-map-legend-items">
            <div className="habitat-map-legend-item">
              <i className="habitat-coverage-swatch" aria-hidden />
              <div>
                <strong>Blau · zones compatibles</strong>
                <span>Més intensitat indica més cobertura; els límits d’altitud tenen una transició suau.</span>
              </div>
            </div>
            <div className="habitat-map-legend-item">
              <i className="habitat-history-swatch" aria-hidden />
              <div>
                <strong>
                  {compactLegend
                    ? "Ratllat lila · registres"
                    : "Ratllat lila · registres històrics"}
                </strong>
                <span>
                  {compactLegend
                    ? "Registres històrics generalitzats a 10 km; no amplien l’hàbitat compatible."
                    : <>Context històric; no amplia les zones compatibles. {habitatEvidenceCopy}</>}
                </span>
              </div>
            </div>
          </div>
          <p className="habitat-map-legend-note">
            Aquest mapa no indica presència actual ni si les condicions de fructificació són bones avui.
          </p>
        </aside>
      ) : null}
    </div>
  );
}
