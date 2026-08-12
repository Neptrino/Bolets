import { describe, expect, it } from "vitest";
import { cacheAlignedMapBounds, formatMapCoordinate, mapBoundsFitResolution } from "@/src/lib/map-query";

describe("map request coordinates", () => {
  it("normalizes harmless viewport precision noise for stable cache keys", () => {
    expect(formatMapCoordinate(40.80875002816208)).toBe("40.8088");
    expect(formatMapCoordinate(40.80875002816251)).toBe("40.8088");
  });
});

describe("cache-aligned map bounds", () => {
  it("expands nearby 1 km views to the same stable cache bucket", () => {
    const clamp = { west: 0.05, south: 40.48, east: 3.32, north: 42.92 };
    expect(cacheAlignedMapBounds(
      { west: 1.101, south: 41.201, east: 1.299, north: 41.399 },
      1000,
      clamp,
    )).toEqual({ west: 1.1, south: 41.2, east: 1.3, north: 41.4 });
  });

  it("does not expand beyond the Catalonia service boundary", () => {
    const clamp = { west: 0.05, south: 40.48, east: 3.32, north: 42.92 };
    expect(cacheAlignedMapBounds(clamp, 10000, clamp)).toEqual(clamp);
  });
});

describe("resolution-aware map bounds", () => {
  it("allows a country view only at a coarse resolution", () => {
    const catalonia = { west: 0.05, south: 40.48, east: 3.32, north: 42.92 };
    expect(mapBoundsFitResolution(catalonia, 10000)).toBe(true);
    expect(mapBoundsFitResolution(catalonia, 1000)).toBe(false);
  });

  it("allows a local high-resolution viewport", () => {
    expect(mapBoundsFitResolution(
      { west: 2.2, south: 42.25, east: 2.45, north: 42.4 },
      1000,
    )).toBe(true);
  });
});
