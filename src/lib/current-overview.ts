import { regionLabels, regionSelectItems } from "@/data/regions";
import { getSpecies, speciesProfiles } from "@/data/species";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { getRegionalPredictionSummary } from "@/src/lib/predictions";
import { compareSpeciesDiscoveryPriority } from "@/src/lib/species-discovery";
import type {
  Month,
  RegionId,
  RegionalPredictionSummary,
  SeasonalActivity,
} from "@/src/lib/types";

export interface CurrentOverviewTarget {
  speciesId: string;
  regionId: RegionId;
  seasonalActivity: SeasonalActivity;
}

export type CurrentOverviewStatus = "available" | "insufficient" | "unavailable";

export interface CurrentOverviewItem extends CurrentOverviewTarget {
  speciesName: string;
  regionName: string;
  status: CurrentOverviewStatus;
  summary: RegionalPredictionSummary | null;
}

const edibleStatuses = new Set([
  "excellent_edible",
  "edible",
  "edible_with_conditions",
]);

export const seasonalActivityRank: Record<SeasonalActivity, number> = {
  inactive: 0,
  possible: 1,
  moderate: 2,
  good: 3,
  peak: 4,
};

export const CURRENT_OVERVIEW_CANDIDATES_PER_REGION = 3;
export const CURRENT_OVERVIEW_CONCURRENCY = 6;
/**
 * A calendar-only top-3 can fill up with lowland species whose season reads
 * stronger on paper, leaving high-mountain conditions unevaluated exactly when
 * they are the only favourable ones (high summer). Every region therefore
 * guarantees one candidate whose habitat reaches at least this altitude when
 * an in-season one exists.
 */
export const CURRENT_OVERVIEW_MONTANE_REACH_M = 1600;

const catalanCollator = new Intl.Collator("ca", { sensitivity: "base" });

/**
 * Select the most relevant in-season edible candidates in every region.
 * Calendar strength takes precedence, followed by search/editorial demand and
 * culinary relevance. None of these priorities changes the prediction score.
 */
export function currentOverviewTargetsForMonth(month: Month): CurrentOverviewTarget[] {
  return regionSelectItems
    .filter(({ value }) => value !== "altres")
    .flatMap(({ value: regionId }) => {
      const eligible = speciesProfiles
        .filter((profile) =>
          profile.predictionMode === "current" &&
          edibleStatuses.has(profile.identity.edibility) &&
          profile.ecologicalConfig.regions.includes(regionId) &&
          profile.ecologicalConfig.seasonality[month] !== "inactive"
        )
        .sort((left, right) => {
          const activityDifference = seasonalActivityRank[right.ecologicalConfig.seasonality[month]] -
            seasonalActivityRank[left.ecologicalConfig.seasonality[month]];
          return activityDifference || compareSpeciesDiscoveryPriority(left, right);
        });

      const selected = eligible.slice(0, CURRENT_OVERVIEW_CANDIDATES_PER_REGION);
      const reachesMontane = (profile: (typeof eligible)[number]) =>
        profile.ecologicalConfig.habitat.altitude[1] >= CURRENT_OVERVIEW_MONTANE_REACH_M;
      // Appending the first montane-reach candidate from the same sorted list
      // preserves the descending-activity order of the selection.
      if (!selected.some(reachesMontane)) {
        const montane = eligible
          .slice(CURRENT_OVERVIEW_CANDIDATES_PER_REGION)
          .find(reachesMontane);
        if (montane) selected.push(montane);
      }

      return selected.map((profile) => ({
        speciesId: profile.speciesId,
        regionId,
        seasonalActivity: profile.ecologicalConfig.seasonality[month],
      }));
    });
}

/**
 * The component that most often carries the lowest score across publishable
 * readings — the honest headline when every evaluated pairing scores zero.
 */
export function dominantLimitingComponent(items: CurrentOverviewItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.status !== "available" || !item.summary) continue;
    const limiting = item.summary.result.components
      .filter((component) => component.score !== null)
      .sort((left, right) => (left.score ?? 0) - (right.score ?? 0))[0];
    if (!limiting) continue;
    counts.set(limiting.label, (counts.get(limiting.label) ?? 0) + 1);
  }
  let dominant: string | null = null;
  let best = 0;
  for (const [label, count] of counts) {
    if (count > best) {
      dominant = label;
      best = count;
    }
  }
  return dominant;
}

type SummaryLoader = (
  speciesId: string,
  regionId: RegionId,
) => Promise<RegionalPredictionSummary | null>;

async function settleTargets(
  targets: CurrentOverviewTarget[],
  loader: SummaryLoader,
  concurrency = CURRENT_OVERVIEW_CONCURRENCY,
) {
  const results = new Array<PromiseSettledResult<RegionalPredictionSummary | null>>(targets.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, targets.length) },
    async () => {
      while (nextIndex < targets.length) {
        const index = nextIndex++;
        const target = targets[index]!;
        try {
          results[index] = {
            status: "fulfilled",
            value: await loader(target.speciesId, target.regionId),
          };
        } catch (reason) {
          results[index] = { status: "rejected", reason };
        }
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export async function loadCurrentOverview(
  loader: SummaryLoader = getRegionalPredictionSummary,
  month: Month = monthInTimeZone(),
): Promise<CurrentOverviewItem[]> {
  const targets = currentOverviewTargetsForMonth(month);
  const settled = await settleTargets(targets, loader);

  return targets.map((target, index) => {
    const result = settled[index]!;
    const species = getSpecies(target.speciesId);
    const summary = result.status === "fulfilled" ? result.value : null;
    const publishable = Boolean(
      summary &&
      summary.result.score !== null &&
      summary.result.missingComponents.length === 0 &&
      !summary.snapshot.stale,
    );

    return {
      ...target,
      speciesName: species?.identity.commonName ?? target.speciesId,
      regionName: regionLabels[target.regionId],
      status: result.status === "rejected"
        ? "unavailable"
        : publishable
          ? "available"
          : "insufficient",
      summary: publishable ? summary : null,
    };
  });
}

/** Sort publishable readings by score while keeping withheld states visible. */
export function rankCurrentOverviewItems(items: CurrentOverviewItem[]) {
  const statusRank: Record<CurrentOverviewStatus, number> = {
    available: 0,
    insufficient: 1,
    unavailable: 2,
  };

  return [...items].sort((left, right) => {
    const statusDifference = statusRank[left.status] - statusRank[right.status];
    if (statusDifference) return statusDifference;

    const scoreDifference = (right.summary?.result.score ?? -1) -
      (left.summary?.result.score ?? -1);
    // Equal medians are common out of season; a nonzero best cell means a
    // localized pocket worth surfacing ahead of uniformly flat regions.
    const bestCellDifference = (right.summary?.bestCell.score ?? -1) -
      (left.summary?.bestCell.score ?? -1);
    const activityDifference = seasonalActivityRank[right.seasonalActivity] -
      seasonalActivityRank[left.seasonalActivity];
    return scoreDifference || bestCellDifference || activityDifference ||
      catalanCollator.compare(left.speciesName, right.speciesName) ||
      catalanCollator.compare(left.regionName, right.regionName);
  });
}

export function topCurrentOverviewItems(items: CurrentOverviewItem[], limit = 10) {
  return rankCurrentOverviewItems(items)
    .filter((item) => item.status === "available" && item.summary)
    .slice(0, limit);
}
