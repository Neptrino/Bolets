import { useCallback, useRef, useState, type RefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  basemapStorageKey,
  basemapStyle,
  defaultBasemapId,
  storedBasemapId,
  type BasemapId,
} from "./support";

export function useRegionBasemap(
  map: RefObject<MapLibreMap | null>,
  drawCells: RefObject<() => void>,
) {
  const changeId = useRef(0);
  const [selectedBasemapId, setSelectedBasemapId] =
    useState<BasemapId>(defaultBasemapId);
  const [basemapStatus, setBasemapStatus] =
    useState<"idle" | "loading" | "error">("idle");

  const initializeBasemap = useCallback(() => {
    const initialBasemapId = storedBasemapId();
    setSelectedBasemapId(initialBasemapId);
    return initialBasemapId;
  }, []);

  const changeBasemap = useCallback((nextBasemapId: BasemapId) => {
    const localMap = map.current;
    if (!localMap || nextBasemapId === selectedBasemapId) return;

    const previousBasemapId = selectedBasemapId;
    const nextChangeId = changeId.current + 1;
    changeId.current = nextChangeId;
    setSelectedBasemapId(nextBasemapId);
    setBasemapStatus("loading");

    try {
      localMap.once("style.load", () => {
        if (changeId.current !== nextChangeId) return;
        setBasemapStatus("idle");
        drawCells.current();
      });
      localMap.setStyle(basemapStyle(nextBasemapId));
      try {
        window.localStorage.setItem(basemapStorageKey, nextBasemapId);
      } catch {
        // The selected basemap still works when browser storage is unavailable.
      }
    } catch {
      if (changeId.current !== nextChangeId) return;
      setSelectedBasemapId(previousBasemapId);
      setBasemapStatus("error");
    }
  }, [drawCells, map, selectedBasemapId]);

  return {
    basemapStatus,
    changeBasemap,
    initializeBasemap,
    selectedBasemapId,
  };
}
