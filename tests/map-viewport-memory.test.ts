import { describe, expect, it } from "vitest";
import { createViewportMemory, viewportIntentKey } from "@/components/region-map/viewport-memory";

describe("interactive map viewport memory", () => {
  const viewport = { center: [1.724593, 42.17821] as [number, number], zoom: 12.438 };

  it("keeps the exact camera when species have different default regions", () => {
    const memory = createViewportMemory();
    const from = viewportIntentKey({ autoGeolocate: true, selectedRegion: "pirineus" });
    const to = viewportIntentKey({ autoGeolocate: true, selectedRegion: "montseny" });
    memory.remember(from, viewport);
    expect(memory.restore(to)).toEqual(viewport);
  });

  it("honours a newly requested territory instead of restoring another area", () => {
    const memory = createViewportMemory();
    memory.remember(viewportIntentKey({ autoGeolocate: true }), viewport);
    expect(memory.restore(viewportIntentKey({ autoGeolocate: false, selectedRegion: "pirineus" }))).toBeUndefined();
    expect(memory.restore(viewportIntentKey({ autoGeolocate: false, focusBounds: {
      west: 1.5, south: 42, east: 1.6, north: 42.1,
    } }))).toBeUndefined();
  });

  it("retains panning within an explicit window across species changes", () => {
    const memory = createViewportMemory();
    const focusBounds = { west: 1.5, south: 42, east: 1.6, north: 42.1 };
    memory.remember(viewportIntentKey({ autoGeolocate: false, focusBounds, selectedRegion: "pirineus" }), viewport);
    expect(memory.restore(viewportIntentKey({ autoGeolocate: false, focusBounds: { ...focusBounds }, selectedRegion: "montseny" })))
      .toEqual(viewport);
  });

  it("starts empty for a new map layout", () => {
    const memory = createViewportMemory();
    memory.remember("null", viewport);
    expect(createViewportMemory().restore("null")).toBeUndefined();
  });

  it("keeps the view through a species quick link that requests no new territory", () => {
    const memory = createViewportMemory();
    memory.remember(viewportIntentKey({ autoGeolocate: false, selectedRegion: "pirineus" }), viewport);
    expect(memory.restore(viewportIntentKey({ autoGeolocate: true }))).toEqual(viewport);
  });
});
