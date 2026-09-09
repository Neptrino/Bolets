import { bucketsForBounds } from "@/src/lib/map-query";
import type { CoordinateBounds, SpatialBounds, SpatialGridSizeM } from "@/src/lib/types";

/**
 * Coarse display grids whose reading summarises the 2.5 km sectors inside
 * each cell rather than scoring a blended coarse environment. Blending lets
 * one cold corner's frost or one dry valley's rain speak for a whole square,
 * so the overview disagreed with the zoomed-in map by tens of points and the
 * surface re-scored at every grid step. The 2.5 km reads are the same cached
 * buckets the zoomed-in map uses, so the overview becomes a summary of that
 * map instead of a second opinion.
 *
 * The colour is the habitat-coverage-weighted mean of the children's scores:
 * this avoids spreading a best child's score across the whole coarse cell
 * (taking the best child max-pooled sixteen 10 km children and then spread
 * that maximum over the square). Bare children carry little weight, so rock
 * and town do not drag forested ground down. The detail reading is the best
 * child's, named as such, so a click still shows where inside the square the
 * conditions come from. Geometry, habitat extent and identity stay coarse.
 * This does not preserve the spatial opacity field; smoothing uses a fixed
 * source grid instead of interpolating these summaries across zoom levels.
 */
export type SummarisedGridSizeM = 5000 | 10000;
export const COARSE_SUMMARY_CHILD_GRID_M = 2500 satisfies SpatialGridSizeM;

export function summarisesChildren(gridSizeM: number): gridSizeM is SummarisedGridSizeM {
  return gridSizeM === 5000 || gridSizeM === 10000;
}

/** The canonical 2.5 km buckets whose cells can fall inside a coarse read. */
export function coarseChildBuckets(bounds: SpatialBounds, clamp: SpatialBounds) {
  return bucketsForBounds(bounds, COARSE_SUMMARY_CHILD_GRID_M, clamp);
}

/**
 * Parent id on the coarse grid for a child such as `epsg25831:2500:158:1873`.
 * Grid indices count cells from a shared origin, so the parent index is the
 * integer division of the child index by the size ratio.
 */
export function coarseParentCellId(childCellId: string, parentGridSizeM: SummarisedGridSizeM) {
  const [crs, grid, column, row] = childCellId.split(":");
  const childGridSizeM = Number(grid);
  const columnIndex = Number(column);
  const rowIndex = Number(row);
  if (
    !crs || !Number.isInteger(childGridSizeM) || childGridSizeM <= 0
    || !Number.isInteger(columnIndex) || !Number.isInteger(rowIndex)
  ) return null;
  const factor = parentGridSizeM / childGridSizeM;
  if (!Number.isInteger(factor) || factor < 1) return null;
  return `${crs}:${parentGridSizeM}:${Math.floor(columnIndex / factor)}:${Math.floor(rowIndex / factor)}`;
}

export type ScoredChildCell = { cellId: string; score: number | null };

/** Best scored child per parent; ties resolve to the lowest id so the pick is stable. */
export function bestChildrenByParent<T extends ScoredChildCell>(
  children: Iterable<T>,
  parentGridSizeM: SummarisedGridSizeM,
) {
  const best = new Map<string, T>();
  for (const child of children) {
    if (child.score === null) continue;
    const parentId = coarseParentCellId(child.cellId, parentGridSizeM);
    if (!parentId) continue;
    const current = best.get(parentId);
    if (
      !current
      || child.score > (current.score as number)
      || (child.score === current.score && child.cellId < current.cellId)
    ) best.set(parentId, child);
  }
  return best;
}

export type CoverageScoredChildCell = ScoredChildCell & { habitatCoverage: number | null };

/**
 * Coverage-weighted mean of the children's scores, rounded to the map's
 * integer scale. Children without a coverage reading share the mean weight
 * of those that have one; with no coverage at all the plain mean applies.
 */
export function coverageWeightedScore(children: Iterable<CoverageScoredChildCell>) {
  const scored = [...children].filter((child) => child.score !== null);
  if (!scored.length) return null;
  const coverages = scored
    .map((child) => child.habitatCoverage)
    .filter((coverage): coverage is number => coverage !== null && Number.isFinite(coverage));
  const fallbackWeight = coverages.length
    ? coverages.reduce((total, coverage) => total + coverage, 0) / coverages.length
    : 1;
  let weightedTotal = 0;
  let totalWeight = 0;
  for (const child of scored) {
    const weight = child.habitatCoverage !== null && Number.isFinite(child.habitatCoverage)
      ? child.habitatCoverage
      : fallbackWeight;
    weightedTotal += weight * (child.score as number);
    totalWeight += weight;
  }
  if (totalWeight <= 0) {
    return Math.round(scored.reduce((total, child) => total + (child.score as number), 0) / scored.length);
  }
  return Math.round(weightedTotal / totalWeight);
}

export type CoarseChildSummary<T> = { best: T; score: number };

/** Per parent: the best child (for detail) and the coverage-weighted mean (for colour). */
export function summariseChildrenByParent<T extends CoverageScoredChildCell>(
  children: Iterable<T>,
  parentGridSizeM: SummarisedGridSizeM,
) {
  const grouped = new Map<string, T[]>();
  for (const child of children) {
    if (child.score === null) continue;
    const parentId = coarseParentCellId(child.cellId, parentGridSizeM);
    if (!parentId) continue;
    const siblings = grouped.get(parentId) ?? [];
    siblings.push(child);
    grouped.set(parentId, siblings);
  }
  const summaries = new Map<string, CoarseChildSummary<T>>();
  for (const [parentId, siblings] of grouped) {
    const best = bestChildrenByParent(siblings, parentGridSizeM).get(parentId);
    const score = coverageWeightedScore(siblings);
    if (best && score !== null) summaries.set(parentId, { best, score });
  }
  return summaries;
}

export type CoarseSummarySource = {
  cellId: string;
  gridSizeM: SpatialGridSizeM;
  cellBounds: CoordinateBounds;
};

export function bucketContaining(buckets: SpatialBounds[], cellBounds: CoordinateBounds) {
  const [[west, south], [east, north]] = cellBounds;
  const longitude = (west + east) / 2;
  const latitude = (south + north) / 2;
  return buckets.find((bucket) =>
    longitude >= bucket.west && longitude <= bucket.east
    && latitude >= bucket.south && latitude <= bucket.north);
}
