import "server-only";

import { unstable_cache } from "next/cache";
import { readCurrentOverviewGeneration } from "@/src/lib/current-overview-generation-server";
import {
  getGlobalPredictionCells,
  globalSpeciesSetKey,
} from "@/src/lib/global-predictions";
import type { GlobalGridSizeM } from "@/src/lib/global-map";
import { PREDICTION_CACHE_VERSION } from "@/src/lib/model-versions";
import { getPredictionCells } from "@/src/lib/predictions";
import type { SpatialBounds, SpatialGridSizeM } from "@/src/lib/types";

const GENERATION_REVALIDATE_SECONDS = 30;
const GENERATION_BOUND_RESPONSE_REVALIDATE_SECONDS = 24 * 60 * 60;
const RAW_RESPONSE_REVALIDATE_SECONDS = 300;

const readCachedPredictionGeneration = unstable_cache(
  () => readCurrentOverviewGeneration(),
  ["prediction-api-generation-v1"],
  { revalidate: GENERATION_REVALIDATE_SECONDS },
);

const loadCachedGlobalMapPredictionCells = unstable_cache(
  (
    bounds: SpatialBounds,
    limit: number,
    gridSizeM: GlobalGridSizeM,
    predictionVersion: string,
    speciesSetKey: string,
    generation: string,
  ) => {
    void predictionVersion;
    void speciesSetKey;
    void generation;
    return getGlobalPredictionCells(bounds, limit, gridSizeM);
  },
  ["prediction-api-global-map-v1"],
  {
    revalidate: GENERATION_BOUND_RESPONSE_REVALIDATE_SECONDS,
    tags: ["prediction-api-map"],
  },
);

const loadCachedSpeciesMapPredictionCells = unstable_cache(
  (
    speciesId: string,
    bounds: SpatialBounds,
    limit: number,
    gridSizeM: SpatialGridSizeM,
    predictionVersion: string,
  ) => {
    void predictionVersion;
    return getPredictionCells(speciesId, bounds, limit, gridSizeM, true);
  },
  ["prediction-api-species-map-v1"],
  {
    revalidate: RAW_RESPONSE_REVALIDATE_SECONDS,
    tags: ["prediction-api-map"],
  },
);

/**
 * Cache the fully scored map payload, not only its upstream environment read.
 * The semantic arguments form the bucket key; model and candidate-set versions
 * make a deployment select fresh entries immediately. Combined coarse cells
 * are also keyed by the published condition generation, so their scored cache
 * can live for a day while a new publication selects a fresh entry within the
 * short generation-check interval.
 */
export async function getCachedGlobalMapPredictionCells(
  bounds: SpatialBounds,
  limit: number,
  gridSizeM: GlobalGridSizeM,
) {
  return loadCachedGlobalMapPredictionCells(
    bounds,
    limit,
    gridSizeM,
    PREDICTION_CACHE_VERSION,
    globalSpeciesSetKey,
    await readCachedPredictionGeneration(),
  );
}

export function getCachedSpeciesMapPredictionCells(
  speciesId: string,
  bounds: SpatialBounds,
  limit: number,
  gridSizeM: SpatialGridSizeM,
) {
  return loadCachedSpeciesMapPredictionCells(
    speciesId,
    bounds,
    limit,
    gridSizeM,
    PREDICTION_CACHE_VERSION,
  );
}
