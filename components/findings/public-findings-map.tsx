"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { RegionMapBasemapControl } from "@/components/region-map/basemap-control";
import { RegionMapControlPanel } from "@/components/region-map/control-panel";
import { RegionMapFrame } from "@/components/region-map/frame";
import { createRegionMap } from "@/components/region-map/map-instance";
import {
  MapLayerControl,
  basemapStyle,
  cataloniaSpatialBounds,
  fitCatalonia,
  prepareCanvas,
  visibleSpatialBounds,
} from "@/components/region-map/support";
import { useRegionBasemap } from "@/components/region-map/use-basemap";
import { useCollapsibleMapControls } from "@/components/region-map/use-collapsible-controls";
import {
  findingCellAt,
  findingCellColour,
  findingCellFillOpacity,
  findingCellsInBounds,
} from "@/src/lib/findings/map";
import type { PublicFindingCell } from "@/src/lib/findings/types";
import { bucketsForBounds } from "@/src/lib/map-query";
import { findingBucketUrl } from "@/src/lib/map-request-url";
import type { CatalogueSpecies, SpatialBounds } from "@/src/lib/types";

export function PublicFindingsMap({ species }: { species: CatalogueSpecies[] }) {
  const node = useRef<HTMLDivElement>(null);
  const cellCanvas = useRef<HTMLCanvasElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const mapLoaded = useRef(false);
  const requestRun = useRef(0);
  const visibleCells = useRef<PublicFindingCell[]>([]);
  const cellsLayerVisible = useRef(true);
  const selectedCellId = useRef<string | null>(null);
  const drawCellsRef = useRef<() => void>(() => undefined);
  const loadCellsRef = useRef<() => Promise<void>>(async () => undefined);
  const basemapChoiceName = useId();
  const layerControlsId = useId();
  const cellOpacityId = useId();
  const [speciesId, setSpeciesId] = useState("all");
  const [status, setStatus] = useState("Carregant troballes…");
  const [loading, setLoading] = useState(true);
  const [cellsVisible, setCellsVisible] = useState(true);
  const [cellOpacity, setCellOpacity] = useState(70);
  const [selected, setSelected] = useState<{ cellId: string; count: number } | null>(null);
  const { expanded, toggle } = useCollapsibleMapControls();
  const {
    basemapStatus,
    changeBasemap,
    initializeBasemap,
    selectedBasemapId,
  } = useRegionBasemap(map, drawCellsRef, {
    initialBasemapId: "icgc-muted",
    rememberSelection: false,
  });

  const drawCells = useCallback(() => {
    const localMap = map.current;
    const canvas = cellCanvas.current;
    if (!localMap || !canvas) return;
    const context = prepareCanvas(canvas);
    if (!context) return;

    for (const cell of visibleCells.current) {
      const topLeft = localMap.project([cell.bounds.west, cell.bounds.north]);
      const bottomRight = localMap.project([cell.bounds.east, cell.bounds.south]);
      const width = Math.max(bottomRight.x - topLeft.x, 1);
      const height = Math.max(bottomRight.y - topLeft.y, 1);
      const gap = Math.min(1.2, width * 0.06, height * 0.06);
      const selected = cell.cellId === selectedCellId.current;

      context.fillStyle = findingCellColour(cell.findingCount);
      context.globalAlpha = findingCellFillOpacity(width, height);
      context.fillRect(
        topLeft.x + gap,
        topLeft.y + gap,
        Math.max(width - gap * 2, 1),
        Math.max(height - gap * 2, 1),
      );
      context.globalAlpha = 1;
      context.strokeStyle = selected ? "#282824" : "rgba(255, 250, 240, 0.96)";
      context.lineWidth = selected ? 3 : 1.5;
      context.strokeRect(
        topLeft.x + gap,
        topLeft.y + gap,
        Math.max(width - gap * 2, 1),
        Math.max(height - gap * 2, 1),
      );
    }
  }, []);

  const loadCells = useCallback(async () => {
    const localMap = map.current;
    if (!localMap) return;
    const run = ++requestRun.current;
    const viewport: SpatialBounds = visibleSpatialBounds(localMap);
    const buckets = bucketsForBounds(viewport, 10_000, cataloniaSpatialBounds);
    setLoading(true);
    setStatus("Actualitzant…");
    try {
      const responses = await Promise.all(buckets.map(async (bucket) => {
        const response = await fetch(findingBucketUrl(bucket, speciesId));
        if (!response.ok) throw new Error();
        return (await response.json()).cells as PublicFindingCell[];
      }));
      if (run !== requestRun.current) return;
      const uniqueCells = [...new Map(
        responses.flat().map((cell) => [cell.cellId, cell]),
      ).values()];
      const cells = findingCellsInBounds(uniqueCells, viewport);
      visibleCells.current = cells;
      if (selectedCellId.current && !cells.some((cell) => cell.cellId === selectedCellId.current)) {
        selectedCellId.current = null;
        setSelected(null);
      }
      drawCells();
      const total = cells.reduce((sum, cell) => sum + cell.findingCount, 0);
      setStatus(total
        ? `${total} ${total === 1 ? "troballa" : "troballes"} en aquesta vista`
        : "Cap troballa en aquesta vista");
    } catch {
      if (run !== requestRun.current) return;
      visibleCells.current = [];
      selectedCellId.current = null;
      setSelected(null);
      drawCells();
      setStatus("No s’han pogut actualitzar les troballes");
    } finally {
      if (run === requestRun.current) setLoading(false);
    }
  }, [drawCells, speciesId]);

  useEffect(() => {
    drawCellsRef.current = drawCells;
    drawCells();
  }, [drawCells]);

  useEffect(() => {
    loadCellsRef.current = loadCells;
    if (mapLoaded.current) void loadCells();
  }, [loadCells]);

  useEffect(() => {
    if (!node.current || map.current) return;
    const initialBasemapId = initializeBasemap();
    const { map: localMap } = createRegionMap({
      center: [1.7, 41.7],
      container: node.current,
      fullscreenContainer: node.current.parentElement ?? undefined,
      habitat: false,
      style: basemapStyle(initialBasemapId),
      useGeolocation: false,
      zoom: 6.2,
    });
    map.current = localMap;

    const activate = () => {
      mapLoaded.current = true;
      localMap.resize();
      fitCatalonia(localMap, false);
      drawCellsRef.current();
      void loadCellsRef.current();
    };
    const handleMove = () => drawCellsRef.current();
    const handleMoveEnd = () => void loadCellsRef.current();
    const handleClick = (event: MapMouseEvent) => {
      const cell = cellsLayerVisible.current
        ? findingCellAt(visibleCells.current, event.lngLat.lng, event.lngLat.lat)
        : undefined;
      selectedCellId.current = cell?.cellId ?? null;
      setSelected(cell ? { cellId: cell.cellId, count: cell.findingCount } : null);
      drawCellsRef.current();
    };
    const handlePointer = (event: MapMouseEvent) => {
      const cell = cellsLayerVisible.current
        ? findingCellAt(visibleCells.current, event.lngLat.lng, event.lngLat.lat)
        : undefined;
      localMap.getCanvas().style.cursor = cell ? "pointer" : "";
    };
    const resizeObserver = new ResizeObserver(() => {
      localMap.resize();
      drawCellsRef.current();
    });

    localMap.once("load", activate);
    localMap.on("move", handleMove);
    localMap.on("moveend", handleMoveEnd);
    localMap.on("click", handleClick);
    localMap.on("mousemove", handlePointer);
    resizeObserver.observe(node.current);

    return () => {
      requestRun.current += 1;
      resizeObserver.disconnect();
      localMap.off("load", activate);
      localMap.off("move", handleMove);
      localMap.off("moveend", handleMoveEnd);
      localMap.off("click", handleClick);
      localMap.off("mousemove", handlePointer);
      localMap.remove();
      map.current = null;
      mapLoaded.current = false;
    };
  }, [initializeBasemap]);

  return (
    <RegionMapFrame
      ariaBusy={loading}
      ariaLabel="Mapa de troballes públiques generalitzades en caselles de 10 quilòmetres"
      basemapId={selectedBasemapId}
      className="findings-region-map"
      map={map}
      mapMode="findings"
      node={node}
    >
      <canvas
        ref={cellCanvas}
        className="region-map-cells findings-map-cells"
        style={{ opacity: cellsVisible ? cellOpacity / 100 : 0 }}
        aria-hidden
      />
      <div className="findings-map-toolbar">
        <select
          aria-label="Filtra el mapa per espècie"
          value={speciesId}
          onChange={(event) => {
            selectedCellId.current = null;
            setSelected(null);
            setSpeciesId(event.target.value);
          }}
        >
          <option value="all">Totes les espècies</option>
          {species.map((item) => (
            <option value={item.speciesId} key={item.speciesId}>
              {item.identity.commonName}
            </option>
          ))}
        </select>
      </div>
      <RegionMapControlPanel expanded={expanded} id={layerControlsId} onExpandedChange={toggle}>
        <RegionMapBasemapControl
          choiceName={basemapChoiceName}
          onChange={changeBasemap}
          selectedId={selectedBasemapId}
          status={basemapStatus}
        />
        <MapLayerControl
          id={cellOpacityId}
          label="Troballes"
          controlName="les troballes"
          opacityLabel="Opacitat de les caselles amb troballes"
          variant="findings"
          visible={cellsVisible}
          opacity={cellOpacity}
          onVisibilityChange={() => {
            const nextVisible = !cellsVisible;
            cellsLayerVisible.current = nextVisible;
            setCellsVisible(nextVisible);
            if (!nextVisible) {
              selectedCellId.current = null;
              setSelected(null);
              drawCellsRef.current();
            }
          }}
          onOpacityChange={setCellOpacity}
        />
      </RegionMapControlPanel>
      <p className="findings-map-status" aria-live="polite">
        {selected ? (
          <>
            {selected.count} {selected.count === 1 ? "troballa" : "troballes"} ·{" "}
            <Link href={`/troballes?casella=${encodeURIComponent(selected.cellId)}`}>veure-les</Link>
          </>
        ) : status}
      </p>
    </RegionMapFrame>
  );
}
