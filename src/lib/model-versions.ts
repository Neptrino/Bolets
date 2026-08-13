export const HABITAT_MODEL_VERSION = "habitat-static-v7-coarse-species-cache";
export const PREDICTION_SCORING_VERSION = "coarse-habitat-v3-humidity-memory";

export function predictionModelVersion(ecologyVersion: string) {
  return `${ecologyVersion}+${PREDICTION_SCORING_VERSION}`;
}

// Change this whenever the compact spatial payload, environmental history,
// habitat coverage, or map scoring contract changes. It versions both the
// browser-facing request and the server-to-Supabase cache key.
export const PREDICTION_CACHE_VERSION =
  `prediction-map-v11-${HABITAT_MODEL_VERSION}`;
