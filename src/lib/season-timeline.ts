import { speciesIllustrationPath } from "@/data/species-illustrations";
import { familiarSpeciesIds } from "@/src/lib/featured-species";
import { speciesPath } from "@/src/lib/seo";
import { SEASON_MONTHS } from "@/src/lib/seasonality";
import { speciesInSeason } from "@/src/lib/species-collections";
import type { EdibilityStatus, Month, SpeciesProfile } from "@/src/lib/types";

export type SeasonEdibilityKind = "edible" | "avoid" | "toxic";

export interface SeasonTimelineHighlight {
  speciesId: string;
  commonName: string;
  href: string;
  icon: string;
}

export interface SeasonTimelineFrame {
  /** Species with any seasonal activity, the same count as the season calendar. */
  total: number;
  byKind: Record<SeasonEdibilityKind, number>;
  /** Species at their peak or in good season, most important first. */
  highlights: SeasonTimelineHighlight[];
}

export type SeasonTimeline = Record<Month, SeasonTimelineFrame>;

const highlightLimit = 12;

const kindOf: Record<EdibilityStatus, SeasonEdibilityKind> = {
  excellent_edible: "edible",
  edible: "edible",
  edible_with_conditions: "edible",
  not_recommended: "avoid",
  inedible: "avoid",
  unknown: "avoid",
  toxic: "toxic",
  dangerously_toxic: "toxic",
};

const familiarRank = new Map<string, number>(familiarSpeciesIds.map((id, index) => [id, index]));

/**
 * Importance on stage: the best-known edibles first (the site's editorial
 * ranking), then other excellent edibles, then the deadly species a forager
 * must know, then the remaining groups.
 */
const importanceTier: Record<EdibilityStatus, number> = {
  excellent_edible: 1,
  dangerously_toxic: 2,
  edible: 3,
  edible_with_conditions: 4,
  toxic: 5,
  not_recommended: 6,
  inedible: 6,
  unknown: 7,
};

const collator = new Intl.Collator("ca", { sensitivity: "base" });

function byImportance(month: Month) {
  const tier = (species: SpeciesProfile) => (familiarRank.has(species.speciesId) ? 0 : importanceTier[species.identity.edibility]);
  const activity = (species: SpeciesProfile) => (species.ecologicalConfig.seasonality[month] === "peak" ? 0 : 1);
  return (left: SpeciesProfile, right: SpeciesProfile) =>
    tier(left) - tier(right)
    || (familiarRank.get(left.speciesId) ?? 0) - (familiarRank.get(right.speciesId) ?? 0)
    || activity(left) - activity(right)
    || collator.compare(left.identity.commonName, right.identity.commonName);
}

function toHighlight(species: SpeciesProfile): SeasonTimelineHighlight | null {
  const icon = speciesIllustrationPath(species.speciesId);
  return icon ? { speciesId: species.speciesId, commonName: species.identity.commonName, href: speciesPath(species), icon } : null;
}

function frame(month: Month): SeasonTimelineFrame {
  const active = speciesInSeason(month);
  const byKind: Record<SeasonEdibilityKind, number> = { edible: 0, avoid: 0, toxic: 0 };
  for (const species of active) byKind[kindOf[species.identity.edibility]] += 1;

  return {
    total: active.length,
    byKind,
    highlights: active
      .filter((species) => ["peak", "good"].includes(species.ecologicalConfig.seasonality[month]))
      .sort(byImportance(month))
      .map(toHighlight)
      .filter((highlight): highlight is SeasonTimelineHighlight => highlight !== null)
      .slice(0, highlightLimit),
  };
}

/** The season calendar as frames for the animated year on /temporada. */
export function seasonTimeline(): SeasonTimeline {
  return Object.fromEntries(SEASON_MONTHS.map(({ key }) => [key, frame(key)])) as SeasonTimeline;
}
