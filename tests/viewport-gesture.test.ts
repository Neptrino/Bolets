import { afterEach, describe, expect, it, vi } from "vitest";
import type { RegionMapAdapter } from "@/components/region-map/map-adapter";
import { createViewportGesture } from "@/components/region-map/viewport-gesture";

function mapStub() {
  let zoom = 8, pan = { x: 0, y: 0 }, moving = false, bearing = 0;
  const listeners = new Map<string, Set<() => void>>();
  const map = {
    getZoom: () => zoom, getBearing: () => bearing, getPitch: () => 0, isMoving: () => moving,
    // A north-up Mercator projection: scale doubles per zoom level around the world origin.
    project: ([lng, lat]: [number, number]) => ({ x: lng * 100 * 2 ** (zoom - 8) + pan.x, y: -lat * 100 * 2 ** (zoom - 8) + pan.y }),
    on: (type: string, listener: () => void) => { listeners.set(type, (listeners.get(type) ?? new Set()).add(listener)); },
    off: (type: string, listener: () => void) => { listeners.get(type)?.delete(listener); },
  } as unknown as RegionMapAdapter;
  return {
    map, listeners,
    emit: (type: string) => { for (const listener of listeners.get(type) ?? []) listener(); },
    set: (next: { zoom?: number; pan?: { x: number; y: number }; moving?: boolean; bearing?: number }) => {
      zoom = next.zoom ?? zoom; pan = next.pan ?? pan; moving = next.moving ?? moving; bearing = next.bearing ?? bearing;
    },
  };
}
const canvasStub = () => ({ style: {} as CSSStyleDeclaration }) as HTMLCanvasElement;

afterEach(() => vi.unstubAllGlobals());

describe("viewport gesture transforms", () => {
  it("translates a pan and scales a zoom of the last painted frame", () => {
    const stub = mapStub();
    const canvas = canvasStub();
    const gesture = createViewportGesture({ map: stub.map, canvases: () => [canvas, null], repaint: vi.fn() });
    expect(gesture.transform()).toBe(false);
    gesture.painted();
    expect(gesture.transform()).toBe(false);
    stub.set({ moving: true, pan: { x: 30, y: -10 } });
    expect(gesture.transform()).toBe(true);
    expect(canvas.style.transform).toBe("translate(30px, -10px) scale(1)");
    expect(canvas.style.transformOrigin).toBe("0 0");
    stub.set({ zoom: 9, pan: { x: 5, y: 5 } });
    expect(gesture.transform()).toBe(true);
    expect(canvas.style.transform).toBe("translate(5px, 5px) scale(2)");
    gesture.dispose();
  });

  it("asks for a real paint once the map is rotated or tilted", () => {
    const stub = mapStub();
    const gesture = createViewportGesture({ map: stub.map, canvases: () => [canvasStub()], repaint: vi.fn() });
    gesture.painted();
    stub.set({ moving: true, bearing: 15 });
    expect(gesture.transform()).toBe(false);
    gesture.dispose();
  });

  it("repaints on the next frame after a gesture unless the owner already did", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
    const stub = mapStub();
    const canvas = canvasStub();
    const repaint = vi.fn();
    const gesture = createViewportGesture({ map: stub.map, canvases: () => [canvas], repaint });
    gesture.painted();
    stub.set({ moving: true });
    stub.emit("movestart");
    expect(canvas.style.willChange).toBe("transform");
    stub.set({ pan: { x: 4, y: 0 } });
    gesture.transform();
    stub.set({ moving: false });
    stub.emit("moveend");
    expect(frames).toHaveLength(1);
    frames[0](0);
    expect(repaint).toHaveBeenCalledOnce();
    gesture.painted();
    expect(canvas.style.transform).toBe("");
    expect(canvas.style.willChange).toBe("");

    // The owner repainted synchronously from its own moveend listener.
    stub.set({ moving: true }); stub.emit("movestart");
    stub.set({ moving: false }); stub.emit("moveend");
    gesture.painted();
    frames[1](0);
    expect(repaint).toHaveBeenCalledOnce();
    gesture.dispose();
  });

  it("removes its listeners and transform on dispose", () => {
    const stub = mapStub();
    const canvas = canvasStub();
    const gesture = createViewportGesture({ map: stub.map, canvases: () => [canvas], repaint: vi.fn() });
    gesture.painted();
    stub.set({ moving: true, pan: { x: 1, y: 1 } });
    gesture.transform();
    gesture.dispose();
    expect(canvas.style.transform).toBe("");
    expect(stub.listeners.get("movestart")?.size ?? 0).toBe(0);
    expect(stub.listeners.get("moveend")?.size ?? 0).toBe(0);
  });
});
