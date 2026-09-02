import { useEffect, type RefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useContributorMapAccess } from "@/components/use-contributor-map-access";
import { visibleGridSize } from "@/components/region-map/support";
import { GLOBAL_MINIMUM_GRID_SIZE_M } from "@/src/lib/global-map";
import type { SpatialGridSizeM } from "@/src/lib/types";

/** Call after the map's creation effect so its ref is ready when subscribing. */
export function useMapResolutionAccess(
  map: RefObject<MapLibreMap | null>,
  globalPrediction: boolean,
  onDetailResolutionChange?: (gridSizeM: SpatialGridSizeM) => void,
) {
  const contributorAccess = useContributorMapAccess();
  const detailedMinimumGridSizeM: SpatialGridSizeM = contributorAccess.checked
    ? contributorAccess.minimumResolutionM
    : 2500;
  const predictionMinimumGridSizeM: SpatialGridSizeM = globalPrediction
    ? Math.max(GLOBAL_MINIMUM_GRID_SIZE_M, detailedMinimumGridSizeM) as SpatialGridSizeM
    : detailedMinimumGridSizeM;

  useEffect(() => {
    const localMap = map.current;
    if (!localMap || !onDetailResolutionChange) return;
    // Use the same viewport budget as cell requests, before the public-access floor.
    const update = () => onDetailResolutionChange(visibleGridSize(
      localMap, globalPrediction ? GLOBAL_MINIMUM_GRID_SIZE_M : 250,
    ));
    update();
    localMap.on("zoom", update);
    localMap.on("moveend", update);
    localMap.on("resize", update);
    return () => {
      localMap.off("zoom", update);
      localMap.off("moveend", update);
      localMap.off("resize", update);
    };
  }, [map, globalPrediction, onDetailResolutionChange]);

  return { detailedMinimumGridSizeM, predictionMinimumGridSizeM };
}
