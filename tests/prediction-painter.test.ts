import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { PredictionMapCell } from "@/src/lib/types";
import { createPredictionPainter } from "@/components/region-map/prediction-painter";
import { rasterizePreparedHeatRaster, type PreparedHeatRaster, type PredictionHeatRaster } from "@/components/region-map/prediction-raster";

const mocks = vi.hoisted(() => ({ draw: vi.fn(), render: vi.fn(), dispose: vi.fn() }));
vi.mock("@/components/region-map/raster-worker-client", () => ({ createRasterWorkerClient: () => ({ render: mocks.render, dispose: mocks.dispose }) }));
vi.mock("@/components/region-map/prediction-surface", () => ({ drawPredictionSurface: mocks.draw }));
vi.mock("@/components/region-map/support", () => ({
  prepareCanvas: () => ({}), drawTerritorialWindow: () => {},
  withCataloniaLandClip: (_context: unknown, _map: unknown, draw: () => void) => draw(),
}));

function setup() {
  const cell = { cellId: "one", gridSizeM: 2500, score: 50, habitatCoverage: 0.6,
    cellBounds: [[1.98, 41.98], [2.02, 42.02]] } as PredictionMapCell;
  let cells = new Map([[cell.cellId, cell]]), selected: string | null = null, pan = 0;
  const jobs: Array<() => void> = [];
  mocks.render.mockImplementation((prepared: PreparedHeatRaster) => new Promise<PredictionHeatRaster>(resolve => {
    jobs.push(() => resolve(rasterizePreparedHeatRaster(prepared)));
  }));
  const map = {
    project: ([x, y]: number[]) => ({ x: (x - 2) * 1000 + 20 + pan, y: (42 - y) * 1000 + 20 }),
    getCenter: () => ({ lng: 2 - pan / 1000, lat: 42 }), getZoom: () => 8,
    getBearing: () => 0, getPitch: () => 0, getPadding: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  } as unknown as MapLibreMap;
  const draw = createPredictionPainter({ map, canvas: () => ({ clientWidth: 40, clientHeight: 40 }) as HTMLCanvasElement,
    cells: () => cells, selectedCellId: () => selected, rendering: "heatmap", interactive: false, territory: () => undefined });
  return { draw, jobs, replace: (next: Map<string, PredictionMapCell>) => { cells = next; },
    cells, select: () => { selected = "one"; }, pan: () => { pan = 10; } };
}

beforeEach(() => vi.clearAllMocks());
describe("asynchronous prediction painting", () => {
  it("reuses raster pixels on selection and unchanged bucket publication", async () => {
    const fixture = setup();
    const first = fixture.draw(); fixture.jobs[0](); await first;
    fixture.select(); await fixture.draw();
    fixture.replace(new Map(fixture.cells)); await fixture.draw();
    expect(mocks.render).toHaveBeenCalledOnce();
    expect(mocks.draw.mock.calls.at(-1)?.[0].selectedCellId).toBe("one");
    fixture.draw.dispose();
  });
  it("discards a late species/day raster after its cell snapshot is replaced", async () => {
    const fixture = setup();
    const previous = fixture.draw();
    fixture.replace(new Map()); await fixture.draw();
    fixture.jobs[0](); await previous;
    expect(mocks.draw).toHaveBeenCalledOnce();
    expect(mocks.draw.mock.calls[0][0].raster).toBeNull();
    fixture.draw.dispose();
  });
  it("moves the cached field with a pan while computing its new viewport", async () => {
    const fixture = setup();
    const first = fixture.draw(); fixture.jobs[0](); await first;
    const before = mocks.draw.mock.calls[0][0].raster;
    fixture.pan(); const next = fixture.draw();
    const interim = mocks.draw.mock.calls.at(-1)?.[0].raster;
    expect(interim.left).toBeCloseTo(before.left + 10);
    expect(interim.pixels).toBe(before.pixels);
    expect(mocks.render).toHaveBeenCalledTimes(2);
    fixture.jobs[1](); await next;
    fixture.draw.dispose();
  });
  it("never paints after the map is disposed", async () => {
    const fixture = setup();
    const first = fixture.draw(); fixture.draw.dispose(); fixture.jobs[0](); await first;
    expect(mocks.draw).not.toHaveBeenCalled();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });
  it("waits for a superseding viewport before reporting the final paint settled", async () => {
    const fixture = setup();
    const first = fixture.draw();
    let ready = false;
    const settled = fixture.draw.settled().then(() => { ready = true; });
    fixture.pan(); const next = fixture.draw();
    fixture.jobs[0](); await first;
    expect(ready).toBe(false);
    fixture.jobs[1](); await next; await settled;
    expect(ready).toBe(true);
    fixture.draw.dispose();
  });
});
