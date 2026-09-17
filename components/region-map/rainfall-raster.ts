import { RAINFALL_CEILING_MM, RAINFALL_DRY_THRESHOLD_MM, rainfallColour } from "@/src/lib/rainfall-scale";
import type { CoordinateBounds, SpatialGridSizeM } from "@/src/lib/types";
import { fullSupportWeight, rasterizeSmoothedField, smoothingSigmaMetres, type FieldSample } from "./smoothed-field";
import { projectSmoothedCell, smoothedViewportRaster, type MapProjection } from "./smoothed-viewport";

/**
 * Accumulated rain painted with the same smoothing the prediction surface
 * uses, so both maps of a given day describe the same ground at the same
 * spacing. Rain falls on every cell, so unlike the prediction there is no
 * habitat weight: the only fade is at the dry end, where the terrain has to
 * stay readable.
 */

export type RainfallMapCell = {
  cellId: string;
  gridSizeM: SpatialGridSizeM;
  cellBounds: CoordinateBounds;
  /** Accumulated rainfall in millimetres, or null when the reading is withheld. */
  rainfallMm: number | null;
};

/** One colour per whole millimetre, so the per-pixel loop parses nothing. */
let rainColourTable: Uint8ClampedArray | null = null;

function rainColours() {
  if (rainColourTable) return rainColourTable;
  const table = new Uint8ClampedArray((RAINFALL_CEILING_MM + 1) * 4);
  for (let millimetres = 0; millimetres <= RAINFALL_CEILING_MM; millimetres += 1) {
    const { red, green, blue } = rainfallColour(millimetres);
    table[millimetres * 4] = red;
    table[millimetres * 4 + 1] = green;
    table[millimetres * 4 + 2] = blue;
  }
  rainColourTable = table;
  return table;
}

/** Keeps the painted surface opaque enough to read over the grey basemap. */
const RAIN_PAINT_ALPHA = 0.82;

export function prepareRainfallRaster(
  localMap: MapProjection,
  cells: Iterable<RainfallMapCell>,
  width: number,
  height: number,
) {
  const projected: Array<{ cell: RainfallMapCell } & ReturnType<typeof projectSmoothedCell>> = [];
  for (const cell of cells) {
    // A withheld reading carries no value. A measured zero does, and pulls
    // the surface down to dry ground at the edge of a rain band.
    if (cell.rainfallMm === null) continue;
    projected.push({ cell, ...projectSmoothedCell(localMap, cell) });
  }
  if (!projected.length) return null;

  const gridSizeM = projected[0].cell.gridSizeM;
  const raster = smoothedViewportRaster(localMap, width, height, gridSizeM);
  const { scale } = raster;
  const samples: FieldSample[] = projected.map(({ cell, x, y, sigma }) => ({
    x: (x - raster.left) / scale,
    y: (y - raster.top) / scale,
    sigma: sigma / scale,
    score: Math.min(RAINFALL_CEILING_MM, Math.max(0, cell.rainfallMm ?? 0)),
    alpha: 1,
  }));
  return { raster, samples, supportWeight: fullSupportWeight(smoothingSigmaMetres(gridSizeM), gridSizeM) };
}

export type PreparedRainfallRaster = NonNullable<ReturnType<typeof prepareRainfallRaster>>;

export function rasterizePreparedRainfallRaster({ raster, samples, supportWeight }: PreparedRainfallRaster) {
  const { width: rasterWidth, height: rasterHeight } = raster;
  const field = rasterizeSmoothedField(samples, rasterWidth, rasterHeight, supportWeight);
  const colours = rainColours();
  const pixels = new Uint8ClampedArray(rasterWidth * rasterHeight * 4);

  for (let index = 0; index < field.score.length; index += 1) {
    const millimetres = field.score[index];
    // Dry ground fades out instead of ending in a flat pale rim, so the
    // terrain underneath stays visible where no rain was measured.
    const dryFade = Math.min(1, millimetres / RAINFALL_DRY_THRESHOLD_MM);
    const alpha = field.alpha[index] * dryFade * RAIN_PAINT_ALPHA;
    if (alpha <= 0.004) continue;
    const colour = Math.min(RAINFALL_CEILING_MM, Math.max(0, Math.round(millimetres))) * 4;
    const offset = index * 4;
    pixels[offset] = colours[colour];
    pixels[offset + 1] = colours[colour + 1];
    pixels[offset + 2] = colours[colour + 2];
    pixels[offset + 3] = Math.round(255 * alpha);
  }
  return { ...raster, pixels };
}

export function rainfallRaster(
  localMap: MapProjection,
  cells: Iterable<RainfallMapCell>,
  width: number,
  height: number,
) {
  const prepared = prepareRainfallRaster(localMap, cells, width, height);
  return prepared ? rasterizePreparedRainfallRaster(prepared) : null;
}
