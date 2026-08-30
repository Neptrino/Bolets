import { describe, expect, it } from "vitest";
import {
  cataloniaMapBounds,
  regionMapPanBounds,
} from "@/src/lib/map-view-bounds";

function span(bounds: [[number, number], [number, number]]) {
  return {
    longitude: bounds[1][0] - bounds[0][0],
    latitude: bounds[1][1] - bounds[0][1],
  };
}

describe("regional map bounds", () => {
  it("leaves enough pan envelope for Catalunya to fit wide and tall frames", () => {
    const catalonia = span(cataloniaMapBounds);
    const panEnvelope = span(regionMapPanBounds);

    expect(panEnvelope.longitude).toBeGreaterThan(catalonia.longitude * 1.7);
    expect(panEnvelope.latitude).toBeGreaterThan(catalonia.latitude * 2.4);
  });
});
