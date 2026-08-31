"use client";

import { ShieldCheck } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { RegionMapFrame } from "@/components/region-map/frame";
import { createRegionMap } from "@/components/region-map/map-instance";
import {
  basemapStyle,
  drawTerritorialWindow,
  fitSpatialBounds,
  prepareCanvas,
} from "@/components/region-map/support";
import type { SpatialBounds } from "@/src/lib/types";

export function PublicFindingLocationMap({ bounds }: { bounds: SpatialBounds }) {
  const node = useRef<HTMLDivElement | null>(null);
  const cellCanvas = useRef<HTMLCanvasElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const publicBounds = useRef(bounds);

  useEffect(() => {
    if (!node.current || map.current) return;
    const cellBounds = publicBounds.current;
    const center: [number, number] = [
      (cellBounds.west + cellBounds.east) / 2,
      (cellBounds.south + cellBounds.north) / 2,
    ];
    const { map: localMap } = createRegionMap({
      center,
      container: node.current,
      habitat: false,
      interactive: false,
      showFullscreen: false,
      showNavigation: false,
      style: basemapStyle("icgc-muted"),
      useGeolocation: false,
      zoom: 8.5,
    });
    map.current = localMap;

    const drawCell = () => {
      const canvas = cellCanvas.current;
      if (!canvas) return;
      const context = prepareCanvas(canvas);
      if (!context) return;
      const topLeft = localMap.project([cellBounds.west, cellBounds.north]);
      const bottomRight = localMap.project([cellBounds.east, cellBounds.south]);
      context.fillStyle = "rgba(216, 132, 69, .16)";
      context.fillRect(
        topLeft.x,
        topLeft.y,
        Math.max(bottomRight.x - topLeft.x, 1),
        Math.max(bottomRight.y - topLeft.y, 1),
      );
      drawTerritorialWindow(context, localMap, cellBounds);
    };
    const fitCell = () => {
      localMap.resize();
      fitSpatialBounds(localMap, cellBounds, false);
      drawCell();
    };
    const resizeObserver = new ResizeObserver(fitCell);

    localMap.once("load", fitCell);
    localMap.on("move", drawCell);
    resizeObserver.observe(node.current);

    return () => {
      resizeObserver.disconnect();
      localMap.off("load", fitCell);
      localMap.off("move", drawCell);
      localMap.remove();
      map.current = null;
    };
  }, []);

  return (
      <figure className="finding-public-location">
        <RegionMapFrame
          ariaLabel="Mapa estàtic de la zona pública aproximada de 10 per 10 quilòmetres"
          basemapId="icgc-muted"
          className="finding-public-location-map"
          map={map}
          mapMode="public-finding-location"
          node={node}
          showResetButton={false}
        >
          <canvas ref={cellCanvas} className="region-map-cells" aria-hidden />
        </RegionMapFrame>
        <figcaption>
          <ShieldCheck size={16} aria-hidden="true" />
          El quadrat mostra tota l’àrea pública; no assenyala el punt exacte de la troballa.
        </figcaption>
      </figure>
  );
}
