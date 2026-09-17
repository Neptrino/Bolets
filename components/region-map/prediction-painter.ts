import type { RegionMapAdapter } from "./map-adapter";
import type { PredictionMapCell, SpatialBounds } from "@/src/lib/types";
import { preparePredictionHeatRaster, type PredictionHeatRaster } from "./prediction-raster";
import { createRasterWorkerClient } from "./raster-worker-client";
import { drawPredictionSurface, type PredictionRendering } from "./prediction-surface";
import { predictionRenderingForGrid } from "./prediction-view";
import { drawTerritorialWindow, prepareCanvas, withCataloniaLandClip } from "./support";
import { createViewportGesture } from "./viewport-gesture";

/** Let the frame that follows a gesture or click be presented before heavier work. */
const yieldToInput = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function samePredictionCells(left: ReadonlyMap<string, PredictionMapCell>, right: ReadonlyMap<string, PredictionMapCell>) {
  if (left === right) return true;
  if (left.size !== right.size) return false;
  const other = right.entries();
  for (const [id, cell] of left) {
    const entry = other.next().value;
    if (entry?.[0] !== id || entry[1] !== cell) return false;
  }
  return true;
}

export function createPredictionPainter({ map, canvas, cells, selectedCellId, rendering, interactive, territory }: {
  map: RegionMapAdapter;
  canvas: () => HTMLCanvasElement | null;
  cells: () => ReadonlyMap<string, PredictionMapCell>;
  selectedCellId: () => string | null;
  rendering: PredictionRendering;
  interactive: boolean;
  territory: () => SpatialBounds | undefined;
}) {
  const worker = createRasterWorkerClient();
  const gesture = createViewportGesture({ map, canvases: () => [canvas()], repaint: () => { draw(); } });
  let sequence = 0;
  let disposed = false;
  let carriedCells: ReadonlyMap<string, PredictionMapCell> | undefined;
  let lastPaint: { cells: ReadonlyMap<string, PredictionMapCell>; raster: PredictionHeatRaster;
    origin: { x: number; y: number }; zoom: number } | undefined;
  let cached: {
    cells: ReadonlyMap<string, PredictionMapCell>;
    view: string;
    result: Promise<PredictionHeatRaster | null | undefined>;
  } | undefined;

  const paintFrame = async () => {
    const output = canvas();
    if (!output || disposed) return;
    const currentCells = cells();
    // A pan or pinch in progress carries the last frame of this same cell
    // snapshot; a replaced snapshot (species change, new buckets) paints.
    if (carriedCells === currentCells && gesture.transform()) return;
    const id = ++sequence;
    const display = predictionRenderingForGrid(rendering, currentCells.values().next().value?.gridSizeM, interactive);
    const paint = (raster?: PredictionHeatRaster | null) => {
      const context = prepareCanvas(output, currentCells.size === 0 && !territory());
      if (!context) return;
      withCataloniaLandClip(context, map, () => {
        drawPredictionSurface({ cells: currentCells.values(), context, localMap: map, output,
          rendering: display, selectedCellId: selectedCellId(), raster });
      });
      drawTerritorialWindow(context, map, territory());
      carriedCells = currentCells;
      gesture.painted();
    };
    let raster: PredictionHeatRaster | null | undefined;
    if (display === "heatmap") {
      const width = Math.round(output.clientWidth), height = Math.round(output.clientHeight);
      if (width < 1 || height < 1) return;
      const centre = map.getCenter(), padding = map.getPadding();
      const view = [width, height, centre.lng, centre.lat, map.getZoom(), map.getBearing(), map.getPitch(),
        padding.top, padding.right, padding.bottom, padding.left].join(":");
      // Cell maps are immutable snapshots replaced by bucket/species/day changes.
      // Picking a cell or receiving another unchanged paint reuses its raster.
      if (!cached || !samePredictionCells(cached.cells, currentCells) || cached.view !== view) {
        // Keep the existing geographic field attached to the ground during
        // north-up pan/zoom gestures while the worker refines the new viewport.
        if (lastPaint && lastPaint.cells === currentCells && map.getBearing() === 0 && map.getPitch() === 0) {
          const origin = map.project([0, 0]), factor = 2 ** (map.getZoom() - lastPaint.zoom);
          paint({ ...lastPaint.raster,
            left: origin.x + (lastPaint.raster.left - lastPaint.origin.x) * factor,
            top: origin.y + (lastPaint.raster.top - lastPaint.origin.y) * factor,
            scale: lastPaint.raster.scale * factor });
          // The carried frame is on screen; projecting every cell for the
          // worker can wait until the interaction's frame has been presented.
          await yieldToInput();
          if (disposed || id !== sequence) return;
        }
        const prepared = preparePredictionHeatRaster(map, currentCells.values(), width, height);
        cached = { cells: currentCells, view, result: prepared ? worker.render(prepared) : Promise.resolve(null) };
      }
      raster = await cached.result;
      if (disposed || id !== sequence || raster === undefined) return;
      lastPaint = raster && map.getBearing() === 0 && map.getPitch() === 0
        ? { cells: currentCells, raster, origin: map.project([0, 0]), zoom: map.getZoom() } : undefined;
    }
    paint(raster);
  };
  let latest = Promise.resolve();
  const draw = () => (latest = paintFrame());
  return Object.assign(draw, {
    async settled() {
      let observed;
      do { observed = latest; await observed; } while (observed !== latest);
    },
    dispose() {
      disposed = true; sequence++; cached = undefined; lastPaint = undefined;
      gesture.dispose(); worker.dispose();
    },
  });
}
