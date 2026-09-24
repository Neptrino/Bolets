import { cache } from "react";
import { connection } from "next/server";
import {
  isAreaOverviewItem,
  loadCachedAreaOverview,
  loadCachedCurrentOverview,
  type RankedOverviewItem,
} from "@/src/lib/current-overview";
import { GLOBAL_SPECIES_ID } from "@/src/lib/global-map";
import { loadOverviewTrend, OVERVIEW_TREND_OFFSET } from "@/src/lib/overview-trend";
import { getCachedGlobalMapPredictionCells, getCachedPredictionMapTimelineFrame } from "@/src/lib/prediction-response-cache";
import { speciesMapHref } from "@/src/lib/species-map-pages";
import { territorialMapPath } from "@/src/lib/territorial-map";
import type { GlobalPredictionMapCell } from "@/src/lib/types";
import { WEEKEND_OUTLOOK_FRAME_LIMIT, WEEKEND_OUTLOOK_GRID_M } from "@/src/lib/weekend-outlook";

/* The overview the Avui page and its weekend block share: one request-bound
   load of both territorial summaries, and the naming and map links the
   sections quote for each ranked item. */

export const loadOverview = cache(async () => {
  // VPS builds intentionally receive no database credentials. Wait for a real
  // request so the runtime-only internal Supabase URL is available; the two
  // overview loaders share one generation-bound data cache.
  await connection();
  const [loadedCurrentItems, loadedAreaItems] = await Promise.all([
    loadCachedCurrentOverview(),
    loadCachedAreaOverview(),
  ]);
  return { loadedCurrentItems, loadedAreaItems };
});

export function overviewLocationName(item: RankedOverviewItem) {
  return isAreaOverviewItem(item) ? item.areaName : item.regionName;
}

export function overviewMapPath(item: RankedOverviewItem) {
  return isAreaOverviewItem(item)
    ? territorialMapPath(item.speciesId, item.regionId, item.bounds)
    : speciesMapHref(item.speciesId, { region: item.regionId });
}

const loadTrend = cache(() => loadOverviewTrend(
  (bounds) => getCachedGlobalMapPredictionCells(bounds, WEEKEND_OUTLOOK_FRAME_LIMIT, WEEKEND_OUTLOOK_GRID_M),
  async (bounds) => {
    const frame = await getCachedPredictionMapTimelineFrame(GLOBAL_SPECIES_ID, bounds, WEEKEND_OUTLOOK_FRAME_LIMIT, WEEKEND_OUTLOOK_GRID_M, OVERVIEW_TREND_OFFSET);
    // The combined frame carries the leading species per cell; the type is shared with single-species frames.
    return { truncated: frame.truncated, cells: frame.cells.map((cell): GlobalPredictionMapCell => ({ ...cell, topSpeciesId: (cell as Partial<GlobalPredictionMapCell>).topSpeciesId ?? null })) };
  },
).catch(() => null));

/**
 * The answer's trend sentence ships in the first HTML only when the map
 * warmer has already filled both days' buckets. A cold read keeps running in
 * the background to fill the cache, but the page never waits past the budget
 * for it: the sentence is left out rather than delaying the answer.
 */
export async function loadOverviewTrendSentence(budgetMs = 800) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), budgetMs); });
  try {
    return await Promise.race([loadTrend(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
