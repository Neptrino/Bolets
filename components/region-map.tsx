"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  type GeolocateControl,
  type Map as MapLibreMap,
  type MapMouseEvent,
} from "maplibre-gl";
import { createRegionMap } from "@/components/region-map/map-instance";
import { fetchPredictionCellDetail } from "@/components/region-map/prediction-detail";
import { drawPredictionSurface } from "@/components/region-map/prediction-surface";
import {
  basemapStyle,
  cataloniaBounds,
  cataloniaSpatialBounds,
  createHistoricalEvidencePattern,
  drawTerritorialWindow,
  findCell,
  fitCatalonia,
  fitRegion,
  fitSpatialBounds,
  initialRegionMapView,
  prepareCanvas,
  rememberBucket,
  visibleGridParams,
  visibleGridSize,
  visibleSpatialBounds,
  withCataloniaLandClip,
  type CellState,
  type HabitatEvidenceState,
} from "@/components/region-map/support";
import type { RegionMapProps } from "@/components/region-map/types";
import { useRegionBasemap } from "@/components/region-map/use-basemap";
import { useCollapsibleMapControls } from "@/components/region-map/use-collapsible-controls";
import { useRegionMapStatus } from "@/components/region-map/use-viewport-status";
import { RegionMapView } from "@/components/region-map/view";
import { useMapResolutionAccess } from "@/components/region-map/use-resolution-access";
import { fetchJsonWithRetry } from "@/src/lib/fetch-json";
import {
  GLOBAL_SPECIES_ID,
} from "@/src/lib/global-map";
import {
  habitatCellColour,
  habitatCellIntensity,
  isHabitatCellCorroborated,
} from "@/src/lib/habitat-map";
import {
  boundsContain,
} from "@/src/lib/map-grid";
import { createBucketNetworkGate, loadBucketedCells,
  summarizeBucketCoverage } from "@/src/lib/bucket-loader";
import {
  bucketsForBounds,
  prioritizeBucketsAround,
} from "@/src/lib/map-query";
import {
  habitatBucketUrl,
  predictionBucketUrl,
} from "@/src/lib/map-request-url";
import {
  predictionViewportStatus,
} from "@/src/lib/prediction-map-status";
import type {
  OccurrenceSupportCell,
  PotentialHabitatMapCell,
  PredictionMapCell,
  PredictionTimelineOffset,
} from "@/src/lib/types";

export type { PredictionCellDetailState, PredictionViewportStatus } from "@/components/region-map/types";

