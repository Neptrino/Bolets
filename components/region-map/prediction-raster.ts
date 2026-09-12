import { predictionHeatmapColour } from "@/src/lib/suitability-scale";
import type { PredictionMapCell } from "@/src/lib/types";
import { fullSupportWeight, rasterizeSmoothedField, smoothingSigmaMetres, type FieldSample } from "./smoothed-field";
import { projectSmoothedCell, smoothedViewportRaster, type MapProjection } from "./smoothed-viewport";

/**
 * The heat colour scale is sampled once per integer score so the per-pixel
 * loop never parses a colour string.
 */
let heatColourTable: Uint8ClampedArray | null = null;

function heatColours() {
  if (heatColourTable) return heatColourTable;
  const table = new Uint8ClampedArray(101 * 4);
  for (let score = 0; score <= 100; score += 1) {
    const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
      .exec(predictionHeatmapColour(Math.max(score, 1)));
    if (!match) continue;
    table[score * 4] = Number(match[1]);
    table[score * 4 + 1] = Number(match[2]);
    table[score * 4 + 2] = Number(match[3]);
    table[score * 4 + 3] = Math.round(Number(match[4] ?? 1) * 255);
  }
  heatColourTable = table;
  return table;
}

/**
 * Interpolated scores glide through zero at the edge of suitable ground, so
 * the surface fades out across the lowest few points instead of ending in a
 * hard rim of the "very low" colour.
 */
const LOW_SCORE_FADE = 4;

/**
 * Habitat coverage weights the paint so cells that are mostly rock, fields or
 * town fade toward the terrain while dense habitat paints more strongly.
 * Missing coverage must not imply full coverage. Zero and withheld cells
 * keep their own faint styling and outlines.
 */
const COVERAGE_ALPHA_FLOOR = 0.06;

/**
 * Both modes use the established smoothed coverage fade. The same coverage
 * carries the same paint weight at every resolution and in either mode.
 * The fixed smoothed source keeps those inputs stable while zooming.
 */
const COVERAGE_RAMP = { fadeOut: 0.04, fullPaint: 0.45 };

export function coverageAlpha(cell: PredictionMapCell) {
  if (cell.score === null || cell.score === 0) return 1;
  const coverage = cell.habitatCoverage;
  if (coverage === null || !Number.isFinite(coverage)) return COVERAGE_ALPHA_FLOOR;
  const { fadeOut, fullPaint } = COVERAGE_RAMP;
  if (coverage >= fullPaint) return 1;
  if (coverage <= fadeOut) return COVERAGE_ALPHA_FLOOR;
  return COVERAGE_ALPHA_FLOOR + (1 - COVERAGE_ALPHA_FLOOR) *
    (coverage - fadeOut) / (fullPaint - fadeOut);
}

/** Shared Avui/interactive/social raster; no DOM or image-library dependency. */
export function preparePredictionHeatRaster(
  localMap: MapProjection,
  cells: Iterable<PredictionMapCell>,
  width: number,
  height: number,
) {
  const projected: Array<ReturnType<typeof projectSmoothedCell> & { cell: PredictionMapCell }> = [];
  for (const cell of cells) {
    // Withheld readings carry no value; verified zeros do, and pull the
    // surface down to nothing at the edge of suitable ground.
    if (cell.score === null) continue;
    projected.push({ cell, ...projectSmoothedCell(localMap, cell) });
  }
  if (projected.length) {
    const gridSizeM = projected[0].cell.gridSizeM;
    const raster = smoothedViewportRaster(localMap, width, height, gridSizeM);
    const { scale } = raster;
    const samples: FieldSample[] = projected.map(({ cell, x, y, sigma }) => ({
      x: (x - raster.left) / scale,
      y: (y - raster.top) / scale,
      sigma: sigma / scale,
      score: cell.score ?? 0,
      alpha: coverageAlpha(cell),
    }));
    return { raster, samples, supportWeight: fullSupportWeight(smoothingSigmaMetres(gridSizeM), gridSizeM) };
  }
  return null;
}

export type PreparedHeatRaster = NonNullable<ReturnType<typeof preparePredictionHeatRaster>>;
export type PredictionHeatRaster = ReturnType<typeof rasterizePreparedHeatRaster>;

/** The worker and signed server maps share this exact pixel calculation. */
export function rasterizePreparedHeatRaster({ raster, samples, supportWeight }: PreparedHeatRaster) {
  const { width: rasterWidth, height: rasterHeight } = raster;
  const field = rasterizeSmoothedField(samples, rasterWidth, rasterHeight, supportWeight);

  const colours = heatColours();
  const pixels = new Uint8ClampedArray(rasterWidth * rasterHeight * 4);
  for (let index = 0; index < field.score.length; index += 1) {
    const score = field.score[index];
    const alpha = field.alpha[index] * Math.min(1, score / LOW_SCORE_FADE);
    if (alpha <= 0.003) continue;
    const colour = Math.min(100, Math.max(0, Math.round(score))) * 4;
    const offset = index * 4;
    pixels[offset] = colours[colour];
    pixels[offset + 1] = colours[colour + 1];
    pixels[offset + 2] = colours[colour + 2];
    pixels[offset + 3] = Math.round(colours[colour + 3] * alpha);
  }
  return { ...raster, pixels };
}

export function predictionHeatRaster(localMap: MapProjection, cells: Iterable<PredictionMapCell>, width: number, height: number) {
  const prepared = preparePredictionHeatRaster(localMap, cells, width, height);
  return prepared ? rasterizePreparedHeatRaster(prepared) : null;
}
