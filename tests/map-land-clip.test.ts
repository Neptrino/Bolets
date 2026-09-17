import { afterEach, describe, expect, it, vi } from "vitest";
import type { RegionMapAdapter } from "@/components/region-map/map-adapter";
import { withCataloniaLandClip } from "@/components/region-map/support";
import { cataloniaLandRings } from "@/data/catalonia-land";

class FakePath2D {
  static created = 0;
  moves = 0;
  lines = 0;
  constructor() { FakePath2D.created += 1; }
  moveTo() { this.moves += 1; }
  lineTo() { this.lines += 1; }
  closePath() {}
}

function mapStub() {
  let zoom = 8, pan = { x: 0, y: 0 }, bearing = 0;
  const map = {
    getZoom: () => zoom, getBearing: () => bearing, getPitch: () => 0,
    project: ([lng, lat]: [number, number]) => ({ x: lng * 100 * 2 ** (zoom - 8) + pan.x, y: -lat * 100 * 2 ** (zoom - 8) + pan.y }),
  } as unknown as RegionMapAdapter;
  return { map, set: (next: { zoom?: number; pan?: { x: number; y: number }; bearing?: number }) => {
    zoom = next.zoom ?? zoom; pan = next.pan ?? pan; bearing = next.bearing ?? bearing;
  } };
}

function contextStub() {
  const clips: unknown[] = [];
  const context = {
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
    clip: vi.fn((path?: unknown) => { clips.push(path); }),
    getTransform: () => ({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }),
    setTransform: vi.fn(), translate: vi.fn(), scale: vi.fn(),
  };
  return { context: context as unknown as CanvasRenderingContext2D, calls: context, clips };
}

afterEach(() => { vi.unstubAllGlobals(); FakePath2D.created = 0; });

describe("Catalonia land clip", () => {
  it("traces the boundary once per map and moves that path with pans and zooms", () => {
    vi.stubGlobal("Path2D", FakePath2D);
    const stub = mapStub();
    const first = contextStub();
    const draw = vi.fn();
    withCataloniaLandClip(first.context, stub.map, draw);
    expect(draw).toHaveBeenCalledOnce();
    expect(FakePath2D.created).toBe(1);
    const path = first.clips[0] as FakePath2D;
    expect(path.moves).toBe(cataloniaLandRings.length);
    expect(path.lines).toBe(cataloniaLandRings.reduce((total, ring) => total + ring.length, 0) - cataloniaLandRings.length);
    expect(first.calls.translate).toHaveBeenCalledWith(0, 0);
    expect(first.calls.scale).toHaveBeenCalledWith(1, 1);
    expect(first.calls.setTransform).toHaveBeenCalledWith(first.context.getTransform());
    expect(first.calls.moveTo).not.toHaveBeenCalled();

    stub.set({ pan: { x: 12, y: -7 } });
    const panned = contextStub();
    withCataloniaLandClip(panned.context, stub.map, draw);
    expect(FakePath2D.created).toBe(1);
    expect(panned.clips[0]).toBe(path);
    expect(panned.calls.translate).toHaveBeenCalledWith(12, -7);
    expect(panned.calls.scale).toHaveBeenCalledWith(1, 1);

    stub.set({ zoom: 9, pan: { x: 0, y: 0 } });
    const zoomed = contextStub();
    withCataloniaLandClip(zoomed.context, stub.map, draw);
    expect(FakePath2D.created).toBe(1);
    expect(zoomed.calls.translate).toHaveBeenCalledWith(0, 0);
    expect(zoomed.calls.scale).toHaveBeenCalledWith(2, 2);
    expect(zoomed.calls.restore).toHaveBeenCalledOnce();
  });

  it("projects every vertex when the map is rotated or the browser lacks Path2D", () => {
    vi.stubGlobal("Path2D", FakePath2D);
    const stub = mapStub();
    stub.set({ bearing: 30 });
    const rotated = contextStub();
    withCataloniaLandClip(rotated.context, stub.map, () => {});
    expect(FakePath2D.created).toBe(0);
    expect(rotated.calls.beginPath).toHaveBeenCalledOnce();
    expect(rotated.calls.moveTo).toHaveBeenCalledTimes(cataloniaLandRings.length);
    expect(rotated.clips[0]).toBeUndefined();

    vi.stubGlobal("Path2D", undefined);
    const legacy = contextStub();
    withCataloniaLandClip(legacy.context, mapStub().map, () => {});
    expect(legacy.calls.moveTo).toHaveBeenCalledTimes(cataloniaLandRings.length);
    expect(legacy.clips[0]).toBeUndefined();
  });
});
