import "server-only";

import { areasBySlug, getPlace, locationPagePath, placeBounds, speciesLocationPages } from "@/data/location-pages";
import { getSpecies } from "@/data/species";
import { readCurrentOverviewGeneration } from "@/src/lib/current-overview-generation-server";
import { loadLocalGuideCondition, localGuideConditionPeriod } from "@/src/lib/local-guide-conditions-server";
import { loadLocalGuideFacts } from "@/src/lib/local-guide-facts-server";
import { createMapCacheWarmer } from "@/src/lib/map-cache-warmer";
import { monthInTimeZone } from "@/src/lib/seasonality";

export function localGuideWarmTargets() {
  const month = monthInTimeZone();
  return speciesLocationPages.flatMap((page) => {
    const species = getSpecies(page.speciesId)!;
    const regionId = areasBySlug[page.areaSlug]!.regionId;
    const eligible = species.predictionMode === "current" &&
      species.ecologicalConfig.regions.includes(regionId) &&
      species.ecologicalConfig.seasonality[month] !== "inactive";
    return (eligible ? ["facts", "conditions"] as const : ["facts"] as const)
      .map((kind) => ({ page, kind, url: `${locationPagePath(page)}#${kind}` }));
  });
}

/** Prime the exact page caches; one background read leaves room for visitors. */
export const warmLocalGuideCaches = createMapCacheWarmer({
  targets: localGuideWarmTargets,
  concurrency: 1,
  cacheSeconds: 6 * 60 * 60,
  generation: async () => {
    const generation = await readCurrentOverviewGeneration();
    return generation.startsWith("fallback:") ? null : `${generation}:${localGuideConditionPeriod()}`;
  },
  load: async ({ page, kind }) => {
    const location = getPlace(page.areaSlug, page.placeSlug)!;
    const slug = `${location.areaSlug}/${location.slug}`;
    const bounds = placeBounds(location);
    if (kind === "facts") {
      await loadLocalGuideFacts(page.speciesId, slug, bounds, `entorn de ${location.name}`);
    } else {
      await loadLocalGuideCondition(page.speciesId, slug, areasBySlug[page.areaSlug]!.regionId, bounds, true);
    }
    return { truncated: false };
  },
});
