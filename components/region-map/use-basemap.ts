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
  options: {
    initialBasemapId?: BasemapId;
    rememberSelection?: boolean;
  } = {},
) {
  const initialBasemapId = options.initialBasemapId ?? defaultBasemapId;
  const rememberSelection = options.rememberSelection ?? true;
  const changeId = useRef(0);
  const [selectedBasemapId, setSelectedBasemapId] =
    useState<BasemapId>(initialBasemapId);
  const [basemapStatus, setBasemapStatus] =
    useState<"idle" | "loading" | "error">("idle");

  const initializeBasemap = useCallback(() => {
    const resolvedBasemapId = rememberSelection
      ? storedBasemapId(initialBasemapId)
      : initialBasemapId;
    setSelectedBasemapId(resolvedBasemapId);
    return resolvedBasemapId;
  }, [initialBasemapId, rememberSelection]);

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
      if (rememberSelection) {
        try {
          window.localStorage.setItem(basemapStorageKey, nextBasemapId);
        } catch {
          // The selected basemap still works when browser storage is unavailable.
        }
      }
    } catch {
      if (changeId.current !== nextChangeId) return;
      setSelectedBasemapId(previousBasemapId);
      setBasemapStatus("error");
    }
  }, [drawCells, map, rememberSelection, selectedBasemapId]);

  return {
    basemapStatus,
    changeBasemap,
    initializeBasemap,
    selectedBasemapId,
  };
}
