import "server-only";

import { readTimelineGeneration, TIMELINE_CACHE_SECONDS, PUBLICATION_CHECK_SECONDS } from "@/src/lib/prediction-timeline-generation";

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

const GENERATION_BOUND_RESPONSE_REVALIDATE_SECONDS = 24 * 60 * 60;
const RAW_RESPONSE_REVALIDATE_SECONDS = 300;

const readGeneration = unstable_cache(
  async () => ({ generation: await readCurrentOverviewGeneration(), storedAt: Date.now() }),
  ["prediction-api-generation-v2"],
  { revalidate: PUBLICATION_CHECK_SECONDS },
);

export async function readCachedPredictionGeneration() {
  const cached = await readGeneration();
  return Date.now() - cached.storedAt >= PUBLICATION_CHECK_SECONDS * 1000
    ? readCurrentOverviewGeneration()
    : cached.generation;
}

// Cache misses from different requests can arrive before Next.js stores the
// first result. Share that computation, and release failures so retries work.
function coalesceBucket<T>(pending: Map<string, Promise<T>>, key: string, load: () => Promise<T>) {
  let task = pending.get(key);
  if (!task) {
    task = load().finally(() => { pending.delete(key); });
    pending.set(key, task);
  }
  return task;
}
const globalPending = new Map<string, ReturnType<typeof getGlobalPredictionCells>>();
const speciesPending = new Map<string, ReturnType<typeof getPredictionCells>>();

const loadCachedGlobalMapPredictionCells = unstable_cache(
  (
    bounds: SpatialBounds,
    limit: number,
    gridSizeM: GlobalGridSizeM,
    predictionVersion: string,
    speciesSetKey: string,
    generation: string,
  ) => {
    return coalesceBucket(globalPending,
      JSON.stringify([bounds, limit, gridSizeM, predictionVersion, speciesSetKey, generation]),
      () => getGlobalPredictionCells(bounds, limit, gridSizeM));
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
    return coalesceBucket(speciesPending,
      JSON.stringify([speciesId, bounds, limit, gridSizeM, predictionVersion]),
      () => getPredictionCells(speciesId, bounds, limit, gridSizeM, true));
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
  generation = "",
) {
  const key = JSON.stringify([speciesId, bounds, limit, gridSizeM, offset, generation]);
  let task = timelinePending.get(key);
  if (!task) {
    task = getPredictionMapTimelineFrame(speciesId, bounds, limit, gridSizeM, offset, generation)
      .then((result) => ({ computedAt: Date.now(), result }))
      .finally(() => { timelinePending.delete(key); });
    timelinePending.set(key, task);
  }
  return task;
}

const cachedTimelineComputation = (
  speciesId: string, bounds: SpatialBounds, limit: number, gridSizeM: SpatialGridSizeM,
  offset: Exclude<PredictionTimelineOffset, 0>, model: string, speciesSet: string, generation: string,
) => {
  void model; void speciesSet;
  return computeTimelineFrame(speciesId, bounds, limit, gridSizeM, offset, generation);
};
const loadTimelineFrame = unstable_cache(cachedTimelineComputation,
  ["prediction-api-timeline-v2"], { revalidate: TIMELINE_CACHE_SECONDS, tags: ["prediction-api-map"] });
const loadFallbackTimelineFrame = unstable_cache(cachedTimelineComputation,
  ["prediction-api-timeline-fallback-v1"], { revalidate: 60, tags: ["prediction-api-map"] });

export async function getCachedPredictionMapTimelineFrame(
  speciesId: string, bounds: SpatialBounds, limit: number, gridSizeM: SpatialGridSizeM,
  offset: Exclude<PredictionTimelineOffset, 0>,
) {
  const generation = await readTimelineGeneration();
  // Failed publication checks retain the original bounded fallback, never a long-lived frame.
  const key = generation ?? "unverified-publication";
  const load = generation ? loadTimelineFrame : loadFallbackTimelineFrame;
  const cached = await load(speciesId, bounds, limit, gridSizeM, offset,
    PREDICTION_CACHE_VERSION, globalSpeciesSetKey, key);
  return (Date.now() - cached.computedAt >= (generation ? TIMELINE_CACHE_SECONDS * 1000 : 60_000)
    ? await computeTimelineFrame(speciesId, bounds, limit, gridSizeM, offset, key)
    : cached).result;
}
