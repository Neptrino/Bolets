import { describe, expect, it } from "vitest";
import {
  constrainGridSize,
  formatGridDimensions,
  gridSizeForViewport,
  gridSizeForZoom,
  isSpatialGridSize,
} from "@/src/lib/map-grid";

describe("zoom-adaptive spatial grid", () => {
  it.each([
    [13.4, 250], [13.3, 1000], [13.2, 1000], [13.1, 1000], [12.8, 1000],
    [11.8, 1000], [11.7, 2500], [9, 5000], [6.2, 10000]
  ])("uses %i m cells at zoom %s", (zoom, expected) => {
    expect(gridSizeForZoom(zoom)).toBe(expected);
  });

  it("accepts only supported server resolutions", () => {
    expect(isSpatialGridSize(2500)).toBe(true);
    expect(isSpatialGridSize(750)).toBe(false);
  });

  it("can opt an editorial surface into finer cells without crossing its detail floor", () => {
    expect(constrainGridSize(10000, 1000, 5000)).toBe(5000);
    expect(constrainGridSize(2500, 1000, 5000)).toBe(2500);
    expect(constrainGridSize(250, 1000, 5000)).toBe(1000);
    expect(constrainGridSize(10000, 1000)).toBe(10000);
  });

  it("coarsens a wide viewport to stay within the visible-cell budget", () => {
    expect(gridSizeForViewport(9.6, {
      west: 1.5,
      south: 42,
      east: 3,
      north: 42.75,
    })).toBe(5000);
    expect(gridSizeForViewport(8.5, {
      west: 0.05,
      south: 40.48,
      east: 3.32,
      north: 42.92,
    })).toBe(10000);
  });

  it("retains detailed cells for genuinely local viewports", () => {
    expect(gridSizeForViewport(13, {
      west: 2.15,
      south: 42.2,
      east: 2.25,
      north: 42.28,
    })).toBe(1000);
    expect(gridSizeForViewport(13.4, {
      west: 2.17,
      south: 42.22,
      east: 2.27,
      north: 42.3,
    })).toBe(250);
  });

  it("formats metric cell dimensions in Catalan", () => {
    expect(formatGridDimensions(250)).toBe("250 m × 250 m");
    expect(formatGridDimensions(2500)).toBe("2,5 km × 2,5 km");
  });
});
