import { comparisonPages, type ComparisonPage } from "@/data/comparison-pages";
import { getCatalogueSpecies } from "@/data/catalogue";
import { SEASON_MONTHS } from "@/src/lib/seasonality";
import { speciesPath } from "@/src/lib/seo";
import type { CatalogueSpecies, EdibilityStatus, Month, SeasonalActivity } from "@/src/lib/types";

export const LOOKALIKE_GUIDE_PATH = "/bolets-i-confusions";

/* The typical-mushrooms-and-lookalikes guide is assembled entirely from the
   per-pair comparison pages: each edible species gets the pairs where it meets
   a species to avoid, so the guide can never say more than the pages it links. */

const edibleStatuses = new Set<EdibilityStatus>(["excellent_edible", "edible", "edible_with_conditions"]);

/** Editorial reading order: the most picked species first. */
export const LOOKALIKE_GUIDE_ORDER = [
  "lactarius-sanguifluus",
  "boletus-edulis",
  "cantharellus-cibarius",
  "amanita-caesarea",
  "tricholoma-terreum",
  "calocybe-gambosa",
  "macrolepiota-procera",
  "marasmius-oreades",
  "hygrophorus-russula",
  "agaricus-campestris",
  "pleurotus-ostreatus",
  "morchella-esculenta",
] as const;

export interface LookalikePair {
  page: ComparisonPage;
  edible: CatalogueSpecies;
  lookalike: CatalogueSpecies;
}

export interface LookalikeGroup {
  species: CatalogueSpecies;
  risky: LookalikePair[];
  harmless: LookalikePair[];
}

function isEdible(species: CatalogueSpecies) {
  return edibleStatuses.has(species.identity.edibility);
}

function resolvePair(page: ComparisonPage): LookalikePair {
  const left = getCatalogueSpecies(page.leftSpeciesId);
  const right = getCatalogueSpecies(page.rightSpeciesId);
  if (!left || !right) throw new Error(`Missing comparison species for ${page.slug}`);
  return isEdible(left) || !isEdible(right)
    ? { page, edible: left, lookalike: right }
    : { page, edible: right, lookalike: left };
}

const pairs = comparisonPages.map(resolvePair);

export function isRiskyPair(pair: LookalikePair) {
  return isEdible(pair.edible) && !isEdible(pair.lookalike);
}

export const lookalikeGroups: LookalikeGroup[] = LOOKALIKE_GUIDE_ORDER.map((speciesId) => {
  const species = getCatalogueSpecies(speciesId);
  if (!species) throw new Error(`Missing lookalike guide species: ${speciesId}`);
  const involving = pairs.filter((pair) => pair.page.leftSpeciesId === speciesId || pair.page.rightSpeciesId === speciesId);
  return {
    species,
    risky: involving.filter((pair) => pair.edible.speciesId === speciesId && isRiskyPair(pair)),
    harmless: involving.filter((pair) => !isRiskyPair(pair)),
  };
});

/** Pairs between two edible species that no group above mentions. */
export const otherHarmlessPairs = pairs.filter((pair) => (
  !isRiskyPair(pair) && !lookalikeGroups.some((group) => group.harmless.includes(pair))
));

/** Risky pairs whose edible species is not in the reading order; a test keeps this empty. */
export const ungroupedRiskyPairs = pairs.filter((pair) => (
  isRiskyPair(pair) && !lookalikeGroups.some((group) => group.risky.includes(pair))
));

export const deadlyLookalikePairs = pairs.filter((pair) => pair.lookalike.speciesId === "amanita-phalloides");

export function referenceImage(species: CatalogueSpecies) {
  return species.media.find((asset) => asset.identificationReference && asset.localPath)
    ?? species.media.find((asset) => asset.localPath);
}

export function lookalikeGuideAnchor(species: CatalogueSpecies) {
  return `confon-${speciesPath(species).split("/").pop()}`;
}

export function lookalikePairAnchor(page: ComparisonPage) {
  return `parella-${page.slug}`;
}

/**
 * Where a species page or comparison should point in the guide: the species'
 * own section when it heads one, the guide itself when it appears only as a
 * risky lookalike, and nowhere when the guide does not mention it.
 */
export function lookalikeGuideHref(speciesId: string) {
  const group = lookalikeGroups.find((entry) => entry.species.speciesId === speciesId && entry.risky.length > 0);
  if (group) return `${LOOKALIKE_GUIDE_PATH}#${lookalikeGuideAnchor(group.species)}`;
  const appears = lookalikeGroups.some((entry) => entry.risky.some((pair) => pair.lookalike.speciesId === speciesId));
  return appears ? LOOKALIKE_GUIDE_PATH : undefined;
}

const fruitingActivity = new Set<SeasonalActivity>(["moderate", "good", "peak"]);

/**
 * Months in which both species of a pair fruit at least moderately, from the
 * versioned seasonality calendars. Null when either species is descriptive-only
 * and has no numeric calendar: an unknown overlap is not an empty one.
 */
export function pairOverlapMonths(pair: LookalikePair): Month[] | null {
  if (!("ecologicalConfig" in pair.edible) || !("ecologicalConfig" in pair.lookalike)) return null;
  const edible = pair.edible.ecologicalConfig.seasonality;
  const lookalike = pair.lookalike.ecologicalConfig.seasonality;
  return SEASON_MONTHS.map(({ key }) => key).filter((month) => (
    fruitingActivity.has(edible[month]) && fruitingActivity.has(lookalike[month])
  ));
}

/** "set.–nov." style runs; a run crossing the new year stays one run. */
export function formatMonthRuns(months: Month[]) {
  if (months.length === 0) return "No coincideixen";
  if (months.length === 12) return "Tot l’any";
  const indices = months.map((month) => SEASON_MONTHS.findIndex(({ key }) => key === month));
  const inSet = new Set(indices);
  const starts = indices.filter((index) => !inSet.has((index + 11) % 12));
  return starts.map((start) => {
    let end = start;
    while (inSet.has((end + 1) % 12)) end = (end + 1) % 12;
    const first = SEASON_MONTHS[start].label;
    return start === end ? first : `${first}–${SEASON_MONTHS[end].label}`;
  }).join(", ");
}
