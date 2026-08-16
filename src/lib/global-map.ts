import type { SpatialGridSizeM } from "@/src/lib/types";

// Client-safe constants for the combined all-species map. The scoring library
// lives in src/lib/global-predictions.ts; the map client must not pull the
// species catalogue or server fetch paths into its bundle for these values.
export const GLOBAL_SPECIES_ID = "all";

/** Coarse-only: the all-species habitat cache does not exist at 250 m. */
export type GlobalGridSizeM = Exclude<SpatialGridSizeM, 250>;
export const GLOBAL_MINIMUM_GRID_SIZE_M = 1000;

export function isGlobalGridSize(value: number): value is GlobalGridSizeM {
  return value === 1000 || value === 2500 || value === 5000 || value === 10000;
}
