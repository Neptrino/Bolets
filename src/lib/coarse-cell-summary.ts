import { bucketsForBounds } from "@/src/lib/map-query";
import type { CoordinateBounds, SpatialBounds, SpatialGridSizeM } from "@/src/lib/types";

/**
 * Coarse display grids whose reading is the best 2.5 km sector inside each
 * cell rather than a score of a blended coarse environment. Blending lets one
 * cold corner's frost or one dry valley's rain speak for a whole square, so
 * the overview disagreed with the zoomed-in map by tens of points and the
 * surface re-scored at every grid step. The 2.5 km reads are the same cached
 * buckets the zoomed-in map uses, so the overview becomes a summary of that
 * map instead of a second opinion. Geometry, habitat coverage and identity
 * stay those of the coarse cell; the chosen sector travels alongside.
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
