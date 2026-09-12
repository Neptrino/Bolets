/**
 * Gaussian-kernel interpolation of prediction cells onto a small raster.
 *
 * Each cell contributes its score around its centre with a bell of a fixed
 * ground width, and every raster pixel reads the weight-normalised mean of
 * the cells that reach it. Between neighbouring cells the surface therefore
 * glides from one value to the next instead of showing block edges softened
 * by a blur, and because the bell is a ground distance rather than a cell
 * fraction, zooming a fixed source grid changes only its size on screen.
 * Beyond the sampled ground the accumulated weight thins and the surface
 * fades out, so the map never paints confidence
 * where there are no cells.
 *
 * The module is pure so the kernel can be tested without a canvas.
 */

export type FieldSample = {
  /** Sample centre in raster pixels. */
  x: number;
  y: number;
  /** Kernel standard deviation in raster pixels. */
  sigma: number;
  /** Value carried by the cell (0-100). */
  score: number;
  /** Paint weight the cell carries, e.g. its habitat-coverage alpha (0-1). */
  alpha: number;
};

export type SmoothedField = {
  width: number;
  height: number;
  /** Weight-normalised score per pixel; 0 where nothing reaches. */
  score: Float32Array;
  /** Weight-normalised alpha per pixel, scaled down where support is thin. */
  alpha: Float32Array;
};

/**
 * Kernel standard deviation on the ground. A fixed width keeps the surface
 * equally smooth at every grid; it only widens for cells coarser than twice
 * this, where a narrower bell would show the lattice between cell centres.
 */
export const SMOOTHING_SIGMA_M = 1750;
const MINIMUM_SIGMA_CELL_RATIO = 0.5;
/** Contributions beyond this many standard deviations are dropped. */
export const KERNEL_CUTOFF_SIGMAS = 2.5;

/** Raster pixels the kernel's standard deviation should span. */
const TARGET_SIGMA_RASTER_PX = 6;
/** Widest raster; larger canvases are upscaled with bilinear filtering. */
const MAXIMUM_RASTER_LONG_SIDE = 1024;

export function smoothingSigmaMetres(gridSizeM: number) {
  return Math.max(SMOOTHING_SIGMA_M, gridSizeM * MINIMUM_SIGMA_CELL_RATIO);
}

/**
 * Screen pixels per raster pixel. The raster shrinks as the kernel widens on
 * screen, so the work per frame stays bounded at every zoom.
 */
export function smoothedRasterScale(
  outputWidth: number,
  outputHeight: number,
  sigmaPx: number,
) {
  const longSide = Math.max(outputWidth, outputHeight, 1);
  return Math.max(1, sigmaPx / TARGET_SIGMA_RASTER_PX, longSide / MAXIMUM_RASTER_LONG_SIDE);
}

/**
 * Weight a pixel collects inside fully sampled ground on a lattice with the
 * given spacing. Half of it counts as full support, so the surface stays
 * solid right up to the edge of the sampled cells and fades beyond it over
 * about one kernel width.
 */
export function fullSupportWeight(sigma: number, spacing: number) {
  return Math.PI * (sigma / Math.max(spacing, 1e-6)) ** 2;
}

function accumulateRow(
  weight: Float32Array,
  weightedScore: Float32Array,
  weightedAlpha: Float32Array,
  columnKernel: Float64Array,
  row: number,
  minX: number,
  maxX: number,
  rowKernel: number,
  score: number,
  alpha: number,
) {
  for (let x = minX; x <= maxX; x++) {
    const kernel = columnKernel[x] * rowKernel;
    const index = row + x;
    weight[index] += kernel;
    weightedScore[index] += kernel * score;
    weightedAlpha[index] += kernel * alpha;
  }
}

export function rasterizeSmoothedField(
  samples: Iterable<FieldSample>,
  width: number,
  height: number,
  supportWeight = 1,
): SmoothedField {
  const size = width * height;
  const weight = new Float32Array(size);
  const weightedScore = new Float32Array(size);
  const weightedAlpha = new Float32Array(size);
  const columnKernel = new Float64Array(width);
  const columnDistanceSquared = new Float64Array(width);

  for (const sample of samples) {
    const sigma = Math.max(sample.sigma, 0.5);
    const reach = sigma * KERNEL_CUTOFF_SIGMAS;
    const reachSquared = reach * reach;
    const minX = Math.max(0, Math.floor(sample.x - reach));
    const maxX = Math.min(width - 1, Math.ceil(sample.x + reach));
    const minY = Math.max(0, Math.floor(sample.y - reach));
    const maxY = Math.min(height - 1, Math.ceil(sample.y + reach));
    if (minX > maxX || minY > maxY) continue;
    const inverseTwoSigmaSquared = 1 / (2 * sigma * sigma);
    // exp(-(dx² + dy²) / 2σ²) is separable. Reuse each column's term
    // across rows instead of evaluating an exponential at every pixel.
    // Keep the original circular cutoff and Float32 accumulation order.
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - sample.x;
      columnDistanceSquared[x] = dx * dx;
      columnKernel[x] = Math.exp(-dx * dx * inverseTwoSigmaSquared);
    }
    for (let y = minY; y <= maxY; y += 1) {
      const dy = y + 0.5 - sample.y;
      const dySquared = dy * dy;
      if (dySquared > reachSquared) continue;
      const horizontalReach = Math.sqrt(reachSquared - dySquared);
      // Start conservatively outside the circle, then trim its two endpoints
      // with the original squared-distance check. Interior pixels need no
      // distance calculation or cutoff branch, even at a fractional boundary.
      let rowMinX = Math.max(minX, Math.floor(sample.x - 0.5 - horizontalReach));
      let rowMaxX = Math.min(maxX, Math.ceil(sample.x - 0.5 + horizontalReach));
      while (rowMinX <= rowMaxX && columnDistanceSquared[rowMinX] + dySquared > reachSquared) rowMinX++;
      while (rowMaxX >= rowMinX && columnDistanceSquared[rowMaxX] + dySquared > reachSquared) rowMaxX--;
      const rowKernel = Math.exp(-dySquared * inverseTwoSigmaSquared);
      const row = y * width;
      accumulateRow(weight, weightedScore, weightedAlpha, columnKernel,
        row, rowMinX, rowMaxX, rowKernel, sample.score, sample.alpha);
    }
  }

  const score = new Float32Array(size);
  const alpha = new Float32Array(size);
  for (let index = 0; index < size; index += 1) {
    const total = weight[index];
    if (total <= 0) continue;
    score[index] = weightedScore[index] / total;
    alpha[index] = (weightedAlpha[index] / total) * Math.min(1, total / supportWeight);
  }
  return { width, height, score, alpha };
}
