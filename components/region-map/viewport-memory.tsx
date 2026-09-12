"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RegionMapAdapter } from "./map-adapter";
import type { RegionId, SpatialBounds } from "@/src/lib/types";

type Viewport = { center: [number, number]; zoom: number };
type ViewportIntent = { autoGeolocate: boolean; focusBounds?: SpatialBounds; selectedRegion?: RegionId };

export function viewportIntentKey({ autoGeolocate, focusBounds, selectedRegion }: ViewportIntent) {
  // Default ecological regions vary by species; only an explicitly requested
  // territory should override the position the viewer has chosen.
  return JSON.stringify(focusBounds
    ? [focusBounds.west, focusBounds.south, focusBounds.east, focusBounds.north]
    : autoGeolocate ? null : selectedRegion ?? null);
}

export function createViewportMemory() {
  let saved: { intent: string; viewport: Viewport } | undefined;
  return {
    restore: (intent: string) => intent === "null" || saved?.intent === intent ? saved?.viewport : undefined,
    remember: (intent: string, viewport: Viewport) => { saved = { intent, viewport }; },
  };
}

const ViewportMemoryContext = createContext<ReturnType<typeof createViewportMemory> | null>(null);

/** Lives only within the interactive map routes; never persists coordinates. */
export function MapViewportProvider({ children }: { children: ReactNode }) {
  const [memory] = useState(createViewportMemory);
  return <ViewportMemoryContext value={memory}>{children}</ViewportMemoryContext>;
}

export function useMapViewport(intent: ViewportIntent) {
  const memory = useContext(ViewportMemoryContext);
  const intentKey = viewportIntentKey(intent);
  const currentIntent = useRef(intentKey);
  useEffect(() => { currentIntent.current = intentKey; }, [intentKey]);

  return useMemo(() => memory ? {
    restore: () => memory.restore(currentIntent.current),
    track: (map: RegionMapAdapter) => {
      const remember = () => {
        const { lng, lat } = map.getCenter();
        memory.remember(currentIntent.current, { center: [lng, lat], zoom: map.getZoom() });
      };
      // Wait for a real map view, so React's initial effect replay cannot
      // mistake its discarded startup camera for a previous map visit.
      map.once("load", remember);
      map.on("moveend", remember);
      return () => { map.off("load", remember); map.off("moveend", remember); };
    },
  } : null, [memory]);
}
