"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Popup,
  type Map as MapLibreMap,
  type MapMouseEvent,
} from "maplibre-gl";
import { RegionMapBasemapControl } from "@/components/region-map/basemap-control";
import { RegionMapControlPanel } from "@/components/region-map/control-panel";
import { RegionMapFrame } from "@/components/region-map/frame";
import { createRegionMap } from "@/components/region-map/map-instance";
import {
  MapLayerControl,
  basemapStyle,
  fitCatalonia,
  fitSpatialBounds,
  prepareCanvas,
} from "@/components/region-map/support";
import { useRegionBasemap } from "@/components/region-map/use-basemap";
import { useCollapsibleMapControls } from "@/components/region-map/use-collapsible-controls";
import { personalFindingBounds } from "@/src/lib/findings/map";
import type { OwnerFindingMapItem } from "@/src/lib/findings/types";

export function PersonalFindingsMap({ findings }: { findings: OwnerFindingMapItem[] }) {
  const node = useRef<HTMLDivElement>(null);
  const findingsCanvas = useRef<HTMLCanvasElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const findingsRef = useRef(findings);
  const initialBoundsRef = useRef(personalFindingBounds(findings));
  const drawFindingsRef = useRef<() => void>(() => undefined);
  const findingsVisibleRef = useRef(true);
  const basemapChoiceName = useId();
  const layerControlsId = useId();
  const findingsOpacityId = useId();
  const [findingsVisible, setFindingsVisible] = useState(true);
  const [findingsOpacity, setFindingsOpacity] = useState(80);
  const { expanded, toggle } = useCollapsibleMapControls();
  const {
    basemapStatus,
    changeBasemap,
    initializeBasemap,
    selectedBasemapId,
  } = useRegionBasemap(map, drawFindingsRef, {
    initialBasemapId: "icgc-muted",
    rememberSelection: false,
  });

  const drawFindings = useCallback(() => {
    const localMap = map.current;
    const canvas = findingsCanvas.current;
    if (!localMap || !canvas) return;
    const context = prepareCanvas(canvas);
    if (!context) return;

    for (const finding of findings) {
      if (finding.exactLocation) continue;
      const topLeft = localMap.project([finding.cellBounds.west, finding.cellBounds.north]);
      const bottomRight = localMap.project([finding.cellBounds.east, finding.cellBounds.south]);
      const width = Math.max(bottomRight.x - topLeft.x, 1);
      const height = Math.max(bottomRight.y - topLeft.y, 1);
      context.fillStyle = "rgba(66, 92, 73, 0.24)";
      context.fillRect(topLeft.x, topLeft.y, width, height);
      context.strokeStyle = "rgba(66, 92, 73, 0.96)";
      context.lineWidth = 2;
      context.strokeRect(topLeft.x, topLeft.y, width, height);
    }

    for (const finding of findings) {
      if (!finding.exactLocation) continue;
      const point = localMap.project([
        finding.exactLocation.longitude,
        finding.exactLocation.latitude,
      ]);
      context.beginPath();
      context.arc(point.x, point.y, 7, 0, Math.PI * 2);
      context.fillStyle = "#bd592a";
      context.fill();
      context.strokeStyle = "#fffaf0";
      context.lineWidth = 2;
      context.stroke();
    }
  }, [findings]);

  useEffect(() => {
    findingsRef.current = findings;
    drawFindingsRef.current = drawFindings;
    drawFindings();
  }, [drawFindings, findings]);

  useEffect(() => {
    findingsVisibleRef.current = findingsVisible;
  }, [findingsVisible]);

  useEffect(() => {
    if (!node.current || map.current) return;
    const initialBasemapId = initializeBasemap();
    const { map: localMap } = createRegionMap({
      center: [1.7, 41.7],
      container: node.current,
      fullscreenContainer: node.current.parentElement ?? undefined,
      habitat: false,
      style: basemapStyle(initialBasemapId),
      useGeolocation: true,
      zoom: 6.2,
    });
    map.current = localMap;

    const activate = () => {
      localMap.resize();
      const initialBounds = initialBoundsRef.current;
      if (initialBounds) fitSpatialBounds(localMap, initialBounds, false);
      else fitCatalonia(localMap, false);
      drawFindingsRef.current();
    };
    const findingAt = (event: MapMouseEvent) => {
      const exact = findingsRef.current.find((finding) => {
        if (!finding.exactLocation) return false;
        const point = localMap.project([
          finding.exactLocation.longitude,
          finding.exactLocation.latitude,
        ]);
        return Math.hypot(point.x - event.point.x, point.y - event.point.y) <= 12;
      });
      if (exact) return exact;
      return findingsRef.current.find((finding) => !finding.exactLocation &&
        event.lngLat.lng >= finding.cellBounds.west &&
        event.lngLat.lng < finding.cellBounds.east &&
        event.lngLat.lat >= finding.cellBounds.south &&
        event.lngLat.lat < finding.cellBounds.north);
    };
    const handleClick = (event: MapMouseEvent) => {
      if (!findingsVisibleRef.current) return;
      const finding = findingAt(event);
      if (!finding) return;
      new Popup({ offset: 12 })
        .setLngLat(event.lngLat)
        .setText(`${finding.reportedSpeciesName} · ${finding.exactLocation ? "punt exacte privat" : "zona aproximada de 10 km"}`)
        .addTo(localMap);
    };
    const handlePointer = (event: MapMouseEvent) => {
      localMap.getCanvas().style.cursor = findingsVisibleRef.current && findingAt(event)
        ? "pointer" : "";
    };
    const handleMove = () => drawFindingsRef.current();
    const resizeObserver = new ResizeObserver(() => {
      localMap.resize();
      drawFindingsRef.current();
    });

    localMap.once("load", activate);
    localMap.on("move", handleMove);
    localMap.on("click", handleClick);
    localMap.on("mousemove", handlePointer);
    resizeObserver.observe(node.current);

    return () => {
      resizeObserver.disconnect();
      localMap.off("load", activate);
      localMap.off("move", handleMove);
      localMap.off("click", handleClick);
      localMap.off("mousemove", handlePointer);
      localMap.remove();
      map.current = null;
    };
  }, [initializeBasemap]);

  return (
    <RegionMapFrame
      ariaLabel="Mapa privat de les meves troballes. Els punts exactes només són visibles en aquest compte."
      basemapId={selectedBasemapId}
      className="findings-region-map personal-findings-region-map"
      map={map}
      mapMode="personal-findings"
      node={node}
    >
      <canvas
        ref={findingsCanvas}
        className="region-map-cells personal-findings-canvas"
        style={{ opacity: findingsVisible ? findingsOpacity / 100 : 0 }}
        aria-hidden
      />
      <RegionMapControlPanel expanded={expanded} id={layerControlsId} onExpandedChange={toggle}>
        <RegionMapBasemapControl
          choiceName={basemapChoiceName}
          onChange={changeBasemap}
          selectedId={selectedBasemapId}
          status={basemapStatus}
        />
        <MapLayerControl
          id={findingsOpacityId}
          label="Les meves troballes"
          controlName="les meves troballes"
          opacityLabel="Opacitat de les meves troballes"
          variant="personal-findings"
          visible={findingsVisible}
          opacity={findingsOpacity}
          onVisibilityChange={() => setFindingsVisible((visible) => !visible)}
          onOpacityChange={setFindingsOpacity}
        />
      </RegionMapControlPanel>
    </RegionMapFrame>
  );
}
