import {
  areaBounds,
  areaPath,
  areaProfiles,
  placeBounds,
  placePath,
  placeProfiles,
  speciesLocationPages,
  type AreaProfile,
} from "@/data/location-pages";
import { regionLabels, regionSelectItems } from "@/data/regions";
import { getSpecies, speciesProfiles } from "@/data/species";
import { monthInTimeZone } from "@/src/lib/seasonality";
import {
  getAreaPredictionSummaryBatches,
  getRegionalPredictionSummaries,
} from "@/src/lib/predictions";
import { compareSpeciesDiscoveryPriority } from "@/src/lib/species-discovery";
import type {
  AreaPredictionSummary,
  Month,
  RegionId,
  RegionalPredictionSummary,
  SeasonalActivity,
  SpatialBounds,
} from "@/src/lib/types";
import { unstable_cache } from "next/cache";

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

// Each spatial Edge request performs three database reads in parallel. Keep
// the regional fan-out below the production PostgREST pool ceiling so a cold
// overview cannot starve its own requests or unrelated map traffic.
export const CURRENT_OVERVIEW_CONCURRENCY = 3;

const catalanCollator = new Intl.Collator("ca", { sensitivity: "base" });

/**
 * Select every in-season edible candidate in every region. Calendar strength
 * and discovery priority only make the request order deterministic; neither
 * can exclude a species that might lead on current conditions.
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

      return eligible.map((profile) => ({
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
  speciesIds: string[],
  regionId: RegionId,
) => Promise<Record<string, RegionalPredictionSummary | null>>;

async function settleTargets<Target, Result>(
  targets: Target[],
  loader: (target: Target) => Promise<Result>,
  concurrency = CURRENT_OVERVIEW_CONCURRENCY,
) {
  const results = new Array<PromiseSettledResult<Result>>(targets.length);
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
            value: await loader(target),
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

/** A summary is publishable when scored, complete and current. */
function publishableSummary(summary: RegionalPredictionSummary | null) {
  return Boolean(
    summary &&
    summary.result.score !== null &&
    summary.result.missingComponents.length === 0 &&
    !summary.snapshot.stale,
  );
}

export async function loadCurrentOverview(
  loader: SummaryLoader = getRegionalPredictionSummaries,
  month: Month = monthInTimeZone(),
): Promise<CurrentOverviewItem[]> {
  const targets = currentOverviewTargetsForMonth(month);
  const targetsByRegion = new Map<RegionId, CurrentOverviewTarget[]>();
  for (const target of targets) {
    const group = targetsByRegion.get(target.regionId) ?? [];
    group.push(target);
    targetsByRegion.set(target.regionId, group);
  }
  const groups = [...targetsByRegion.values()];
  const settled = await settleTargets(
    groups,
    (group) => loader(group.map((target) => target.speciesId), group[0]!.regionId),
  );

  return groups.flatMap((group, index) => {
    const result = settled[index]!;
    return group.map((target) => {
      const species = getSpecies(target.speciesId);
      const summary = result.status === "fulfilled"
        ? result.value[target.speciesId] ?? null
        : null;
      const publishable = publishableSummary(summary);

      return {
        ...target,
        speciesName: species?.identity.commonName ?? target.speciesId,
        regionName: regionLabels[target.regionId],
        status: result.status === "rejected"
          ? "unavailable" as const
          : publishable
            ? "available" as const
            : "insufficient" as const,
        summary: publishable ? summary : null,
      };
    });
  });
}

/**
 * A territorial hub the overview reads: an area (massís or comarca) or a
 * paratge place promoted to hub level. Paratges qualify when their parent is
 * a comarca — the same rule /zones uses to give them their own card.
 */
export interface OverviewHub {
  slug: string;
  name: string;
  typeLabel: AreaProfile["typeLabel"] | "paratge";
  prepositionalName: string;
  regionId: RegionId;
  bounds: SpatialBounds;
  path: string;
  guides: typeof speciesLocationPages;
}

