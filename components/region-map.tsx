"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Eye, EyeOff, Grid3X3, LoaderCircle } from "lucide-react";
import {
  FullscreenControl,
  GeolocateControl,
  Map as MapLibre,
  NavigationControl,
  type Map as MapLibreMap,
  type MapMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import { cataloniaLandRings } from "@/data/catalonia-land";
import { cataloniaRegionsGeoJson, regionCentres } from "@/data/regions";
import {
  habitatCellColour,
  isHabitatCellCorroborated,
} from "@/src/lib/habitat-map";
import { boundsContain, formatGridDimensions, gridSizeForZoom } from "@/src/lib/map-grid";
import { formatMapCoordinate } from "@/src/lib/map-query";
import type {
  OccurrenceSupportCell,
  PotentialHabitatCell,
  PredictionCell,
  PredictionMapCell,
  RegionId,
  SpatialGridSizeM,
} from "@/src/lib/types";

const cataloniaBounds: [[number, number], [number, number]] = [
  [0.05, 40.48],
  [3.32, 42.92],
];
const icgcBaseTiles =
  "https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=estandard&STYLES=&FORMAT=image/jpeg&TRANSPARENT=FALSE&BGCOLOR=0xF2EBD5&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256";
const icgcBaseStyle: StyleSpecification = {
  version: 8,
  sources: {
    "icgc-base": {
      type: "raster",
      tiles: [icgcBaseTiles],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 18,
      attribution: "© Institut Cartogràfic i Geològic de Catalunya",
    },
  },
  layers: [
    {
      id: "icgc-base",
      type: "raster",
      source: "icgc-base",
      paint: { "raster-fade-duration": 0 },
    },
  ],
};

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

function waitForRetry(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, 300);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchJsonWithRetry<T>(
  url: string,
  signal: AbortSignal,
  attempts = 2,
): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, { signal });
    } catch (error) {
      if (signal.aborted || attempt === attempts - 1) throw error;
      await waitForRetry(signal);
      continue;
    }
    if (response.ok) return response.json() as Promise<T>;
    if (response.status < 500 || attempt === attempts - 1)
      throw new Error(`Prediction cells unavailable (${response.status})`);
    await waitForRetry(signal);
  }
  throw new Error("Prediction cells unavailable");
}

const scoreColour = (score: number | null) => {
  if (score === null) return "rgba(150, 149, 142, 0.24)";
  if (score < 44) return "rgba(189, 118, 83, 0.72)";
  if (score < 64) return "rgba(242, 167, 102, 0.72)";
  if (score < 79) return "rgba(242, 138, 46, 0.75)";
  return "rgba(150, 63, 32, 0.78)";
};

const habitatGridSizeForZoom = (zoom: number): SpatialGridSizeM => {
  const adaptiveSize = gridSizeForZoom(zoom);
  return adaptiveSize === 10000 ? 5000 : adaptiveSize;
};

