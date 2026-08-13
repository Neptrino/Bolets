import { regionLabels } from "@/data/regions";
import { getSpecies } from "@/data/species";
import { getRegionalPredictionSummary } from "@/src/lib/predictions";
import type { RegionId, RegionalPredictionSummary } from "@/src/lib/types";

export interface CurrentOverviewTarget {
  speciesId: string;
  regionId: RegionId;
}

export type CurrentOverviewStatus = "available" | "insufficient" | "unavailable";

export interface CurrentOverviewItem extends CurrentOverviewTarget {
  speciesName: string;
  regionName: string;
  status: CurrentOverviewStatus;
  summary: RegionalPredictionSummary | null;
}

export const currentOverviewTargets: CurrentOverviewTarget[] = [
  { speciesId: "boletus-edulis", regionId: "pirineus" },
  { speciesId: "lactarius-deliciosus", regionId: "prepirineus" },
  { speciesId: "lactarius-deliciosus", regionId: "catalunya-central" },
  { speciesId: "craterellus-lutescens", regionId: "montseny" },
  { speciesId: "lactarius-sanguifluus", regionId: "emporda" },
  { speciesId: "lactarius-sanguifluus", regionId: "serralades-prelitorals" },
];

type SummaryLoader = (
  speciesId: string,
  regionId: RegionId,
) => Promise<RegionalPredictionSummary | null>;

export async function loadCurrentOverview(
  loader: SummaryLoader = getRegionalPredictionSummary,
): Promise<CurrentOverviewItem[]> {
  const settled = await Promise.allSettled(
    currentOverviewTargets.map((target) => loader(target.speciesId, target.regionId)),
  );

  return settled.map((result, index) => {
    const target = currentOverviewTargets[index]!;
    const species = getSpecies(target.speciesId);
    const summary = result.status === "fulfilled" ? result.value : null;
    const publishable = Boolean(
      summary &&
      summary.result.score !== null &&
      summary.result.dataCompleteness >= 0.7 &&
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