export function overviewHubs(): OverviewHub[] {
  const areaHubs = areaProfiles.map((area) => ({
    slug: area.slug,
    name: area.name,
    typeLabel: area.typeLabel,
    prepositionalName: area.prepositionalName,
    regionId: area.regionId,
    bounds: areaBounds(area),
    path: areaPath(area),
    guides: speciesLocationPages.filter((page) => page.areaSlug === area.slug),
  }));
  const paratgeHubs = placeProfiles
    .filter((place) =>
      place.typeLabel === "paratge" &&
      areaProfiles.some((area) => area.slug === place.areaSlug && area.typeLabel === "comarca"),
    )
    .map((place) => {
      const parent = areaProfiles.find((area) => area.slug === place.areaSlug)!;
      return {
        slug: `${place.areaSlug}/${place.slug}`,
        name: place.name,
        typeLabel: "paratge" as const,
        prepositionalName: place.prepositionalName,
        regionId: parent.regionId,
        bounds: placeBounds(place),
        path: placePath(place),
        guides: speciesLocationPages.filter(
          (page) => page.areaSlug === place.areaSlug && page.placeSlug === place.slug,
        ),
      };
    });
  return [...areaHubs, ...paratgeHubs];
}

export interface AreaOverviewTarget {
  hub: OverviewHub;
  speciesId: string;
  seasonalActivity: SeasonalActivity;
}

export interface AreaOverviewItem {
  areaSlug: string;
  areaName: string;
  areaTypeLabel: OverviewHub["typeLabel"];
  prepositionalName: string;
  regionId: RegionId;
  bounds: SpatialBounds;
  path: string;
  speciesId: string;
  speciesName: string;
  seasonalActivity: SeasonalActivity;
  status: CurrentOverviewStatus;
  summary: AreaPredictionSummary | null;
}

/**
 * Every in-season edible species with a published local guide is eligible.
 * Current 1 km scores choose the hub's representative only after all of them
 * have been evaluated.
 */
export function areaOverviewTargetsForMonth(month: Month): AreaOverviewTarget[] {
  return overviewHubs().flatMap((hub) => {
    const localSpeciesIds = new Set(hub.guides.map((page) => page.speciesId));
    const candidates = [...localSpeciesIds]
      .flatMap((speciesId) => {
        const profile = getSpecies(speciesId);
        return profile &&
            profile.predictionMode === "current" &&
            edibleStatuses.has(profile.identity.edibility) &&
            profile.ecologicalConfig.regions.includes(hub.regionId) &&
            profile.ecologicalConfig.seasonality[month] !== "inactive"
          ? [profile]
          : [];
      })
      .sort((left, right) => {
        const activityDifference = seasonalActivityRank[right.ecologicalConfig.seasonality[month]] -
          seasonalActivityRank[left.ecologicalConfig.seasonality[month]];
        return activityDifference || compareSpeciesDiscoveryPriority(left, right);
      });

    return candidates.map((candidate) => ({
      hub,
      speciesId: candidate.speciesId,
      seasonalActivity: candidate.ecologicalConfig.seasonality[month],
    }));
  });
}

type AreaSummaryLoader = (
  speciesIds: string[],
  hub: OverviewHub,
) => Promise<Record<string, AreaPredictionSummary | null>>;

