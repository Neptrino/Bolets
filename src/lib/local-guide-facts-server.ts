import "server-only";

import { unstable_cache } from "next/cache";
import { getPotentialHabitatCoverage } from "@/src/lib/habitat";
import { aggregateLocalGuideFacts } from "@/src/lib/local-guide-facts";
import { HABITAT_MODEL_VERSION } from "@/src/lib/model-versions";
import type { SpatialBounds } from "@/src/lib/types";

const LOCAL_FACTS_REVALIDATE_SECONDS = 24 * 60 * 60;

const loadCachedLocalGuideFacts = unstable_cache(
  async (
    modelVersion: string,
    speciesId: string,
    placeKey: string,
    bounds: SpatialBounds,
    scopeLabel: string,
  ) => {
    void modelVersion;
    void placeKey;
    const result = await getPotentialHabitatCoverage(speciesId, bounds, 1000, 1000);
    if (result.truncated) return null;
    return aggregateLocalGuideFacts(result.cells, bounds, scopeLabel);
  },
  ["local-guide-facts-v2"],
  {
    revalidate: LOCAL_FACTS_REVALIDATE_SECONDS,
    tags: ["local-guide-facts"],
  },
);

export function loadLocalGuideFacts(
  speciesId: string,
  placeKey: string,
  bounds: SpatialBounds,
  scopeLabel: string,
) {
  return loadCachedLocalGuideFacts(
    HABITAT_MODEL_VERSION,
    speciesId,
    placeKey,
    bounds,
    scopeLabel,
  );
}
