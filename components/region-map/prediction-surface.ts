import type { Map as MapLibreMap } from "maplibre-gl";
import {
  predictionMapCellColour,
} from "@/src/lib/suitability-scale";
import type { PredictionMapCell } from "@/src/lib/types";
import { coverageAlpha, predictionHeatRaster, type PredictionHeatRaster } from "./prediction-raster";

export type PredictionRendering = "cells" | "heatmap";

const heatCanvases = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
const paintedRasters = new WeakMap<HTMLCanvasElement, Uint8ClampedArray>();

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
  preparedRaster?: PredictionHeatRaster | null,
) {
  const width = Math.round(output.clientWidth);
  const height = Math.round(output.clientHeight);
  if (width < 1 || height < 1) return;

  const allCells = Array.from(cells);
  const selectedCell = allCells.find(cell => cell.cellId === selectedCellId);
  const raster = preparedRaster === undefined ? predictionHeatRaster(localMap, allCells, width, height) : preparedRaster;
  if (raster) {
    const { scale, width: rasterWidth, height: rasterHeight } = raster;
    const heatCanvas = heatCanvasFor(output, rasterWidth, rasterHeight);
    const heatContext = heatCanvas.getContext("2d");
    if (!heatContext) return;
    if (paintedRasters.get(output) !== raster.pixels) {
      const image = heatContext.createImageData(rasterWidth, rasterHeight);
      image.data.set(raster.pixels);
      heatContext.putImageData(image, 0, 0);
      paintedRasters.set(output, raster.pixels);
    }

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
  raster,
}: {
  cells: Iterable<PredictionMapCell>;
  context: CanvasRenderingContext2D;
  localMap: MapLibreMap;
  output: HTMLCanvasElement;
  rendering: PredictionRendering;
  selectedCellId: string | null;
  raster?: PredictionHeatRaster | null;
}) {
  if (rendering === "heatmap") {
    drawHeatmap(context, output, localMap, cells, selectedCellId, raster);
    return;
  }
  drawCellGrid(context, localMap, cells, selectedCellId);
}
