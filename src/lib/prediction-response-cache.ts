import "server-only";

import { getPredictionMapTimelineFrame } from "@/src/lib/prediction-map-timeline";
import { unstable_cache } from "next/cache";
import { readCurrentOverviewGeneration } from "@/src/lib/current-overview-generation-server";
import {
  getGlobalPredictionCells,
  globalSpeciesSetKey,
} from "@/src/lib/global-predictions";
import type { GlobalGridSizeM } from "@/src/lib/global-map";
import { PREDICTION_CACHE_VERSION } from "@/src/lib/model-versions";
import { getPredictionCells } from "@/src/lib/predictions";
import type { PredictionTimelineOffset, SpatialBounds, SpatialGridSizeM } from "@/src/lib/types";

const GENERATION_REVALIDATE_SECONDS = 30;
const GENERATION_BOUND_RESPONSE_REVALIDATE_SECONDS = 24 * 60 * 60;
const RAW_RESPONSE_REVALIDATE_SECONDS = 300;

const readGeneration = unstable_cache(
  async () => ({ generation: await readCurrentOverviewGeneration(), storedAt: Date.now() }),
  ["prediction-api-generation-v2"],
  { revalidate: GENERATION_REVALIDATE_SECONDS },
);

export async function readCachedPredictionGeneration() {
  const cached = await readGeneration();
  return Date.now() - cached.storedAt >= GENERATION_REVALIDATE_SECONDS * 1000
    ? readCurrentOverviewGeneration()
    : cached.generation;
}

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

type TimelineResult = Awaited<ReturnType<typeof getPredictionMapTimelineFrame>>;
const timelinePending = new Map<string, Promise<{ computedAt: number; result: TimelineResult }>>();

function computeTimelineFrame(
  speciesId: string, bounds: SpatialBounds, limit: number, gridSizeM: SpatialGridSizeM,
  offset: Exclude<PredictionTimelineOffset, 0>,
) {
  const key = JSON.stringify([speciesId, bounds, limit, gridSizeM, offset]);
  let task = timelinePending.get(key);
  if (!task) {
    task = getPredictionMapTimelineFrame(speciesId, bounds, limit, gridSizeM, offset)
      .then((result) => ({ computedAt: Date.now(), result }))
      .finally(() => { timelinePending.delete(key); });
    timelinePending.set(key, task);
  }
  return task;
}

const loadTimelineFrame = unstable_cache((
  speciesId: string, bounds: SpatialBounds, limit: number, gridSizeM: SpatialGridSizeM,
  offset: Exclude<PredictionTimelineOffset, 0>, model: string, speciesSet: string,
) => {
  void model; void speciesSet;
  return computeTimelineFrame(speciesId, bounds, limit, gridSizeM, offset);
}, ["prediction-api-timeline-v1"], { revalidate: 60, tags: ["prediction-api-map"] });

export async function getCachedPredictionMapTimelineFrame(
  speciesId: string, bounds: SpatialBounds, limit: number, gridSizeM: SpatialGridSizeM,
  offset: Exclude<PredictionTimelineOffset, 0>,
) {
  const cached = await loadTimelineFrame(speciesId, bounds, limit, gridSizeM, offset,
    PREDICTION_CACHE_VERSION, globalSpeciesSetKey);
  return (Date.now() - cached.computedAt >= 60_000
    ? await computeTimelineFrame(speciesId, bounds, limit, gridSizeM, offset)
    : cached).result;
}
