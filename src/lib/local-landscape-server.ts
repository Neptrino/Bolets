import "server-only";

import { unstable_cache } from "next/cache";
import { HABITAT_MODEL_VERSION } from "@/src/lib/model-versions";
import { summariseLocalLandscape } from "@/src/lib/local-landscape";
import { getPredictionCells } from "@/src/lib/predictions";
import type { PredictionCell, SpatialBounds } from "@/src/lib/types";

const LOCAL_LANDSCAPE_REVALIDATE_SECONDS = 24 * 60 * 60;

/** Static terrain portrait for a place window; the weather in the cells is ignored. */
const loadCachedLocalLandscape = unstable_cache(
  async (modelVersion: string, speciesId: string, placeKey: string, bounds: SpatialBounds) => {
    void modelVersion;
    void placeKey;
    const { cells, truncated } = await getPredictionCells(speciesId, bounds, 1000, 1000, false, false);
    if (truncated) throw new Error("Local landscape window was truncated; retry without caching");
    const landscape = summariseLocalLandscape(cells as PredictionCell[]);
    if (!landscape) throw new Error("Local landscape has too few cells; retry without caching");
    return landscape;
  },
  ["local-landscape-v1"],
  { revalidate: LOCAL_LANDSCAPE_REVALIDATE_SECONDS, tags: ["local-landscape"] },
);

export function loadLocalLandscape(speciesId: string, placeKey: string, bounds: SpatialBounds) {
  return loadCachedLocalLandscape(HABITAT_MODEL_VERSION, speciesId, placeKey, bounds);
}
