import type { RankedOverviewItem } from "@/src/lib/current-overview";
import type { RegionalPredictionSummary } from "@/src/lib/types";
import { publicConditionFactorLabel } from "@/src/lib/condition-presentation";

function percentage(share: number) {
  if (share > 0 && share < 0.01) return "menys de l’1%";
  return `el ${Math.round(share * 100)}%`;
}

export function overviewExtent(summary: RegionalPredictionSummary) {
  if (summary.score20CellCount > 0) {
    return `Condicions favorables en ${percentage(summary.score20CellShare)} de la zona`;
  }
  if (summary.positiveCellCount > 0) {
    return `Alguna resposta favorable en ${percentage(summary.positiveCellShare)} de la zona`;
  }
  return "Sense cap sector favorable ara mateix";
}

export function overviewLimitingFactor(item: RankedOverviewItem) {
  const factor = item.summary?.result.components
    .filter((factor) => factor.score !== null && Number.isFinite(factor.score))
    .sort((left, right) => left.score! - right.score!)[0];
  return factor ? publicConditionFactorLabel(factor.id) : "Sense cap factor destacat";
}

/** Keep the shared ranking; choose distinct territories without combining overlapping areas. */
export function currentSearchReadings(rankedItems: RankedOverviewItem[], limit = 3) {
  const locations = new Set<string>();
  return rankedItems.filter((item) => {
    const summary = item.summary;
    if (item.status !== "available" || !summary || summary.snapshot.stale ||
      !Number.isFinite(summary.result.score) || summary.result.score === null || summary.result.missingComponents.length > 0 ||
      !Number.isFinite(summary.bestCell.score) || (summary.bestCell.score ?? 0) <= 0) return false;
    const key = "areaSlug" in item ? `area:${item.areaSlug}` : `region:${item.regionId}`;
    if (locations.has(key) || locations.size >= limit) return false;
    locations.add(key);
    return true;
  });
}