export async function loadAreaOverview(
  loader: AreaSummaryLoader | undefined = undefined,
  month: Month = monthInTimeZone(),
): Promise<AreaOverviewItem[]> {
  const targets = areaOverviewTargetsForMonth(month);
  const groupedTargets = new Map<string, AreaOverviewTarget[]>();
  for (const target of targets) {
    const group = groupedTargets.get(target.hub.slug) ?? [];
    group.push(target);
    groupedTargets.set(target.hub.slug, group);
  }
  const targetsByHub = [...groupedTargets.values()];
  const settled = loader
    ? await settleTargets(
        targetsByHub,
        (hubTargets) => loader(
          hubTargets.map((target) => target.speciesId),
          hubTargets[0]!.hub,
        ),
      )
    : await getAreaPredictionSummaryBatches(targetsByHub.map((hubTargets) => {
        const hub = hubTargets[0]!.hub;
        return {
          speciesIds: hubTargets.map((target) => target.speciesId),
          area: { slug: hub.slug, regionId: hub.regionId, bounds: hub.bounds },
        };
      }));

  return targetsByHub.map((hubTargets, index) => {
    const fallback = hubTargets[0]!;
    const result = settled[index]!;
    const candidates = result.status === "fulfilled"
      ? hubTargets.flatMap((target) => {
          const summary = result.value[target.speciesId] ?? null;
          return publishableSummary(summary) ? [{ target, summary: summary! }] : [];
        })
      : [];
    const selected = candidates.sort((left, right) =>
      (right.summary.bestCell.score - left.summary.bestCell.score) ||
      (right.summary.score20CellShare - left.summary.score20CellShare) ||
      (right.summary.positiveCellShare - left.summary.positiveCellShare) ||
      ((right.summary.result.score ?? -1) - (left.summary.result.score ?? -1)) ||
      catalanCollator.compare(
        getSpecies(left.target.speciesId)?.identity.commonName ?? left.target.speciesId,
        getSpecies(right.target.speciesId)?.identity.commonName ?? right.target.speciesId,
      )
    )[0];
    const target = selected?.target ?? fallback;
    const summary = selected?.summary ?? null;
    const species = getSpecies(target.speciesId);

    return {
      areaSlug: target.hub.slug,
      areaName: target.hub.name,
      areaTypeLabel: target.hub.typeLabel,
      prepositionalName: target.hub.prepositionalName,
      regionId: target.hub.regionId,
      bounds: target.hub.bounds,
      path: target.hub.path,
      speciesId: target.speciesId,
      speciesName: species?.identity.commonName ?? target.speciesId,
      seasonalActivity: target.seasonalActivity,
      status: result.status === "rejected"
        ? "unavailable"
        : selected
          ? "available"
          : "insufficient",
      summary,
    };
  });
}

const loadCachedCurrentOverviewData = unstable_cache(
  () => loadCurrentOverview(),
  ["current-overview-v2"],
  { revalidate: 300, tags: ["current-overview"] },
);

const loadCachedAreaOverviewData = unstable_cache(
  () => loadAreaOverview(),
  ["area-overview-v2"],
  { revalidate: 300, tags: ["area-overview"] },
);

/** Shared five-minute snapshots for pages that render the same daily board. */
export async function loadCachedCurrentOverview() {
  return loadCachedCurrentOverviewData();
}

export async function loadCachedAreaOverview() {
  return loadCachedAreaOverviewData();
}

const catalanAreaCollator = new Intl.Collator("ca", { sensitivity: "base" });

/** Publishable hubs first, best 1 km cell first; withheld hubs stay visible. */
export function rankAreaOverviewItems(items: AreaOverviewItem[]) {
  const statusRank: Record<CurrentOverviewStatus, number> = {
    available: 0,
    insufficient: 1,
    unavailable: 2,
  };
  return [...items].sort((left, right) =>
    (statusRank[left.status] - statusRank[right.status]) ||
    ((right.summary?.bestCell.score ?? -1) - (left.summary?.bestCell.score ?? -1)) ||
    ((right.summary?.score20CellShare ?? -1) - (left.summary?.score20CellShare ?? -1)) ||
    ((right.summary?.positiveCellShare ?? -1) - (left.summary?.positiveCellShare ?? -1)) ||
    catalanAreaCollator.compare(left.areaName, right.areaName)
  );
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

    const bestCellDifference = (right.summary?.bestCell.score ?? -1) -
      (left.summary?.bestCell.score ?? -1);
    const score20ShareDifference = (right.summary?.score20CellShare ?? -1) -
      (left.summary?.score20CellShare ?? -1);
    const positiveShareDifference = (right.summary?.positiveCellShare ?? -1) -
      (left.summary?.positiveCellShare ?? -1);
    const activityDifference = seasonalActivityRank[right.seasonalActivity] -
      seasonalActivityRank[left.seasonalActivity];
    return bestCellDifference || score20ShareDifference || positiveShareDifference ||
      activityDifference ||
      catalanCollator.compare(left.speciesName, right.speciesName) ||
      catalanCollator.compare(left.regionName, right.regionName);
  });
}

export function topCurrentOverviewItems(items: CurrentOverviewItem[], limit = 10) {
  return rankCurrentOverviewItems(items)
    .filter((item) => item.status === "available" && item.summary)
    .slice(0, limit);
}
