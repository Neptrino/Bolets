"use client";

import type { ReactNode, RefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { fitCatalonia } from "./support";

export function RegionMapFrame({
  activeRegionCount,
  ariaBusy,
  ariaLabel,
  basemapId,
  children,
  className = "",
  map,
  mapMode,
  node,
  selectedRegion,
  showResetButton = true,
}: {
  activeRegionCount?: number;
  ariaBusy?: boolean;
  ariaLabel: string;
  basemapId?: string;
  children?: ReactNode;
  className?: string;
  map: RefObject<MapLibreMap | null>;
  mapMode?: string;
  node: RefObject<HTMLDivElement | null>;
  selectedRegion?: string;
  showResetButton?: boolean;
}) {
  return (
    <div
      className={`region-map ${className}`.trim()}
      data-active-region-count={activeRegionCount}
      data-selected-region={selectedRegion}
      data-basemap={basemapId}
      data-map-mode={mapMode}
      aria-busy={ariaBusy}
      aria-label={ariaLabel}
      role="region"
    >
      <div className="region-map-viewport">
        <div ref={node} className="region-map-surface" />
        {children}
        {showResetButton ? (
          <button
            type="button"
            className="map-reset-button"
            onClick={() => {
              if (map.current) fitCatalonia(map.current);
            }}
            aria-label="Veure tot Catalunya"
          >
            Tot Catalunya
          </button>
        ) : null}
      </div>
    </div>
  );
}