export function RegionMap({
  activeRegions = [],
  autoGeolocate = true,
  compactLegend = false,
  initialCentre,
  initialZoom,
  interactive = true,
  focusBounds,
  selectedRegion,
  speciesId,
  habitat = false,
  mode = "prediction",
  maximumPredictionGridSizeM,
  predictionAvailable = true,
  predictionRendering = "cells",
  showReadyStatus = true,
  showTimeline = false,
  selectedCellId,
  className = "",
  fullscreenTarget = "viewport",
  onCellClick,
  onGeolocationSuccess,
  onCellSelect,
  onCellDetailStateChange,
  onViewportStatusChange,
  onDetailResolutionChange,
  onTimelineOffsetChange,
}: RegionMapProps) {
  const showCompatibility = habitat || mode === "compatibility";
  const globalPrediction = speciesId === GLOBAL_SPECIES_ID;
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
  const initialInteractive = useRef(interactive);
  const initialFocusBounds = useRef(focusBounds);
  const initialRegion = useRef(selectedRegion);
  const initialActiveRegions = useRef(activeRegions);
  const initialFullscreenTarget = useRef(fullscreenTarget);
  const previousRegion = useRef(selectedRegion);
  const previousSpeciesId = useRef(speciesId);
  const initialGeolocationTriggered = useRef(false);
  const geolocationSuccessTracked = useRef(false);
  // map.loaded() reports false whenever tiles are still streaming in, and the
  // "load" event only ever fires once, so effects that re-run after it must
  // consult this ref instead of waiting for a second "load" that never comes.
  const mapLoaded = useRef(false);
  const request = useRef<AbortController | null>(null);
  const evidenceRequest = useRef<AbortController | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const activeRequestKey = useRef<string | null>(null);
  const completedRequestKey = useRef<string | null>(null);
  // Responses keyed by their own bucket request, so panning back over ground
  // already covered repaints from memory instead of refetching. The viewport
  // maps below are rebuilt from these, and still describe only what is on
  // screen.
  const bucketCells = useRef(new Map<string, PredictionMapCell[]>());
  const habitatBucketCells = useRef(new Map<string, PotentialHabitatMapCell[]>());
  // Requests in progress, shared across overlapping viewports so a pan never
  // asks for a bucket another pan is already fetching.
  const inFlightBuckets = useRef(new Map<string, Promise<void>>());
  const bucketNetworkGate = useRef(createBucketNetworkGate());
  const batchId = useRef(0);
  const cellsById = useRef(new Map<string, PredictionMapCell>());
  const habitatCellsById = useRef(new Map<string, PotentialHabitatMapCell>());
  const corroboratedHabitatCellIds = useRef(new Set<string>());
  const selectedCellIdRef = useRef<string | null>(null);
  const drawCellsRef = useRef<() => void>(() => undefined);
  const cellOpacityId = useId();
  const historicalEvidenceOpacityId = useId();
  const layerControlsId = useId();
  const basemapChoiceName = useId();
  const {
    expanded: layerControlsExpanded,
    toggle: toggleLayerControls,
  } = useCollapsibleMapControls();
  const {
    basemapStatus,
    changeBasemap,
    initializeBasemap,
    selectedBasemapId,
  } = useRegionBasemap(map, drawCellsRef, {
    // A static map has no layer control, so a saved choice from another map
    // must not silently replace its intended default relief presentation.
    rememberSelection: interactive,
  });
  const [cellsVisible, setCellsVisible] = useState(true);
  const [timelineOffset, setTimelineOffset] = useState<PredictionTimelineOffset>(0);
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
    incomplete: false,
    gridSizeM: 2500,
  });
  const [habitatEvidenceState, setHabitatEvidenceState] =
    useState<HabitatEvidenceState>({
      available: null,
      cells: 0,
      habitatCells: 0,
      records: 0,
    });
  const changeTimelineOffset = useCallback((offset: PredictionTimelineOffset) => {
    setTimelineOffset(offset);
    selectedCellIdRef.current = null;
    onCellSelect?.(undefined);
    onCellDetailStateChange?.({ status: "idle" });
    onTimelineOffsetChange?.(offset);
  }, [onCellDetailStateChange, onCellSelect, onTimelineOffsetChange]);

  useEffect(() => {
    if (!node.current || map.current) return;

    const mapRoot = node.current.closest<HTMLElement>(".region-map");
    const fullscreenContainer = initialFullscreenTarget.current === "parent"
      ? mapRoot?.parentElement
      : node.current.parentElement;
    const isPredictionMap = Boolean(
      initialSpeciesId.current && !initialHabitat.current,
    );
    const initialBasemapId = initializeBasemap();
    const { center, zoom } = initialRegionMapView({
      activeRegions: initialActiveRegions.current,
      focusBounds: initialFocusBounds.current,
      mapCentre: initialMapCentre.current,
      mapZoom: initialMapZoom.current,
      prediction: isPredictionMap,
      region: initialRegion.current,
    });
    const { geolocate, map: localMap } = createRegionMap({
      center,
      container: node.current,
      fullscreenContainer: fullscreenContainer ?? undefined,
      habitat: initialHabitat.current,
      interactive: initialInteractive.current,
      showFullscreen: initialInteractive.current,
      showNavigation: initialInteractive.current,
      style: basemapStyle(initialBasemapId),
      useGeolocation: Boolean(initialSpeciesId.current) && initialInteractive.current,
      zoom,
    });
    map.current = localMap;
    geolocateControl.current = geolocate ?? null;

    localMap.resize();
    if (initialFocusBounds.current)
      fitSpatialBounds(localMap, initialFocusBounds.current, false);
    else if (isPredictionMap && initialRegion.current)
      fitRegion(localMap, initialRegion.current, false);
    else if (!initialMapCentre.current)
      fitCatalonia(localMap, false);

    localMap.once("load", () => {
      mapLoaded.current = true;
      localMap.resize();
      drawCellsRef.current();
    });

    const resizeObserver = new ResizeObserver(() => {
      localMap.resize();
      if (!initialInteractive.current && !initialMapCentre.current && !initialFocusBounds.current && !initialRegion.current)
        fitCatalonia(localMap, false);
      drawCellsRef.current();
    });
    resizeObserver.observe(node.current);

    return () => {
      resizeObserver.disconnect();
      localMap.remove();
      map.current = null;
      geolocateControl.current = null;
      mapLoaded.current = false;
    };
  }, [initializeBasemap]);

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

    const focusRegion = () => fitRegion(localMap, selectedRegion);

    if (mapLoaded.current || localMap.loaded()) focusRegion();
    else localMap.once("load", focusRegion);

    return () => {
      localMap.off("load", focusRegion);
    };
  }, [selectedRegion, speciesId]);

  const { detailedMinimumGridSizeM, predictionMinimumGridSizeM } =
    useMapResolutionAccess(map, globalPrediction, onDetailResolutionChange);

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
      drawTerritorialWindow(context, localMap, initialFocusBounds.current);
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
      incomplete: false,
      gridSizeM: visibleGridSize(localMap, detailedMinimumGridSizeM),
    });
    // One controller for the whole species/layer run; see the prediction
    // effect for why superseded viewports keep their requests.
    const controller = new AbortController();
    request.current = controller;
    const loadHabitat = async () => {
      const gridSizeM = visibleGridSize(localMap, detailedMinimumGridSizeM);
      const buckets = bucketsForBounds(
        visibleSpatialBounds(localMap),
        gridSizeM,
        cataloniaSpatialBounds,
      );
      const urls = buckets.map((bucket) =>
        habitatBucketUrl(bucket, speciesId, gridSizeM),
      );
      const requestKey = `habitat:${urls.join("|")}`;
      if (
        requestKey === activeRequestKey.current ||
        requestKey === completedRequestKey.current
      )
        return;
      evidenceRequest.current?.abort();
      activeRequestKey.current = requestKey;
      batchId.current += 1;
      const batch = batchId.current;
      const isCurrent = () => batchId.current === batch && !controller.signal.aborted;
      setCellState((current) => ({ ...current, status: "loading", gridSizeM }));

      const repaint = () => {
        habitatCellsById.current = new Map(
          urls.flatMap((url) => habitatBucketCells.current.get(url) ?? [])
            .map((cell) => [cell.cellId, cell] as const),
        );
        scheduleDrawHabitat();
      };
      corroboratedHabitatCellIds.current = new Set();
      repaint();

      const missing = buckets.filter((_, index) => !habitatBucketCells.current.has(urls[index]));
      const truncatedBuckets = { any: false };
      try {
        await loadBucketedCells<PotentialHabitatMapCell>(
          missing,
          (bucket) => habitatBucketUrl(bucket, speciesId, gridSizeM),
          controller.signal,
          (payload, bucket) => {
            if (payload.truncated) truncatedBuckets.any = true;
            rememberBucket(
              habitatBucketCells.current,
              habitatBucketUrl(bucket, speciesId, gridSizeM),
              payload.cells,
            );
            corroboratedHabitatCellIds.current = new Set();
            if (isCurrent()) repaint();
          },
          // A viewport is many small requests now, so one unlucky bucket must
          // not leave a hole: give each the same bounded retry as predictions.
          { inFlight: inFlightBuckets.current },
        );
        if (!isCurrent()) return;

        const stillMissing = urls.filter((url) => !habitatBucketCells.current.has(url)).length;
        if (stillMissing === urls.length && urls.length > 0) {
          completedRequestKey.current = null;
          setHabitatEvidenceState({
            available: null,
            cells: 0,
            habitatCells: 0,
            records: 0,
          });
          setCellState({
            status: "error",
            published: 0,
            excluded: 0,
            withheld: 0,
            truncated: false,
            incomplete: true,
            gridSizeM,
          });
        } else {
          completedRequestKey.current = requestKey;
          setCellState({
            status: habitatCellsById.current.size ? "ready" : "empty",
            published: habitatCellsById.current.size,
            excluded: 0,
            withheld: 0,
            truncated: truncatedBuckets.any,
            incomplete: stillMissing > 0,
            gridSizeM,
          });
          // Evidence is a whole-viewport context layer, so it runs once the
          // batch has settled rather than once per bucket.
          void loadHistoricalEvidence();
        }
      } finally {
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
      else if (selectedRegion) fitRegion(localMap, selectedRegion, false);
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
      if (initialMapCentre.current) {
        focusAndLoad(
          initialMapCentre.current,
          initialMapZoom.current ?? 10.8,
        );
        return;
      }
      if (!initialAutoGeolocate.current) {
        focusFallback();
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
      // trigger() toggles location tracking, so it must only be called once;
      // re-runs of this effect keep the existing watch and rely on its events.
      if (!initialGeolocationTriggered.current) {
        initialGeolocationTriggered.current = true;
        locator.trigger();
      }
    };

    if (mapLoaded.current || localMap.loaded()) activate();
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
  }, [detailedMinimumGridSizeM, habitat, selectedRegion, showCompatibility, speciesId]);

  useEffect(() => {
    const localMap = map.current;
    if (!localMap || !speciesId || showCompatibility) return;

    const minimumGridSizeM = timelineOffset === 0 ? predictionMinimumGridSizeM : 5000;
    const timelineRun = timelineOffset !== 0;
    const locator = geolocateControl.current;
    let geolocationReloadFrame: number | undefined;
    let waitingForGeolocationMoveEnd = false;

    const drawCells = () => {
      const canvas = cellCanvas.current;
      if (!canvas) return;
      const context = prepareCanvas(canvas);
      if (!context) return;
      withCataloniaLandClip(context, localMap, () => {
        drawPredictionSurface({
          cells: cellsById.current.values(),
          context,
          localMap,
          output: canvas,
          rendering: predictionRendering,
          selectedCellId: selectedCellIdRef.current,
        });
      });
      drawTerritorialWindow(context, localMap, initialFocusBounds.current);
    };
    drawCellsRef.current = drawCells;

    // A species change must not leave the previous species painted while the
    // replacement request is in flight. Clear it immediately and keep the
    // loading state active until the new cells have been drawn.
    // Only the viewport view is cleared. The bucket store and the in-flight
    // registry survive re-runs on purpose: their keys already carry species,
    // resolution and model version, so nothing can cross-contaminate, and a
    // request in progress must stay visible to the run that supersedes it.
    if (!timelineRun) cellsById.current = new Map();
    completedRequestKey.current = null;
    drawCells();
    setCellState({
      status: "loading",
      published: 0,
      excluded: 0,
      withheld: 0,
      truncated: false,
      incomplete: false,
      gridSizeM: visibleGridSize(
        localMap,
        minimumGridSizeM,
        maximumPredictionGridSizeM,
      ),
    });
    // One controller for the whole species/layer run. Superseded viewports are
    // not cancelled: their buckets are already paid for and stay useful the
    // moment the user pans back.
    const controller = new AbortController();
    request.current = controller;

    const loadCells = async () => {
      const gridSizeM = visibleGridSize(
        localMap,
        minimumGridSizeM,
        maximumPredictionGridSizeM,
      );
      const viewportBounds = visibleSpatialBounds(localMap);
      const buckets = bucketsForBounds(
        viewportBounds,
        gridSizeM,
        cataloniaSpatialBounds,
      );
      const urls = buckets.map((bucket) =>
        predictionBucketUrl(bucket, speciesId, gridSizeM, timelineOffset),
      );
      const requestKey = urls.join("|");
      if (
        requestKey === activeRequestKey.current ||
        requestKey === completedRequestKey.current
      )
        return;
      activeRequestKey.current = requestKey;
      batchId.current += 1;
      const batch = batchId.current;
      const isCurrent = () => batchId.current === batch && !controller.signal.aborted;
      setCellState((current) => ({ ...current, status: "loading", gridSizeM }));

      // Repaint from the buckets already held so ground the user has panned
      // over stays on screen while only the newly exposed buckets load.
      const repaint = () => {
        cellsById.current = new Map(
          urls.flatMap((url) => bucketCells.current.get(url) ?? [])
            .map((cell) => [cell.cellId, cell] as const),
        );
        drawCells();
      };
      if (!timelineRun) repaint();

      const missing = prioritizeBucketsAround(
        buckets.filter((_, index) => !bucketCells.current.has(urls[index])),
        [
          (viewportBounds.west + viewportBounds.east) / 2,
          (viewportBounds.south + viewportBounds.north) / 2,
        ],
      );
      const truncatedBuckets = { any: false };
      try {
        const { failed } = await loadBucketedCells<PredictionMapCell>(
          missing,
          (bucket) => predictionBucketUrl(bucket, speciesId, gridSizeM, timelineOffset),
          controller.signal,
          (payload, bucket) => {
            if (payload.truncated) truncatedBuckets.any = true;
            rememberBucket(
              bucketCells.current,
              predictionBucketUrl(bucket, speciesId, gridSizeM, timelineOffset),
              payload.cells,
            );
            if (isCurrent() && !timelineRun) {
              repaint();
              const partialCoverage = summarizeBucketCoverage(
                cellsById.current.values(),
                { truncated: truncatedBuckets.any, failed: 0 },
              );
              setCellState({
                ...partialCoverage,
                status: "loading",
                gridSizeM,
              });
            }
          },
          { inFlight: inFlightBuckets.current, networkGate: bucketNetworkGate.current,
            persistAfterAbort: !timelineRun, retryPasses: 2 },
        );
        if (!isCurrent()) return;
        if (timelineRun) repaint();

        const stillMissing = urls.filter((url) => !bucketCells.current.has(url)).length;
        // A viewport that resolved nothing at all is an error; one that
        // resolved in part is honestly reported as incomplete.
        if (stillMissing === urls.length && urls.length > 0) {
          completedRequestKey.current = null;
          setCellState({
            status: "error",
            published: 0,
            excluded: 0,
            withheld: 0,
            truncated: false,
            incomplete: true,
            gridSizeM,
          });
        } else {
          completedRequestKey.current = requestKey;
          if (
            selectedCellIdRef.current &&
            !cellsById.current.has(selectedCellIdRef.current)
          ) {
            selectedCellIdRef.current = null;
            onCellSelect?.(undefined);
            onCellDetailStateChange?.({ status: "idle" });
          }
          const coverage = summarizeBucketCoverage(cellsById.current.values(), {
            truncated: truncatedBuckets.any,
            failed: stillMissing || failed,
          });
          setCellState({
            ...coverage,
            status: predictionViewportStatus(coverage),
            gridSizeM,
          });
        }
      } finally {
        // A superseded batch must still release the key, or the viewport it
        // was replaced by matches it and never loads.
        if (activeRequestKey.current === requestKey)
          activeRequestKey.current = null;
      }
    };

    const loadCellDetails = async (cell: PredictionMapCell) => {
      detailRequest.current?.abort();
      const controller = new AbortController();
      detailRequest.current = controller;
      try {
        const payload = await fetchPredictionCellDetail(speciesId, cell, controller.signal);
        if (
          detailRequest.current === controller &&
          !controller.signal.aborted &&
          selectedCellIdRef.current === cell.cellId
        ) {
          onCellSelect?.(
            payload.cell ?? undefined,
            payload.topSpecies,
            payload.topSpecies
              ? { score: payload.score ?? null, cellId: cell.cellId, gridSizeM: cell.gridSizeM }
              : undefined,
          );
          onCellDetailStateChange?.({
            status: "ready",
            cellId: cell.cellId,
            gridSizeM: cell.gridSizeM,
          });
        }
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
          onCellDetailStateChange?.({
            status: "error",
            cellId: cell.cellId,
            gridSizeM: cell.gridSizeM,
          });
        }
      } finally {
        if (detailRequest.current === controller) detailRequest.current = null;
      }
    };

    const handleCellClick = (event: MapMouseEvent) => {
      const cell = findCell(cellsById.current.values(), event.lngLat.lng, event.lngLat.lat);
      if (!cell || timelineRun) return;
      onCellClick?.();
      selectedCellIdRef.current = cell.cellId;
      drawCells();
      onCellDetailStateChange?.({
        status: "loading",
        cellId: cell.cellId,
        gridSizeM: cell.gridSizeM,
      });
      void loadCellDetails(cell);
    };
    const updatePointer = (event: MapMouseEvent) => {
      const overCell = timelineRun
        ? undefined
        : findCell(cellsById.current.values(), event.lngLat.lng, event.lngLat.lat);
      localMap.getCanvas().style.cursor = overCell ? "pointer" : "";
    };
    const reloadGeolocatedCells = () => {
      waitingForGeolocationMoveEnd = false;
      void loadCells();
    };
    const handleGeolocate = () => {
      if (!geolocationSuccessTracked.current) {
        geolocationSuccessTracked.current = true;
        onGeolocationSuccess?.();
      }
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
      if (initialInteractive.current) {
        localMap.on("click", handleCellClick);
        localMap.on("mousemove", updatePointer);
      }
      localMap.on("move", drawCells);
      locator?.on("geolocate", handleGeolocate);
      void loadCells();
      if (
        locator &&
        window.navigator.geolocation &&
        initialAutoGeolocate.current &&
        !initialGeolocationTriggered.current
      ) {
        initialGeolocationTriggered.current = true;
        locator.trigger();
      }
    };

    if (mapLoaded.current || localMap.loaded()) activate();
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
  }, [
    showCompatibility,
    speciesId,
    predictionMinimumGridSizeM,
    maximumPredictionGridSizeM,
    predictionRendering,
    timelineOffset,
    onCellClick,
    onGeolocationSuccess,
    onCellSelect,
    onCellDetailStateChange,
  ]);

  const { evidenceCopy, statusCopy } = useRegionMapStatus({ cellState,
    globalPrediction, habitat, habitatEvidenceState, onViewportStatusChange,
    showCompatibility, showReadyStatus, speciesId });

  return (
    <RegionMapView
      activeRegionCount={activeRegions.length}
      basemapChoiceName={basemapChoiceName}
      basemapStatus={basemapStatus}
      cellCanvas={cellCanvas}
      cellOpacity={cellOpacity}
      cellOpacityId={cellOpacityId}
      cellsVisible={cellsVisible}
      cellState={cellState}
      className={className}
      compactLegend={compactLegend}
      evidenceCopy={evidenceCopy}
      globalPrediction={globalPrediction}
      habitat={habitat}
      historicalEvidenceCanvas={historicalEvidenceCanvas}
      historicalEvidenceOpacity={historicalEvidenceOpacity}
      historicalEvidenceOpacityId={historicalEvidenceOpacityId}
      historicalEvidenceVisible={historicalEvidenceVisible}
      interactive={interactive}
      layerControlsExpanded={layerControlsExpanded}
      layerControlsId={layerControlsId}
      map={map}
      mode={mode}
      node={node}
      onBasemapChange={changeBasemap}
      onCellOpacityChange={setCellOpacity}
      onCellsVisibilityChange={() => setCellsVisible((visible) => !visible)}
      onHistoricalEvidenceOpacityChange={setHistoricalEvidenceOpacity}
      onHistoricalEvidenceVisibilityChange={() =>
        setHistoricalEvidenceVisible((visible) => !visible)
      }
      onLayerControlsToggle={toggleLayerControls}
      predictionAvailable={predictionAvailable}
      selectedBasemapId={selectedBasemapId}
      selectedRegion={selectedRegion}
      showCompatibility={showCompatibility}
      showDataStatus={!onViewportStatusChange}
      showReadyStatus={showReadyStatus}
      showTimeline={showTimeline && predictionAvailable && !showCompatibility}
      speciesId={speciesId}
      statusCopy={statusCopy}
      timelineOffset={timelineOffset}
      onTimelineOffsetChange={changeTimelineOffset}
    />
  );
}
