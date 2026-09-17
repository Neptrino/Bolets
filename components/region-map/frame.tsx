"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import type { RegionMapAdapter } from "./map-adapter";
import { fitCatalonia } from "./support";

/* The layer panel is not a map control, so it cannot join the library's own
   top-right stack. Measuring how far that stack reaches keeps the collapsed
   toggle in the same rhythm as the zoom and fullscreen buttons, whichever
   controls a given map happens to show. */
function useControlStack(
  shell: RefObject<HTMLDivElement | null>,
  surface: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const shellNode = shell.current;
    const surfaceNode = surface.current;
    if (!shellNode || !surfaceNode) return;
    let pending: number | undefined;
    const measure = () => {
      pending = undefined;
      const top = shellNode.getBoundingClientRect().top;
      let bottom = top;
      for (const control of surfaceNode.querySelectorAll(
        ".maplibregl-ctrl-top-right > *, .leaflet-top.leaflet-right > *",
      )) {
        const box = control.getBoundingClientRect();
        if (box.height > 0) bottom = Math.max(bottom, box.bottom);
      }
      shellNode.style.setProperty(
        "--map-control-stack",
        `${Math.max(0, Math.round(bottom - top))}px`,
      );
    };
    const schedule = () => {
      if (pending === undefined) pending = window.requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(surfaceNode);
    const mutations = new MutationObserver(schedule);
    mutations.observe(surfaceNode, {
      attributeFilter: ["class", "style", "hidden"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    schedule();
    return () => {
      if (pending !== undefined) window.cancelAnimationFrame(pending);
      resize.disconnect();
      mutations.disconnect();
    };
  }, [shell, surface]);
}

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
  map: RefObject<RegionMapAdapter | null>;
  mapMode?: string;
  node: RefObject<HTMLDivElement | null>;
  selectedRegion?: string;
  showResetButton?: boolean;
}) {
  const shell = useRef<HTMLDivElement | null>(null);
  useControlStack(shell, node);

  return (
    <div
      ref={shell}
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
