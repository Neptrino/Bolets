import type { RankedOverviewItem } from "@/src/lib/current-overview";
import type { ModelComponentId, RegionalPredictionSummary } from "@/src/lib/types";
import { publicConditionFactorLabel } from "@/src/lib/condition-presentation";
import { opportunityLabel } from "@/src/lib/scoring";

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

/** Interpret the territorial summary, never the weather at its best cell. */
export function overviewReadingExplanation(item: RankedOverviewItem) {
  if (currentSearchReadings([item]).length === 0) return null;
  const summary = item.summary!;
  const factors = summary.result.components.filter((factor) =>
    factor.score !== null && Number.isFinite(factor.score) && factor.state === "favourable",
  ).map((factor) => publicConditionFactorLabel(factor.id).toLocaleLowerCase("ca"));
  const extent = `${overviewExtent(summary)} per a aquesta espècie.`;
  if (factors.length === 0) return extent;
  return `${extent} En el resum del territori, els factors favorables són: ${new Intl.ListFormat("ca", { type: "conjunction" }).format(factors)}.`;
}

const levelPlurals: Record<ReturnType<typeof opportunityLabel>, string> = {
  "molt alta": "molt altes",
  alta: "altes",
  mitjana: "mitjanes",
  baixa: "baixes",
  "molt baixa": "molt baixes",
};

/* The weakest factor in everyday words, for the overall reading. */
const weakPointPhrases: Record<ModelComponentId, string> = {
  habitatCoverage: "el bosc i el sòl adequats",
  altitude: "l’altitud",
  phenology: "el moment de la temporada",
  water: "l’aigua",
  temperature: "la temperatura",
  extremes: "les gelades o la calor recents",
};

function weakestFactor(item: RankedOverviewItem) {
  const factor = item.summary?.result.components
    .filter((component) => component.score !== null && Number.isFinite(component.score))
    .sort((left, right) => left.score! - right.score!)[0];
  return factor && factor.state !== "favourable" ? factor.id : null;
}

/**
 * One plain sentence on Catalonia as a whole: the condition level most of the
 * tracked zones share, and the factor that most often holds them back. Reads
 * each zone's best reading (the ranking puts it first), preferring the 1 km
 * local zones, because the coarse regional summaries would drag the picture down.
 */
export function overviewOverallReading(rankedItems: RankedOverviewItem[]) {
  const available = rankedItems.filter((item) => item.status === "available" && item.summary &&
    !item.summary.snapshot.stale && item.summary.result.missingComponents.length === 0 &&
    Number.isFinite(item.summary.bestCell.score) && item.summary.bestCell.score !== null);
  const local = available.filter((item) => "areaSlug" in item);
  const seen = new Set<string>();
  const zones = (local.length > 0 ? local : available).filter((item) => {
    const key = "areaSlug" in item ? item.areaSlug : item.regionId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (zones.length < 3) return null;

  const levels = new Map<string, number>();
  const weakPoints = new Map<ModelComponentId, number>();
  for (const zone of zones) {
    const score = zone.summary!.bestCell.score!;
    const level = score > 0 ? levelPlurals[opportunityLabel(score)] : "none";
    levels.set(level, (levels.get(level) ?? 0) + 1);
    const factor = weakestFactor(zone);
    if (factor) weakPoints.set(factor, (weakPoints.get(factor) ?? 0) + 1);
  }
  const [level, levelCount] = [...levels].sort((left, right) => right[1] - left[1])[0]!;
  const weakPoint = [...weakPoints].sort((left, right) => right[1] - left[1])[0]?.[0];
  const share = levelCount * 2 > zones.length ? "a la majoria de zones que seguim" : "a moltes de les zones que seguim";
  const state = level === "none" ? "encara no hi ha condicions favorables" : `les condicions són ${level}`;
  const phrase = weakPoint ? weakPointPhrases[weakPoint] : null;
  const holding = phrase ? `, i el que més les frena ${phrase.startsWith("les ") ? "són" : "és"} ${phrase}` : "";
  return `En conjunt, ${share} ${state}${holding}.`;
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
