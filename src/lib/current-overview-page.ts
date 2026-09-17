import { cache } from "react";
import { connection } from "next/server";
import {
  isAreaOverviewItem,
  loadCachedAreaOverview,
  loadCachedCurrentOverview,
  type RankedOverviewItem,
} from "@/src/lib/current-overview";
import { speciesMapHref } from "@/src/lib/species-map-pages";
import { territorialMapPath } from "@/src/lib/territorial-map";

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
