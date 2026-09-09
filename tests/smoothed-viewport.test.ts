import { afterEach, describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { drawPredictionSurface } from "@/components/region-map/prediction-surface";
import { visibleGridSize } from "@/components/region-map/support";
import { smoothedQueryBounds } from "@/components/region-map/smoothed-viewport";
import { bucketsForBounds } from "@/src/lib/map-query";
import type { PredictionMapCell, SpatialGridSizeM } from "@/src/lib/types";

function projection(zoom = 11, panX = 0, panY = 0) {
  const worldSize = 512 * 2 ** zoom;
  const point = ([longitude, latitude]: [number, number]) => ({
    x: (longitude + 180) / 360 * worldSize,
    y: (1 - Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360)) / Math.PI) / 2 * worldSize,
  });
  const centre = point([1.65, 42.2]);
  return { project: (coordinate: [number, number]) => {
    const projected = point(coordinate);
    return { x: projected.x - centre.x + 450 + panX, y: projected.y - centre.y + 325 + panY };
  } } as unknown as MapLibreMap;
}

function cell(longitude: number, latitude: number, score: number, width = 0.015): PredictionMapCell {
  return {
    cellId: `${longitude}:${latitude}`,
    gridSizeM: 2500,
    cellBounds: [[longitude - width, latitude - 0.011], [longitude + width, latitude + 0.011]],
    score,
    habitatCoverage: 0.6,
  };
}

// Capture the actual raster and canvas placement without a browser/WebGL dependency.
function render(map: MapLibreMap, cells: PredictionMapCell[], width = 903, height = 659) {
  let raster!: { width: number; height: number; data: Uint8ClampedArray };
  let placement!: { left: number; top: number; width: number; height: number };
  vi.stubGlobal("document", { createElement: () => ({
    getContext: () => ({
      createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (image: typeof raster) => { raster = image; },
    }),
  }) });
  const context = {
    save() {}, restore() {},
    drawImage: (_canvas: unknown, left: number, top: number, w: number, h: number) => {
      placement = { left, top, width: w, height: h };
    },
  } as unknown as CanvasRenderingContext2D;
  drawPredictionSurface({
    cells, context, localMap: map, rendering: "heatmap", selectedCellId: null,
    output: { clientWidth: width, clientHeight: height } as HTMLCanvasElement,
  });
  return { raster, placement };
}

