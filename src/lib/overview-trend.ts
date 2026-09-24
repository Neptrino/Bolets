import { isCellInHub, weekendOutlookBuckets, weekendOutlookHubs, WEEKEND_OUTLOOK_MIN_CELLS, type WeekendOutlookHub } from "@/src/lib/weekend-outlook";
import type { GlobalPredictionMapCell, SpatialBounds } from "@/src/lib/types";

/* The trend sentence of the Avui answer: how each massís or comarca has moved
   since the oldest day on the map slider. It reads the same 5 km combined-map
   buckets the slider shows for «Fa 3 dies» and «Avui», which the map warmer
   fills after every publication. Today's cells summarise 2.5 km sectors and
   the past frame scores a 5 km environment, so the best cells of the two are
   not comparable; the equal-area mean of a territory is (day-to-day gaps stay
   within about 1.5 points), and changes below that are reported as steady. */

export const OVERVIEW_TREND_OFFSET = -3 as const;
/** Mean change, in points out of 100, below which a territory counts as steady. */
export const OVERVIEW_TREND_MIN_CHANGE = 1.5;
/** Fewer comparable territories than this and the page does not generalise. */
export const OVERVIEW_TREND_MIN_ZONES = 5;

export interface OverviewTrendZone {
  hub: WeekendOutlookHub;
  /** Change in the territory's equal-area mean score, today minus three days ago. */
  change: number;
}

function meanScore(cells: readonly GlobalPredictionMapCell[], hub: WeekendOutlookHub) {
  const scores = cells.filter((cell) => typeof cell.score === "number" && isCellInHub(cell, hub)).map((cell) => cell.score!);
  return scores.length >= WEEKEND_OUTLOOK_MIN_CELLS ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
}

function uniqueCells(cells: readonly GlobalPredictionMapCell[]) {
  return [...new Map(cells.map((cell) => [cell.cellId, cell])).values()];
}

/** Territories scored on both days, with the change in their mean. */
export function compareOverviewTrend(
  todayCells: readonly GlobalPredictionMapCell[],
  pastCells: readonly GlobalPredictionMapCell[],
  hubs: readonly WeekendOutlookHub[] = weekendOutlookHubs(),
): OverviewTrendZone[] {
  const today = uniqueCells(todayCells);
  const past = uniqueCells(pastCells);
  return hubs.flatMap((hub) => {
    const now = meanScore(today, hub);
    const before = meanScore(past, hub);
    return now === null || before === null ? [] : [{ hub, change: now - before }];
  });
}

function places(zones: OverviewTrendZone[]) {
  const names = [...zones]
    .sort((left, right) => Math.abs(right.change) - Math.abs(left.change))
    .slice(0, 2)
    .map((zone) => zone.hub.prepositionalName);
  return new Intl.ListFormat("ca", { type: "conjunction" }).format(names);
}

/**
 * «Respecte de fa tres dies, …»: the direction most territories share, with
 * the two that moved most, or the split when no direction has a majority.
 */
export function overviewTrendSentence(zones: OverviewTrendZone[]) {
  if (zones.length < OVERVIEW_TREND_MIN_ZONES) return null;
  const up = zones.filter((zone) => zone.change >= OVERVIEW_TREND_MIN_CHANGE);
  const down = zones.filter((zone) => zone.change <= -OVERVIEW_TREND_MIN_CHANGE);
  const steady = zones.length - up.length - down.length;
  const scope = (count: number) => count === zones.length ? "a totes les zones que seguim" : "a la majoria de zones que seguim";
  const lead = "Respecte de fa tres dies,";
  if (up.length * 2 > zones.length) return `${lead} les condicions han millorat ${scope(up.length)}, sobretot ${places(up)}.`;
  if (down.length * 2 > zones.length) return `${lead} les condicions han empitjorat ${scope(down.length)}, sobretot ${places(down)}.`;
  const moves = [
    ...(up.length ? [`han millorat ${places(up)}`] : []),
    ...(down.length ? [`han empitjorat ${places(down)}`] : []),
  ].join(", però ");
  if (steady * 2 > zones.length) return `${lead} les condicions es mantenen semblants ${scope(steady)}${moves ? `; ${moves}` : ""}.`;
  return `${lead} les condicions ${moves}.`;
}

export type OverviewTrendFrameLoader = (bounds: SpatialBounds) => Promise<{ cells: GlobalPredictionMapCell[]; truncated: boolean }>;

/**
 * Reads both days over every Catalonia bucket with bounded concurrency. Any
 * failed or truncated bucket withholds the sentence: a trend computed on part
 * of a territory could point the wrong way.
 */
export async function loadOverviewTrend(
  loadToday: OverviewTrendFrameLoader,
  loadPast: OverviewTrendFrameLoader,
  options: { hubs?: readonly WeekendOutlookHub[]; concurrency?: number } = {},
) {
  const buckets = weekendOutlookBuckets();
  const today: GlobalPredictionMapCell[] = [];
  const past: GlobalPredictionMapCell[] = [];
  let complete = true;
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(options.concurrency ?? 4, buckets.length) }, async () => {
    while (complete && next < buckets.length) {
      const bucket = buckets[next++]!;
      try {
        const [now, before] = await Promise.all([loadToday(bucket), loadPast(bucket)]);
        if (now.truncated || before.truncated) complete = false;
        today.push(...now.cells);
        past.push(...before.cells);
      } catch {
        complete = false;
      }
    }
  }));
  return complete ? overviewTrendSentence(compareOverviewTrend(today, past, options.hubs)) : null;
}
