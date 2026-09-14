import "server-only";

import { unstable_cache } from "next/cache";
import { readCurrentOverviewGeneration } from "@/src/lib/current-overview-generation-server";
import { DAILY_OVERVIEW_REVALIDATE_SECONDS } from "@/src/lib/current-overview";
import { getAreaPredictionSummary } from "@/src/lib/predictions";
import type { RegionId, SpatialBounds } from "@/src/lib/types";

// Rotate explicitly so cached freshness decisions cannot survive a civil-day
// change or the twelve-hour ceiling. Warming uses the same period as pages.
export function localGuideConditionPeriod(now = Date.now()) {
  const day = new Date(now).toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  return `${day}:${Math.floor(now / (DAILY_OVERVIEW_REVALIDATE_SECONDS * 1_000))}`;
}

function conditionCache(background: boolean) {
  return unstable_cache(
    async (
      generation: string,
      period: string,
      speciesId: string,
      slug: string,
      regionId: RegionId,
      bounds: SpatialBounds,
    ) => {
      void period;
      const summary = await getAreaPredictionSummary(
        speciesId, { slug, regionId, bounds }, { generation, background },
      );
      if (summary && (summary.snapshot.stale || summary.result.score === null ||
        summary.result.missingComponents.length > 0)) {
        throw new Error("Local guide conditions are incomplete; retry without caching");
      }
      return summary;
    },
    // Priority affects scheduling only, so both wrappers intentionally share
    // the callback text, key parts and semantic arguments in Next's Data Cache.
    ["local-guide-condition-v2"],
    { revalidate: DAILY_OVERVIEW_REVALIDATE_SECONDS, tags: ["local-guide-condition"] },
  );
}
const loadCachedLocalGuideCondition = conditionCache(false);
const warmCachedLocalGuideCondition = conditionCache(true);
const pending = new Map<string, Promise<Awaited<ReturnType<typeof getAreaPredictionSummary>>>>();

export async function loadLocalGuideCondition(
  speciesId: string,
  slug: string,
  regionId: RegionId,
  bounds: SpatialBounds,
  background = false,
) {
  const generation = await readCurrentOverviewGeneration();
  const period = localGuideConditionPeriod();
  const key = JSON.stringify([generation, period, speciesId, slug, regionId, bounds]);
  let task = pending.get(key);
  if (!task) {
    task = (background ? warmCachedLocalGuideCondition : loadCachedLocalGuideCondition)(
      generation, period, speciesId, slug, regionId, bounds,
    ).finally(() => { pending.delete(key); });
    pending.set(key, task);
  }
  return task;
}