function colourAt(result: ReturnType<typeof render>, map: MapLibreMap, coordinate: [number, number]) {
  const point = map.project(coordinate);
  const { raster, placement } = result;
  const x = (point.x - placement.left) / placement.width * raster.width - 0.5;
  const y = (point.y - placement.top) / placement.height * raster.height - 0.5;
  const left = Math.floor(x), top = Math.floor(y);
  return [0, 1, 2, 3].map((channel) => {
    const pixel = (px: number, py: number) => raster.data[(py * raster.width + px) * 4 + channel];
    const upper = pixel(left, top) * (1 - x + left) + pixel(left + 1, top) * (x - left);
    const lower = pixel(left, top + 1) * (1 - x + left) + pixel(left + 1, top + 1) * (x - left);
    return upper * (1 - y + top) + lower * (y - top);
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("smoothed map viewport stability", () => {
  const cells = [cell(1.61, 42.18, 12), cell(1.65, 42.2, 85), cell(1.69, 42.22, 35)];

  it.each([0.01, 0.1, 0.3, 0.6, 1])("matches sector opacity over uniform habitat (%s)", (coverage) => {
    const uniform: PredictionMapCell[] = [];
    for (let y = -3; y <= 3; y += 1) {
      for (let x = -3; x <= 3; x += 1) {
        uniform.push({ ...cell(1.65 + x * 0.0303, 42.2 + y * 0.0225, 40), habitatCoverage: coverage });
      }
    }
    const map = projection();
    const smoothedAlpha = colourAt(render(map, uniform), map, [1.65, 42.2])[3];
    let sectorAlpha = 0;
    const context = {
      globalAlpha: 1, fillStyle: "",
      save() {}, restore() {}, setLineDash() {}, strokeRect() {},
      fillRect() { sectorAlpha = this.globalAlpha * Number(this.fillStyle.match(/,\s*([\d.]+)\)$/)![1]) * 255; },
    };
    drawPredictionSurface({
      cells: [uniform[24]], context: context as unknown as CanvasRenderingContext2D,
      localMap: map, rendering: "cells", selectedCellId: null, output: {} as HTMLCanvasElement,
    });
    expect(Math.abs(smoothedAlpha - sectorAlpha)).toBeLessThan(1);
  });

  it("renders the same surface regardless of which bucket arrives first", () => {
    const map = projection();
    const inputs = [...cells, cell(1.72, 42.21, 0, 0.003)];
    const forward = render(map, inputs);
    const reverse = render(map, [...inputs].reverse());
    expect(forward.placement).toEqual(reverse.placement);
    expect(forward.raster.width).toEqual(reverse.raster.width);
    expect(forward.raster.height).toEqual(reverse.raster.height);
    const differences = forward.raster.data.map((value, index) => Math.abs(value - reverse.raster.data[index]));
    expect(Math.max(...differences)).toBeLessThanOrEqual(1);
  });

  it.each([
    [12, 0, 0, 903, 659],
    [11, 81.3, -63.8, 903, 659],
    [11, 0, 0, 1067, 703],
  ])("keeps colours on the same ground after zoom/pan/resize (%s, %s, %s)", (zoom, panX, panY, width, height) => {
    const beforeMap = projection();
    const afterMap = projection(zoom, panX, panY);
    const before = render(beforeMap, cells);
    const after = render(afterMap, cells, width, height);
    for (const point of [[1.64, 42.19], [1.66, 42.21], [1.67, 42.2]] as [number, number][]) {
      const a = colourAt(before, beforeMap, point);
      const b = colourAt(after, afterMap, point);
      a.forEach((value, channel) => expect(Math.abs(value - b[channel])).toBeLessThan(1));
    }
  });

  it("preserves square raster pixels instead of stretching the rounded extent", () => {
    const { raster, placement } = render(projection(13), cells);
    expect(placement.width / raster.width).toBeCloseTo(placement.height / raster.height, 8);
    expect(placement.left).toBeLessThanOrEqual(0);
    expect(placement.top).toBeLessThanOrEqual(0);
    expect(placement.left + placement.width).toBeGreaterThanOrEqual(903);
    expect(placement.top + placement.height).toBeGreaterThanOrEqual(659);
  });

  function lattice(gridSizeM: SpatialGridSizeM, habitatCoverage: number, score: number) {
    const longitudeStep = gridSizeM / (111_320 * Math.cos(42.2 * Math.PI / 180));
    const latitudeStep = gridSizeM / 111_320;
    const cells: PredictionMapCell[] = [];
    for (let row = -3; row <= 3; row += 1) {
      for (let column = -3; column <= 3; column += 1) {
        const longitude = 1.65 + column * longitudeStep;
        const latitude = 42.2 + row * latitudeStep;
        cells.push({
          ...cell(longitude, latitude, score), gridSizeM, habitatCoverage,
          cellBounds: [[longitude - longitudeStep / 2, latitude - latitudeStep / 2],
            [longitude + longitudeStep / 2, latitude + latitudeStep / 2]],
        });
      }
    }
    return cells;
  }

  it("keeps zeros clear and preserves the production habitat and low-score fades", () => {
    const map = projection(10);
    const opacity = (coverage: number, score: number) =>
      colourAt(render(map, lattice(2500, coverage, score)), map, [1.65, 42.2])[3];
    expect(opacity(0, 0)).toBe(0);
    expect(opacity(0.02, 35)).toBeCloseTo(214 * 0.06, 0);
    expect(opacity(0.8, 2)).toBeCloseTo(214 / 2, 0);
    expect(opacity(0.8, 35)).toBeCloseTo(214, 0);
  });

  it.each([7, 8.34, 8.38, 8.73, 8.77, 10, 12, 14])(
    "keeps static smoothing fixed at zoom %s regardless of detail access", (zoom) => {
      const map = {
        getZoom: () => zoom,
        getBounds: () => ({ getWest: () => 1.4, getEast: () => 1.95,
          getSouth: () => 42.05, getNorth: () => 42.36 }),
      } as unknown as MapLibreMap;
      for (const floor of [250, 1000, 2500] as const) {
        expect(visibleGridSize(map, floor, undefined, "heatmap")).toBe(2500);
      }
      expect(visibleGridSize(map, 5000, 2500, "heatmap")).toBe(5000);
    },
  );

  it("keeps the transparent edge in place while zooming across the same readings", () => {
    const inputs = [cell(1.61, 42.2, 35), cell(1.65, 42.2, 0), cell(1.69, 42.2, 0)];
    const farMap = projection(10);
    const nearMap = projection(11);
    const far = render(farMap, inputs);
    const near = render(nearMap, inputs);
    const edgeAlpha = colourAt(far, farMap, [1.63, 42.2])[3];
    expect(edgeAlpha).toBeGreaterThan(0);
    expect(edgeAlpha).toBeLessThan(214);
    expect(colourAt(far, farMap, [1.69, 42.2])[3]).toBe(0);
    for (const longitude of [1.63, 1.65, 1.69]) {
      expect(colourAt(near, nearMap, [longitude, 42.2])[3])
        .toBeCloseTo(colourAt(far, farMap, [longitude, 42.2])[3], 0);
    }
  });

  it("still leaves unsampled ground transparent", () => {
    const map = projection(10);
    const result = render(map, [cell(1.55, 42.2, 35), { ...cell(1.7, 42.2, 0), score: null }]);
    expect(colourAt(result, map, [1.7, 42.2])[3]).toBe(0);
    expect(colourAt(result, map, [1.55, 42.2])[3]).toBeGreaterThan(0);
  });

  it("loads neighbouring buckets before a pan exposes their influence", () => {
    const viewport = { west: 1.51, south: 42.1, east: 1.7, north: 42.3 };
    const clamp = { west: 0.05, south: 40.48, east: 3.32, north: 42.92 };
    const bounds = smoothedQueryBounds(viewport, 2500);
    const padded = bucketsForBounds(bounds, 2500, clamp);
    expect(bucketsForBounds(viewport, 2500, clamp)).toHaveLength(1);
    expect(padded).toHaveLength(2);
    // A sample west of the viewport still influences its first few kilometres.
    expect(padded.some((bucket) => bucket.west <= 1.49 && bucket.east >= 1.49)).toBe(true);
    expect(bucketsForBounds(smoothedQueryBounds({ ...viewport, west: 1.49 }, 2500), 2500, clamp)).toEqual(padded);
    const edge = bucketsForBounds(smoothedQueryBounds(clamp, 10000), 10000, clamp);
    expect(edge.every((bucket) => bucket.west >= clamp.west && bucket.east <= clamp.east
      && bucket.south >= clamp.south && bucket.north <= clamp.north)).toBe(true);
  });
});
