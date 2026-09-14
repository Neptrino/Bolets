import "server-only";

import { areasBySlug, locationPagePath, speciesLocationPages } from "@/data/location-pages";
import { getSpecies } from "@/data/species";
import { readCurrentOverviewGeneration } from "@/src/lib/current-overview-generation-server";
import { localGuideConditionPeriod } from "@/src/lib/local-guide-conditions-server";
import { createMapCacheWarmer } from "@/src/lib/map-cache-warmer";
import { monthInTimeZone } from "@/src/lib/seasonality";

export function localGuideWarmTargets() {
  const month = monthInTimeZone();
  return speciesLocationPages.map((page) => {
    const species = getSpecies(page.speciesId)!;
    const regionId = areasBySlug[page.areaSlug]!.regionId;
    const conditions = species.predictionMode === "current" &&
      species.ecologicalConfig.regions.includes(regionId) &&
      species.ecologicalConfig.seasonality[month] !== "inactive";
    return { url: locationPagePath(page), conditions };
  });
}

export async function warmLocalGuidePage(target: ReturnType<typeof localGuideWarmTargets>[number]) {
  const secret = process.env.CACHE_WARM_SECRET;
  if (!secret) throw new Error("Internal warming credential is missing");
  const port = process.env.PORT ?? "3000";
  if (!/^\d{1,5}$/.test(port)) throw new Error("Invalid local application port");
  // Next's cache key includes the compiled callback text. Route-handler and
  // RSC bundles can minify that text differently, even for a shared module.
  // Render the actual page so warming and visitors use the same cache entries.
  const response = await fetch(`http://127.0.0.1:${port}${target.url}`, {
    headers: { Authorization: `Bearer ${secret}`, DNT: "1" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Local guide warming returned ${response.status}`);
  const html = await response.text();
  const evidenceComplete = /data-local-evidence-state="(?:available|empty)"/.test(html);
  const conditionsComplete = !target.conditions || /data-local-condition-state="(?:available|empty)"/.test(html);
  return { truncated: !evidenceComplete || !conditionsComplete };
}

/** Prime visitor entries through one loopback page request at a time. */
export const warmLocalGuideCaches = createMapCacheWarmer({
  targets: localGuideWarmTargets,
  concurrency: 1,
  cacheSeconds: 6 * 60 * 60,
  generation: async () => {
    const generation = await readCurrentOverviewGeneration();
    return generation.startsWith("fallback:") ? null : `${generation}:${localGuideConditionPeriod()}`;
  },
  load: warmLocalGuidePage,
});
