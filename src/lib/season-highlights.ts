import { compareBySearchDemand } from "@/data/species-search-demand";
import { catalogueGroup } from "@/src/lib/catalogue-list";
import type { SeasonGuide } from "@/src/lib/season-guides";
import { SEASON_MONTHS } from "@/src/lib/seasonality";
import type { Month, SeasonalActivity, SpeciesProfile } from "@/src/lib/types";

/* The visual summary of a season guide: the edible species people look for
   that are at their best in the season, and what peaks month by month. Drawn
   from the versioned seasonality calendar and ranked by search demand, so a
   toxic species is never presented as "what comes out" in the season. */

const activityRank: Record<SeasonalActivity, number> = { inactive: 0, possible: 1, moderate: 2, good: 3, peak: 4 };
const byDemand = (left: SpeciesProfile, right: SpeciesProfile) => compareBySearchDemand(
  { speciesId: left.speciesId, name: left.identity.commonName },
  { speciesId: right.speciesId, name: right.identity.commonName },
);

export const isEdibleSpecies = (species: SpeciesProfile) => catalogueGroup(species.identity.edibility) === "edible";

function activityIn(species: SpeciesProfile, month: Month) {
  return activityRank[species.ecologicalConfig.seasonality[month]];
}

/** Guide months in which the species reaches its best activity of the season. */
export function bestMonthsInSeason(species: SpeciesProfile, months: readonly Month[]) {
  const best = Math.max(...months.map((month) => activityIn(species, month)));
  return months.filter((month) => activityIn(species, month) === best);
}

/** Most searched edibles with good or peak activity somewhere in the season. */
export function seasonProtagonists(guide: SeasonGuide, species: readonly SpeciesProfile[], limit = 6) {
  return species
    .filter((item) => isEdibleSpecies(item) && guide.months.some((month) => activityIn(item, month) >= activityRank.good))
    .sort(byDemand)
    .slice(0, limit)
    .map((item) => ({ species: item, bestMonths: bestMonthsInSeason(item, guide.months) }));
}

export interface SeasonMonthHighlight {
  month: Month;
  label: string;
  species: SpeciesProfile[];
  /** Further edibles at the same level that the column does not name. */
  more: number;
}

/** Per month, the edibles at their peak (good as well when fewer than three peak). */
export function seasonMonthHighlights(guide: SeasonGuide, species: readonly SpeciesProfile[], limit = 6): SeasonMonthHighlight[] {
  return guide.months.map((month) => {
    const edible = species.filter(isEdibleSpecies);
    const peak = edible.filter((item) => activityIn(item, month) === activityRank.peak);
    const chosen = (peak.length >= 3 ? peak : edible.filter((item) => activityIn(item, month) >= activityRank.good)).sort(byDemand);
    const label = SEASON_MONTHS.find((entry) => entry.key === month)?.label ?? month;
    return { month, label, species: chosen.slice(0, limit), more: Math.max(0, chosen.length - limit) };
  });
}

/** Edibles first, most searched first; toxic and inedible species kept apart. */
export function splitSeasonSpecies(species: readonly SpeciesProfile[]) {
  return {
    edible: species.filter(isEdibleSpecies).sort(byDemand),
    caution: species.filter((item) => !isEdibleSpecies(item)),
  };
}
