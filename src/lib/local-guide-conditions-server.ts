import "server-only";

import { unstable_cache } from "next/cache";
import { readCurrentOverviewGeneration } from "@/src/lib/current-overview-generation-server";
import { DAILY_OVERVIEW_REVALIDATE_SECONDS } from "@/src/lib/current-overview";
import { getAreaPredictionSummary } from "@/src/lib/predictions";
import type { RegionId, SpatialBounds } from "@/src/lib/types";

const loadCachedLocalGuideCondition = unstable_cache(
  (
    generation: string,
    speciesId: string,
    slug: string,
    regionId: RegionId,
    bounds: SpatialBounds,
  ) => {
    void generation;
    return getAreaPredictionSummary(speciesId, { slug, regionId, bounds });
  },
  ["local-guide-condition-v1"],
  {
    revalidate: DAILY_OVERVIEW_REVALIDATE_SECONDS,
    tags: ["local-guide-condition"],
  },
);

export async function loadLocalGuideCondition(
  speciesId: string,
  slug: string,
  regionId: RegionId,
  bounds: SpatialBounds,
) {
  return loadCachedLocalGuideCondition(
    await readCurrentOverviewGeneration(),
    speciesId,
    slug,
    regionId,
    bounds,
  );
}
