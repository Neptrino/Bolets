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

const catalanCollator = new Intl.Collator("ca", { sensitivity: "base" });

/**
 * Select the most relevant in-season edible candidates in every region.
 * Calendar strength takes precedence, followed by search/editorial demand and
 * culinary relevance. None of these priorities changes the prediction score.
 */
export function currentOverviewTargetsForMonth(month: Month): CurrentOverviewTarget[] {
  return regionSelectItems
    .filter(({ value }) => value !== "altres")
    .flatMap(({ value: regionId }) => speciesProfiles
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
      })
      .slice(0, CURRENT_OVERVIEW_CANDIDATES_PER_REGION)
      .map((profile) => ({
        speciesId: profile.speciesId,
        regionId,
        seasonalActivity: profile.ecologicalConfig.seasonality[month],
      })));
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
    const activityDifference = seasonalActivityRank[right.seasonalActivity] -
      seasonalActivityRank[left.seasonalActivity];
    return scoreDifference || activityDifference ||
      catalanCollator.compare(left.speciesName, right.speciesName) ||
      catalanCollator.compare(left.regionName, right.regionName);
  });
}

export function topCurrentOverviewItems(items: CurrentOverviewItem[], limit = 10) {
  return rankCurrentOverviewItems(items)
    .filter((item) => item.status === "available" && item.summary)
    .slice(0, limit);
}
