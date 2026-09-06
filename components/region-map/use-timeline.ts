import { useCallback, useEffect, useState, type RefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { BucketNetworkGate } from "@/src/lib/bucket-loader";
import { bucketsForBounds, prioritizeBucketsAround } from "@/src/lib/map-query";
import { prefetchTimelineFrames } from "@/src/lib/prediction-timeline-prefetch";
import type { PredictionMapCell, PredictionTimelineOffset, SpatialGridSizeM } from "@/src/lib/types";
import type { RegionMapProps } from "./types";
import { cataloniaSpatialBounds, rememberBucket, visibleGridSize, visibleSpatialBounds, type CellState } from "./support";

export function usePredictionTimeline({
  enabled, map, speciesId, cellState, store, inFlight, networkGate,
  minimumGridSizeM, maximumGridSizeM, onCellSelect, onCellDetailStateChange,
  onTimelineOffsetChange, selectedCellIdRef,
}: {
  enabled: boolean;
  map: RefObject<MapLibreMap | null>;
  speciesId?: string;
  cellState: CellState;
  store: RefObject<Map<string, PredictionMapCell[]>>;
  inFlight: RefObject<Map<string, Promise<void>>>;
  networkGate: RefObject<BucketNetworkGate>;
  minimumGridSizeM: SpatialGridSizeM;
  maximumGridSizeM?: SpatialGridSizeM;
  selectedCellIdRef: RefObject<string | null>;
} & Pick<RegionMapProps, "onCellSelect" | "onCellDetailStateChange" | "onTimelineOffsetChange">) {
  const [offset, setOffset] = useState<PredictionTimelineOffset>(0);
  const changeOffset = useCallback((next: typeof offset) => {
    setOffset(next);
    selectedCellIdRef.current = null;
    onCellSelect?.(undefined);
    onCellDetailStateChange?.({ status: "idle" });
    onTimelineOffsetChange?.(next);
  }, [onCellSelect, onCellDetailStateChange, onTimelineOffsetChange, selectedCellIdRef]);
  const ready = cellState.status !== "loading" && cellState.status !== "error" && !cellState.incomplete && !cellState.truncated;

  useEffect(() => {
    const localMap = map.current;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!enabled || !ready || !localMap || !speciesId || connection?.saveData || document.hidden) return;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    localMap.on("movestart", cancel);
    document.addEventListener("visibilitychange", cancel);
    const timer = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      const viewport = visibleSpatialBounds(localMap);
      void prefetchTimelineFrames({
        speciesId, offset, signal: controller.signal, store: store.current,
        inFlight: inFlight.current, networkGate: networkGate.current,
        remember: (url, cells) => rememberBucket(store.current, url, cells, 512),
        buckets: (target) => {
          const resolution = visibleGridSize(localMap, target === 0 ? minimumGridSizeM : 5000, maximumGridSizeM);
          return { resolution, bounds: prioritizeBucketsAround(
            bucketsForBounds(viewport, resolution, cataloniaSpatialBounds),
            [(viewport.west + viewport.east) / 2, (viewport.south + viewport.north) / 2],
          ) };
        },
      });
    }, 150);
    return () => {
      window.clearTimeout(timer);
      cancel();
      localMap.off("movestart", cancel);
      document.removeEventListener("visibilitychange", cancel);
    };
  }, [enabled, ready, offset, speciesId, cellState.gridSizeM, map, store, inFlight, networkGate, minimumGridSizeM, maximumGridSizeM]);
  return { timelineOffset: offset, changeTimelineOffset: changeOffset };
}