function visibleGridParams(localMap: MapLibreMap, speciesId: string, gridSizeM: SpatialGridSizeM, extras?: Record<string, string>) {
  const bounds = localMap.getBounds();
  return new URLSearchParams({
    species: speciesId,
    west: formatMapCoordinate(Math.max(bounds.getWest(), cataloniaBounds[0][0])),
    south: formatMapCoordinate(Math.max(bounds.getSouth(), cataloniaBounds[0][1])),
    east: formatMapCoordinate(Math.min(bounds.getEast(), cataloniaBounds[1][0])),
    north: formatMapCoordinate(Math.min(bounds.getNorth(), cataloniaBounds[1][1])),
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
  selectedRegion,
  speciesId,
  habitat = false,
  selectedCellId,
  className = "",
  fullscreenTarget = "viewport",
  onCellSelect,
}: {
  activeRegions?: RegionId[];
  selectedRegion?: RegionId;
  speciesId?: string;
  habitat?: boolean;
  selectedCellId?: string;
  className?: string;
  fullscreenTarget?: "viewport" | "parent";
  onCellSelect?: (cell?: PredictionCell) => void;
}) {
  const node = useRef<HTMLDivElement>(null);
  const cellCanvas = useRef<HTMLCanvasElement>(null);
  const historicalEvidenceCanvas = useRef<HTMLCanvasElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const geolocateControl = useRef<GeolocateControl | null>(null);
  const initialSpeciesId = useRef(speciesId);
  const initialHabitat = useRef(habitat);
  const initialRegion = useRef(selectedRegion);
  const initialActiveRegions = useRef(activeRegions);
  const initialFullscreenTarget = useRef(fullscreenTarget);
  const previousRegion = useRef(selectedRegion);
  const previousSpeciesId = useRef(speciesId);
  const request = useRef<AbortController | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const activeRequestKey = useRef<string | null>(null);
  const completedRequestKey = useRef<string | null>(null);
  const cellsById = useRef(new Map<string, PredictionMapCell>());
  const habitatCellsById = useRef(new Map<string, PotentialHabitatCell>());
  const corroboratedHabitatCellIds = useRef(new Set<string>());
  const selectedCellIdRef = useRef<string | null>(null);
  const drawCellsRef = useRef<() => void>(() => undefined);
  const cellOpacityId = useId();
  const historicalEvidenceOpacityId = useId();
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
    if (!node.current || map.current) return;

    const mapRoot = node.current.closest<HTMLElement>(".region-map");
    const fullscreenContainer = initialFullscreenTarget.current === "parent"
      ? mapRoot?.parentElement
      : node.current.parentElement;
    const isPredictionMap = Boolean(
      initialSpeciesId.current && !initialHabitat.current,
    );
    const localMap = new MapLibre({
      container: node.current,
      style: icgcBaseStyle,
      center:
        isPredictionMap && initialRegion.current
          ? regionCentres[initialRegion.current]
          : distributionCentre(initialActiveRegions.current),
      zoom: isPredictionMap && initialRegion.current ? 12.8 : 6.2,
      attributionControl: false,
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
    const geolocate = initialSpeciesId.current
      ? new GeolocateControl({
          positionOptions: {
            enableHighAccuracy: !initialHabitat.current,
            maximumAge: 300_000,
            timeout: initialHabitat.current ? 3_000 : 8_000,
          },
          fitBoundsOptions: { maxZoom: initialHabitat.current ? 11.2 : 14 },
          trackUserLocation: false,
          showAccuracyCircle: true,
          showUserLocation: true,
        })
      : undefined;
    geolocateControl.current = geolocate ?? null;
    if (geolocate) localMap.addControl(geolocate, "top-right");
    let locationRetry: number | undefined;
    let locationAttempts = 0;
    const locateWhenReady = () => {
      if (!isPredictionMap || !geolocate || !window.navigator.geolocation)
        return;
      const button = localMap
        .getContainer()
        .querySelector<HTMLButtonElement>(".maplibregl-ctrl-geolocate");
      if (button && !button.disabled) {
        geolocate.trigger();
        return;
      }
      if (locationAttempts < 20) {
        locationAttempts += 1;
        locationRetry = window.setTimeout(locateWhenReady, 100);
      }
    };
    localMap.once("load", () => {
      localMap.resize();
      if (!isPredictionMap) fitCatalonia(localMap, false);
      drawCellsRef.current();
      locateWhenReady();
    });

    const resizeObserver = new ResizeObserver(() => {
      localMap.resize();
      drawCellsRef.current();
    });
    resizeObserver.observe(node.current);

    return () => {
      if (locationRetry !== undefined) window.clearTimeout(locationRetry);
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
    if (!localMap || !speciesId || !habitat) return;

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
          context.fillStyle = habitatCellColour(cell.coverage);
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
    const loadHabitat = async () => {
      const gridSizeM = habitatGridSizeForZoom(localMap.getZoom());
      const params = visibleGridParams(localMap, speciesId, gridSizeM);
      const requestKey = `habitat:${params}`;
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
          cells: PotentialHabitatCell[];
          truncated: boolean;
          occurrenceEvidence: {
            available: boolean;
            cells: OccurrenceSupportCell[];
          };
        }>(`/api/habitat?${params}`, controller.signal, 1);
        habitatCellsById.current = new Map(
          payload.cells.map((cell) => [cell.cellId, cell]),
        );
        const supportCells = payload.occurrenceEvidence.cells;
        corroboratedHabitatCellIds.current = new Set(
          payload.cells
            .filter((cell) => isHabitatCellCorroborated(cell, supportCells))
            .map((cell) => cell.cellId),
        );
        setHabitatEvidenceState({
          available: payload.occurrenceEvidence.available,
          cells: payload.occurrenceEvidence.cells.length,
          habitatCells: corroboratedHabitatCellIds.current.size,
          records: payload.occurrenceEvidence.cells.reduce(
            (total, cell) => total + cell.recordCount,
            0,
          ),
        });
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
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
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
        if (activeRequestKey.current === requestKey)
          activeRequestKey.current = null;
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
      request.current?.abort();
      clearLocationListeners();
      if (locationFallback !== undefined)
        window.clearTimeout(locationFallback);
      if (drawFrame !== undefined) window.cancelAnimationFrame(drawFrame);
      localMap.off("load", activate);
      localMap.off("moveend", loadHabitat);
      localMap.off("move", scheduleDrawHabitat);
      drawCellsRef.current = () => undefined;
    };
  }, [habitat, selectedRegion, speciesId]);

  useEffect(() => {
    const localMap = map.current;
    if (!localMap || !speciesId || habitat) return;

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
          if (cell.score !== 0) {
            context.fillStyle = scoreColour(cell.score);
            context.fillRect(topLeft.x, topLeft.y, cellWidth, cellHeight);
          }
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

    const loadCells = async () => {
      const gridSizeM = gridSizeForZoom(localMap.getZoom());
      const params = visibleGridParams(localMap, speciesId, gridSizeM, { view: "map" });
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
        if (error instanceof DOMException && error.name === "AbortError")
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
      });
      try {
        const payload = await fetchJsonWithRetry<{ cell: PredictionCell }>(
          `/api/predictions?${params}`,
          controller.signal,
        );
        if (selectedCellIdRef.current === cell.cellId)
          onCellSelect?.(payload.cell);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        if (selectedCellIdRef.current === cell.cellId) {
          selectedCellIdRef.current = null;
          drawCells();
          onCellSelect?.(undefined);
        }
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
    const activate = () => {
      localMap.on("click", handleCellClick);
      localMap.on("mousemove", updatePointer);
      localMap.on("move", drawCells);
      void loadCells();
    };

    if (localMap.loaded()) activate();
    else localMap.once("load", activate);
    localMap.on("moveend", loadCells);
    return () => {
      request.current?.abort();
      detailRequest.current?.abort();
      localMap.off("load", activate);
      localMap.off("moveend", loadCells);
      localMap.off("click", handleCellClick);
      localMap.off("mousemove", updatePointer);
      localMap.off("move", drawCells);
      drawCellsRef.current = () => undefined;
    };
  }, [habitat, speciesId, onCellSelect]);

  const gridDimensions = formatGridDimensions(cellState.gridSizeM);
  const habitatEvidenceCopy =
    habitatEvidenceState.available === null
      ? "Carregant els registres històrics…"
      : habitatEvidenceState.available === false
        ? "Els registres FungaCAT no estan disponibles ara mateix."
        : habitatEvidenceState.habitatCells
          ? `${habitatEvidenceState.habitatCells} sectors visibles coincideixen amb ${habitatEvidenceState.records} registres FungaCAT, generalitzats en ${habitatEvidenceState.cells} quadrícules de 10 km.`
          : habitatEvidenceState.cells
            ? `Hi ha ${habitatEvidenceState.records} registres FungaCAT en aquesta vista, però no coincideixen amb les zones compatibles visibles.`
            : "No hi ha registres FungaCAT en aquesta vista; això no demostra absència.";
  const statusCopy = habitat
    ? cellState.status === "ready"
      ? {
          title: "Coberta del sòl, altitud i pH compatibles",
          detail: `${cellState.published} sectors de ${gridDimensions} contenen almenys una cel·la base de 250 m amb coberta del sòl, altitud i pH compatibles.${cellState.truncated ? " Apropa el mapa per carregar la resta." : cellState.gridSizeM > 250 ? " Apropa per veure la distribució exacta a 250 m." : " Estàs veient la graella base de 250 m."}`,
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
                "La base topogràfica continua disponible; torna-ho a provar movent el mapa.",
            }
          : {
              title: "Cap zona compatible en aquesta vista",
              detail:
                "No hi ha cel·les on coincideixin la coberta del sòl, l’altitud i el pH requerits.",
            }
    : cellState.status === "ready"
      ? {
          title: `${cellState.published} cel·les de ${gridDimensions} compatibles`,
          detail: `${cellState.excluded ? `${cellState.excluded} fora del rang ecològic. ` : ""}${cellState.withheld ? `${cellState.withheld} retingudes per dades incompletes. ` : ""}${cellState.truncated ? "Mou o apropa el mapa per carregar la resta." : cellState.gridSizeM > 250 ? "Apropa el mapa per veure una graella més detallada." : "La resolució real de cada font es conserva a les metadades."}`,
        }
      : cellState.status === "incompatible"
        ? {
            title: "Cap cel·la compatible en aquesta vista",
            detail: `${cellState.excluded} cel·les queden fora del rang ecològic configurat per a l’espècie.`,
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
                    "La base topogràfica continua disponible; torna-ho a provar movent el mapa.",
                }
              : {
                  title: `Encara no hi ha cel·les de ${gridDimensions} publicades`,
                  detail:
                    "La predicció per cel·la s’activarà quan la ingestió espacial publiqui sòl, bosc, relleu i temps verificats.",
                };

  return (
    <div
      className={`region-map${habitat ? " region-map-habitat" : ""} ${className}`}
      data-active-region-count={activeRegions.length}
      data-selected-region={selectedRegion}
      aria-label="Mapa topogràfic interactiu de Catalunya. Arrossega per desplaçar-te i utilitza els controls per canviar l’escala."
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
        {habitat ? (
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
        {speciesId && !habitat ? (
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
            className="map-cell-visibility"
            role="group"
            aria-label={habitat ? "Capes del mapa" : "Visibilitat de les cel·les"}
          >
            {habitat ? (
              <strong className="map-cell-visibility-title">Capes del mapa</strong>
            ) : null}
            <MapLayerControl
              id={cellOpacityId}
              label={habitat ? "Zones compatibles" : "Cel·les"}
              controlName={
                habitat ? "les zones compatibles" : "les cel·les del mapa"
              }
              opacityLabel={
                habitat
                  ? "Opacitat de les zones compatibles"
                  : "Opacitat de les cel·les"
              }
              variant={habitat ? "compatibility" : "prediction"}
              visible={cellsVisible}
              opacity={cellOpacity}
              onVisibilityChange={() =>
                setCellsVisible((visible) => !visible)
              }
              onOpacityChange={setCellOpacity}
            />
            {habitat ? (
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
                <span>Més intensitat significa que una part més gran del sector compleix els tres criteris.</span>
              </div>
            </div>
            <div className="habitat-map-legend-item">
              <i className="habitat-history-swatch" aria-hidden />
              <div>
                <strong>Ratllat lila · registres històrics</strong>
                <span>La trama afegeix context històric; no amplia les zones compatibles. {habitatEvidenceCopy}</span>
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
