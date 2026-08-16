export const HABITAT_MODEL_VERSION = "habitat-static-v8-ph-taper";
export const PREDICTION_SCORING_VERSION = "hydrothermal-v1";
export const HYDROTHERMAL_PRIOR_VERSION = "hydrothermal-v1-priors-2026-08";
export const HABITAT_ONLY_MODEL_VERSION = "habitat-static-only-2026-08";

export function predictionModelVersion(ecologyVersion: string) {
  return `${ecologyVersion}+${PREDICTION_SCORING_VERSION}`;
}

// Change this whenever the compact spatial payload, environmental history,
// habitat coverage, or map scoring contract changes. It versions both the
// browser-facing request and the server-to-Supabase cache key.
export const PREDICTION_CACHE_VERSION =
  `prediction-map-v16-${HABITAT_MODEL_VERSION}-${PREDICTION_SCORING_VERSION}-${HYDROTHERMAL_PRIOR_VERSION}`;
