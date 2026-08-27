export const HABITAT_MODEL_VERSION = "habitat-static-v9-edge-floor";
const PREDICTION_SCORING_VERSION = "hydrothermal-v2";
export const HYDROTHERMAL_PRIOR_VERSION = "hydrothermal-v1-priors-2026-08b";
// 08f: boletus flush lag — the four boletus species score rain fallen 15-26
// days ago (recentWindowDays 14 + rainfallWindowDays 26) after two seasons
// of field data showed cep flushes trail storms by ~2 weeks.
export const HYDROTHERMAL_V2_PRIOR_VERSION = "hydrothermal-v2-priors-2026-08f";

/**
 * Species scored by hydrothermal-v2. Full cutover 2026-08-16 after validation
 * against dated private findings (docs/fruiting-model-diagnosis.md); removing
 * a species from this set reverts it to v1 scoring, and the truffle stays
 * habitat-only regardless.
 */
const HYDROTHERMAL_V2_SPECIES = new Set<string>([
  "agaricus-campestris",
  "amanita-caesarea",
  "amanita-muscaria",
  "amanita-pantherina",
  "amanita-phalloides",
  "amanita-verna",
  "amanita-virosa",
  "boletus-aereus",
  "boletus-edulis",
  "boletus-pinophilus",
  "boletus-reticulatus",
  "calocybe-gambosa",
  "cantharellus-cibarius",
  "chroogomphus-rutilus",
  "clitocybe-rivulosa",
  "coprinus-comatus",
  "cortinarius-orellanus",
  "cortinarius-rubellus",
  "craterellus-cornucopioides",
  "craterellus-lutescens",
  "craterellus-tubaeformis",
  "cyclocybe-cylindracea",
  "entoloma-sinuatum",
  "galerina-marginata",
  "gyromitra-esculenta",
  "hydnum-repandum",
  "hygrophorus-eburneus",
  "hygrophorus-latitabundus",
  "hygrophorus-marzuolus",
  "hygrophorus-russula",
  "inocybe-erubescens",
  "lactarius-deliciosus",
  "lactarius-sanguifluus",
  "lepiota-brunneoincarnata",
  "lepista-nuda",
  "macrolepiota-procera",
  "marasmius-oreades",
  "morchella-esculenta",
  "omphalotus-olearius",
  "paxillus-involutus",
  "pleurotus-eryngii",
  "pleurotus-ostreatus",
  "ramaria-aurea",
  "rubroboletus-satanas",
  "russula-virescens",
  "suillus-granulatus",
  "suillus-luteus",
  "tricholoma-pardinum",
  "tricholoma-portentosum",
  "tricholoma-terreum",
  "tylopilus-felleus",
]);

export function speciesUsesHydrothermalV2(speciesId: string) {
  return HYDROTHERMAL_V2_SPECIES.has(speciesId);
}
export const HABITAT_ONLY_MODEL_VERSION = "habitat-static-only-2026-08";
export const TERRAIN_THERMAL_SENSITIVITY_VERSION =
  "terrain-thermal-sensitivity-v1";

export function predictionModelVersion(ecologyVersion: string) {
  return `${ecologyVersion}+${PREDICTION_SCORING_VERSION}`;
}

// Change this whenever the compact spatial payload, environmental history,
// habitat coverage, or map scoring contract changes. It versions both the
// browser-facing request and the server-to-Supabase cache key.
// v18: past precipitation moved to station-rain-v1 (XEMA gauge IDW over the
// seamless Météo-France fallback), changing every stored rain window.
// v19: combined all-species map (species=all) added; map payload gains the
// global variant with topSpeciesId and the all-slots habitat read.
// v20: combined cell detail returns the full positive ranking (up to 8
// species) instead of the top 3.
// v21: the coarse habitat cache now follows the live edible candidate set;
// invalidate server reads that retained the pre-rebuild empty/error payload.
// v22: invalidate 1 km responses materialized before a same-day observed
// replay completed; generation cursors now prevent that stale cache state.
export const PREDICTION_CACHE_VERSION =
  `prediction-map-v22-${HABITAT_MODEL_VERSION}-${PREDICTION_SCORING_VERSION}-${HYDROTHERMAL_V2_PRIOR_VERSION}`;
