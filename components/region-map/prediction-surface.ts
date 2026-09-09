import type { Map as MapLibreMap } from "maplibre-gl";
import {
  predictionHeatmapColour,
  predictionMapCellColour,
} from "@/src/lib/suitability-scale";
import type { PredictionMapCell } from "@/src/lib/types";

export type PredictionRendering = "cells" | "heatmap";

const heatCanvases = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

export function heatmapBlurRadius(representativeCellSize: number) {
  return Math.max(5, Math.min(18, representativeCellSize * 0.2));
}

function heatCanvasFor(output: HTMLCanvasElement) {
  let heatCanvas = heatCanvases.get(output);
  if (!heatCanvas) {
    heatCanvas = document.createElement("canvas");
    heatCanvases.set(output, heatCanvas);
  }
  const width = Math.max(Math.round(output.clientWidth), 1);
  const height = Math.max(Math.round(output.clientHeight), 1);
  if (heatCanvas.width !== width || heatCanvas.height !== height) {
    heatCanvas.width = width;
    heatCanvas.height = height;
  }
  return heatCanvas;
}

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
 * town fade toward the terrain while dense forest saturates. Three-quarters
 * forest already fills a searcher's day, so it paints at full strength; under
 * a tenth there is barely anywhere to look, so those cells nearly vanish while
 * staying selectable. Zero and withheld cells keep their own faint styling.
 */
const COVERAGE_ALPHA_FLOOR = 0.06;

/**
 * Coarse cells dilute forest fraction over huge areas — a 10 km sector that
 * is 30% forest still holds tens of square kilometres of woods — so the ramp
 * anchors shrink with grid size to keep overview zooms readable while fine
 * grids keep the full-contrast thresholds.
 */
function coverageRamp(gridSizeM: number): { fadeOut: number; fullPaint: number } {
  if (gridSizeM >= 10_000) return { fadeOut: 0.02, fullPaint: 0.3 };
  if (gridSizeM >= 5_000) return { fadeOut: 0.03, fullPaint: 0.4 };
  if (gridSizeM >= 2_500) return { fadeOut: 0.05, fullPaint: 0.55 };
  return { fadeOut: 0.1, fullPaint: 0.75 };
}

function coverageAlpha(cell: PredictionMapCell) {
  if (cell.score === null || cell.score === 0) return 1;
  const coverage = cell.habitatCoverage;
  if (coverage === null || !Number.isFinite(coverage)) return 1;
  const { fadeOut, fullPaint } = coverageRamp(cell.gridSizeM);
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
    context.globalAlpha = selected ? 1 : coverageAlpha(cell);
    context.fillStyle = predictionMapCellColour(cell.score);
    context.fillRect(left, top, width, height);
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
  const heatCanvas = heatCanvasFor(output);
  const heatContext = heatCanvas.getContext("2d");
  if (!heatContext) return;
  heatContext.clearRect(0, 0, heatCanvas.width, heatCanvas.height);

  const dimensions: number[] = [];
  let selectedCell: PredictionMapCell | undefined;
  for (const cell of cells) {
    if (cell.cellId === selectedCellId) selectedCell = cell;
    if (cell.score === null || cell.score <= 0) continue;
    const { height, left, top, width } = cellScreenBounds(localMap, cell);
    const padding = Math.max(Math.min(width, height) * 0.05, 0.75);
    heatContext.globalAlpha = coverageAlpha(cell);
    heatContext.fillStyle = predictionHeatmapColour(cell.score);
    heatContext.fillRect(
      left - padding,
      top - padding,
      width + padding * 2,
      height + padding * 2,
    );
    if (dimensions.length < 24) dimensions.push(Math.max(width, height));
  }

  const representativeSize = dimensions.length
    ? dimensions.reduce((total, size) => total + size, 0) / dimensions.length
    : 18;
  const blurRadius = heatmapBlurRadius(representativeSize);
  context.save();
  context.globalAlpha = 0.94;
  context.filter = `blur(${blurRadius}px) saturate(1.08)`;
  context.drawImage(
    heatCanvas,
    0,
    0,
    output.clientWidth,
    output.clientHeight,
  );
  context.restore();

  if (selectedCell) {
    const { height, left, top, width } = cellScreenBounds(localMap, selectedCell);
    context.strokeStyle = "rgba(47, 55, 46, 0.9)";
    context.lineWidth = 2;
    context.strokeRect(left, top, width, height);
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
