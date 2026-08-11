import { describe, expect, it } from "vitest";
import { formatGridDimensions, gridSizeForZoom, isSpatialGridSize } from "@/src/lib/map-grid";

describe("zoom-adaptive spatial grid", () => {
  it.each([
    [14.2, 250], [14.1, 500], [13.2, 500], [13.1, 1000], [12.8, 1000],
    [11.8, 1000], [11.7, 2500], [9, 5000], [6.2, 10000]
  ])("uses %i m cells at zoom %s", (zoom, expected) => {
    expect(gridSizeForZoom(zoom)).toBe(expected);
  });

  it("accepts only supported server resolutions", () => {
    expect(isSpatialGridSize(2500)).toBe(true);
    expect(isSpatialGridSize(750)).toBe(false);
  });

  it("formats metric cell dimensions in Catalan", () => {
    expect(formatGridDimensions(250)).toBe("250 m × 250 m");
    expect(formatGridDimensions(2500)).toBe("2,5 km × 2,5 km");
  });
});
