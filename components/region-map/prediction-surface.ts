import type { Map as MapLibreMap } from "maplibre-gl";
import {
  predictionHeatmapColour,
  predictionMapCellColour,
} from "@/src/lib/suitability-scale";
import type { PredictionMapCell } from "@/src/lib/types";
import {
  fullSupportWeight,
  rasterizeSmoothedField,
  smoothingSigmaMetres,
  type FieldSample,
} from "./smoothed-field";
import { projectSmoothedCell, smoothedViewportRaster } from "./smoothed-viewport";

export type PredictionRendering = "cells" | "heatmap";

const heatCanvases = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

function heatCanvasFor(output: HTMLCanvasElement, width: number, height: number) {
  let heatCanvas = heatCanvases.get(output);
  if (!heatCanvas) {
    heatCanvas = document.createElement("canvas");
    heatCanvases.set(output, heatCanvas);
  }
  if (heatCanvas.width !== width || heatCanvas.height !== height) {
    heatCanvas.width = width;
    heatCanvas.height = height;
  }
  return heatCanvas;
}

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

function cellScreenBounds(localMap: MapLibreMap, cell: PredictionMapCell) {
  const [[west, south], [east, north]] = cell.cellBounds;
  const topLeft = localMap.project([west, north]);
  const bottomRight = localMap.project([east, south]);
  return {
    height: Math.max(bottomRight.y - topLeft.y, 1),
    left: topLeft.x,
    top: topLeft.y,
    width: Math.max(bottomRight.x - topLeft.x, 1),
  };
}

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

function coverageAlpha(cell: PredictionMapCell) {
  if (cell.score === null || cell.score === 0) return 1;
  const coverage = cell.habitatCoverage;
  if (coverage === null || !Number.isFinite(coverage)) return COVERAGE_ALPHA_FLOOR;
  const { fadeOut, fullPaint } = COVERAGE_RAMP;
  if (coverage >= fullPaint) return 1;
  if (coverage <= fadeOut) return COVERAGE_ALPHA_FLOOR;
  return COVERAGE_ALPHA_FLOOR + (1 - COVERAGE_ALPHA_FLOOR) *
    (coverage - fadeOut) / (fullPaint - fadeOut);
}

function drawCellGrid(
  context: CanvasRenderingContext2D,
  localMap: MapLibreMap,
  cells: Iterable<PredictionMapCell>,
  selectedCellId: string | null,
) {
  for (const cell of cells) {
    const { height, left, top, width } = cellScreenBounds(localMap, cell);
    const selected = cell.cellId === selectedCellId;
    context.save();
    // Selection is carried by the outline alone; the fill keeps its coverage
    // fade so a picked cell doesn't pop out of the terrain as a solid block.
    context.globalAlpha = coverageAlpha(cell);
    context.fillStyle = predictionMapCellColour(cell.score);
    context.fillRect(left, top, width, height);
    context.globalAlpha = selected ? 1 : coverageAlpha(cell);
    context.strokeStyle = selected
      ? "#3b3b3b"
      : cell.score === 0
        ? "rgba(92, 87, 78, 0.58)"
        : "rgba(242, 235, 213, 0.78)";
    context.lineWidth = selected ? 2.5 : 0.65;
    context.setLineDash(cell.score === 0 && !selected ? [3, 3] : []);
    context.strokeRect(left, top, width, height);
    context.setLineDash([]);
    context.restore();
  }
}

function drawHeatmap(
  context: CanvasRenderingContext2D,
  output: HTMLCanvasElement,
  localMap: MapLibreMap,
  cells: Iterable<PredictionMapCell>,
  selectedCellId: string | null,
) {
  const width = Math.round(output.clientWidth);
  const height = Math.round(output.clientHeight);
  if (width < 1 || height < 1) return;

  const projected: Array<ReturnType<typeof projectSmoothedCell> & { cell: PredictionMapCell }> = [];
  let selectedCell: PredictionMapCell | undefined;
  for (const cell of cells) {
    if (cell.cellId === selectedCellId) selectedCell = cell;
    // Withheld readings carry no value; verified zeros do, and pull the
    // surface down to nothing at the edge of suitable ground.
    if (cell.score === null) continue;
    projected.push({ cell, ...projectSmoothedCell(localMap, cell) });
  }
  if (projected.length) {
    const gridSizeM = projected[0].cell.gridSizeM;
    const raster = smoothedViewportRaster(localMap, width, height, gridSizeM);
    const { scale, width: rasterWidth, height: rasterHeight } = raster;
    const samples: FieldSample[] = projected.map(({ cell, x, y, sigma }) => ({
      x: (x - raster.left) / scale,
      y: (y - raster.top) / scale,
      sigma: sigma / scale,
      score: cell.score ?? 0,
      alpha: coverageAlpha(cell),
    }));
    const field = rasterizeSmoothedField(
      samples,
      rasterWidth,
      rasterHeight,
      // The sigma/spacing ratio is geographic, independent of the first
      // bucket's position or a clipped border cell's bounding box.
      fullSupportWeight(smoothingSigmaMetres(gridSizeM), gridSizeM),
    );

    const heatCanvas = heatCanvasFor(output, rasterWidth, rasterHeight);
    const heatContext = heatCanvas.getContext("2d");
    if (!heatContext) return;
    const image = heatContext.createImageData(rasterWidth, rasterHeight);
    const colours = heatColours();
    const pixels = image.data;
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
    heatContext.putImageData(image, 0, 0);

    context.save();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(heatCanvas, raster.left, raster.top, rasterWidth * scale, rasterHeight * scale);
    context.restore();
  }

  if (selectedCell) {
    const { height: cellHeight, left, top, width: cellWidth } = cellScreenBounds(localMap, selectedCell);
    context.strokeStyle = "rgba(47, 55, 46, 0.9)";
    context.lineWidth = 2;
    context.strokeRect(left, top, cellWidth, cellHeight);
  }
}

export function drawPredictionSurface({
  cells,
  context,
  localMap,
  output,
  rendering,
  selectedCellId,
}: {
  cells: Iterable<PredictionMapCell>;
  context: CanvasRenderingContext2D;
  localMap: MapLibreMap;
  output: HTMLCanvasElement;
  rendering: PredictionRendering;
  selectedCellId: string | null;
}) {
  if (rendering === "heatmap") {
    drawHeatmap(context, output, localMap, cells, selectedCellId);
    return;
  }
  drawCellGrid(context, localMap, cells, selectedCellId);
}
