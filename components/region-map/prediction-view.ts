import { SMOOTHED_PREDICTION_GRID_SIZE_M } from "@/src/lib/map-grid";
import type { SpatialGridSizeM } from "@/src/lib/types";
import type { PredictionRendering } from "./prediction-surface";

/** Switch the overview to exact cells when interactive detail is available. */
export function predictionRenderingForGrid(
  overviewRendering: PredictionRendering,
  gridSizeM: SpatialGridSizeM | undefined,
  automaticDetail = false,
): PredictionRendering {
  return automaticDetail && gridSizeM !== undefined && gridSizeM < SMOOTHED_PREDICTION_GRID_SIZE_M
    ? "cells"
    : overviewRendering;
}
