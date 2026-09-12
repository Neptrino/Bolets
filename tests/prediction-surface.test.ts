import { describe, expect, it } from "vitest";
import {
  fullSupportWeight,
  rasterizeSmoothedField,
  smoothedRasterScale,
  smoothingSigmaMetres,
  type FieldSample,
} from "@/components/region-map/smoothed-field";

function sample(overrides: Partial<FieldSample>): FieldSample {
  return { x: 10.5, y: 10.5, sigma: 2.4, score: 60, alpha: 1, ...overrides };
}

function at(field: { width: number; score: Float32Array; alpha: Float32Array }, x: number, y: number) {
  const index = y * field.width + x;
  return { score: field.score[index], alpha: field.alpha[index] };
}

describe("smoothed prediction surface", () => {
  it("preserves the circular Gaussian reference across overlapping and clipped samples", () => {
    let seed = 7391;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const width = 61, height = 47, support = 2;
    const samples = Array.from({ length: 180 }, () => sample({
      x: random() * 81 - 10, y: random() * 67 - 10,
      sigma: random() * 12, score: random() * 100, alpha: random(),
    }));
    const result = rasterizeSmoothedField(samples, width, height, support);
    // Independent pixel-first reference, retaining the original Float32 sums.
    const expectedScore = new Float32Array(width * height);
    const expectedAlpha = new Float32Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let weight = 0, score = 0, alpha = 0;
      for (const point of samples) {
        const sigma = Math.max(point.sigma, 0.5);
        const distance = (x + 0.5 - point.x) ** 2 + (y + 0.5 - point.y) ** 2;
        if (distance > (sigma * 2.5) ** 2) continue;
        const kernel = Math.exp(-distance * (1 / (2 * sigma * sigma)));
        weight = Math.fround(weight + kernel);
        score = Math.fround(score + kernel * point.score);
        alpha = Math.fround(alpha + kernel * point.alpha);
      }
      if (weight) {
        expectedScore[y * width + x] = score / weight;
        expectedAlpha[y * width + x] = alpha / weight * Math.min(1, weight / support);
      }
    }
    expect(result.score).toEqual(expectedScore);
    expect(result.alpha).toEqual(expectedAlpha);
  });

  it("reads a lone cell's own value at its centre and nothing far away", () => {
    const field = rasterizeSmoothedField([sample({ score: 72, alpha: 0.8 })], 21, 21);
    expect(at(field, 10, 10).score).toBeCloseTo(72, 4);
    expect(at(field, 10, 10).alpha).toBeCloseTo(0.8, 4);
    expect(at(field, 0, 0).score).toBe(0);
    expect(at(field, 0, 0).alpha).toBe(0);
  });

  it("glides between neighbouring cells instead of stepping", () => {
    const field = rasterizeSmoothedField([
      sample({ x: 6.5, score: 20 }),
      sample({ x: 14.5, score: 80 }),
    ], 21, 21);
    expect(at(field, 10, 10).score).toBeCloseTo(50, 3);
    expect(at(field, 7, 10).score).toBeLessThan(35);
    expect(at(field, 13, 10).score).toBeGreaterThan(65);
    expect(at(field, 8, 10).score).toBeLessThan(at(field, 9, 10).score);
  });

  it("lets a verified zero pull the surface down at the edge of suitable ground", () => {
    const field = rasterizeSmoothedField([
      sample({ x: 6.5, score: 80 }),
      sample({ x: 14.5, score: 0 }),
    ], 21, 21);
    expect(at(field, 10, 10).score).toBeCloseTo(40, 3);
    expect(at(field, 14, 10).score).toBeLessThan(10);
  });

  it("stays solid to the edge of sampled ground and fades beyond it", () => {
    // A 5 × 5 lattice of cells four pixels apart, centred on (20.5, 20.5).
    const spacing = 4;
    const samples: FieldSample[] = [];
    for (let row = -2; row <= 2; row += 1) {
      for (let column = -2; column <= 2; column += 1) {
        samples.push(sample({ x: 20.5 + column * spacing, y: 20.5 + row * spacing }));
      }
    }
    const field = rasterizeSmoothedField(samples, 41, 41, fullSupportWeight(2.4, spacing));
    expect(at(field, 20, 20).alpha).toBeCloseTo(1, 4);
    expect(at(field, 28, 20).alpha).toBeCloseTo(1, 4); // edge cell centre
    const oneSpacingOut = at(field, 32, 20).alpha;
    expect(oneSpacingOut).toBeGreaterThan(0.1);
    expect(oneSpacingOut).toBeLessThan(0.5);
    expect(at(field, 40, 20).alpha).toBe(0);
  });

  it("ignores samples that fall outside the raster", () => {
    const field = rasterizeSmoothedField([sample({ x: -50, y: -50, score: 100 })], 8, 8);
    expect(Array.from(field.score).every((value) => value === 0)).toBe(true);
  });

  it("keeps one ground width across fine grids and widens only for coarse ones", () => {
    expect(smoothingSigmaMetres(250)).toBe(1750);
    expect(smoothingSigmaMetres(1000)).toBe(1750);
    expect(smoothingSigmaMetres(2500)).toBe(1750);
    expect(smoothingSigmaMetres(5000)).toBe(2500);
    expect(smoothingSigmaMetres(10000)).toBe(5000);
  });

  it("shrinks the raster as the kernel widens on screen", () => {
    expect(smoothedRasterScale(1000, 700, 12)).toBe(2);
    expect(smoothedRasterScale(1000, 700, 3)).toBe(1);
    expect(smoothedRasterScale(4000, 3000, 3)).toBeCloseTo(4000 / 1024, 4);
    expect(fullSupportWeight(2.4, 4)).toBeCloseTo(Math.PI * 0.36, 4);
  });
});
