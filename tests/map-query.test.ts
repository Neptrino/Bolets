import { describe, expect, it } from "vitest";
import {
  bucketsForBounds,
  cacheAlignedMapBounds,
  formatMapCoordinate,
  mapBoundsFitResolution,
  parseSpatialMapQuery,
  prioritizeBucketsAround,
} from "@/src/lib/map-query";

const catalonia = { west: 0.05, south: 40.48, east: 3.32, north: 42.92 };

describe("map request coordinates", () => {
  it("normalizes harmless viewport precision noise for stable cache keys", () => {
    expect(formatMapCoordinate(40.80875002816208)).toBe("40.8088");
    expect(formatMapCoordinate(40.80875002816251)).toBe("40.8088");
  });
});

describe("cache-aligned map bounds", () => {
  it("expands nearby 1 km views to the same stable cache bucket", () => {
    const clamp = catalonia;
    expect(cacheAlignedMapBounds(
      { west: 1.101, south: 41.201, east: 1.299, north: 41.399 },
      1000,
      clamp,
    )).toEqual({ west: 1.1, south: 41.2, east: 1.3, north: 41.4 });
  });

  it("does not expand beyond the Catalonia service boundary", () => {
    const clamp = catalonia;
    expect(cacheAlignedMapBounds(clamp, 10000, clamp)).toEqual(clamp);
  });
});

describe("request bucket enumeration", () => {
  it("covers a viewport smaller than a single bucket with that one bucket", () => {
    expect(bucketsForBounds(
      { west: 1.121, south: 41.221, east: 1.139, north: 41.239 },
      1000,
      catalonia,
    )).toEqual([{ west: 1.1, south: 41.2, east: 1.2, north: 41.3 }]);
  });

  it("enumerates the same lattice whatever the viewport shape", () => {
    const wide = bucketsForBounds(
      { west: 1.11, south: 41.21, east: 1.29, north: 41.29 },
      1000,
      catalonia,
    );
    const tall = bucketsForBounds(
      { west: 1.11, south: 41.21, east: 1.19, north: 41.39 },
      1000,
      catalonia,
    );
    // Both viewports cover bucket (1.1, 41.2); it is byte-identical in each,
    // which is what lets a downloaded zone answer a live request.
    const shared = { west: 1.1, south: 41.2, east: 1.2, north: 41.3 };
    expect(wide).toContainEqual(shared);
    expect(tall).toContainEqual(shared);
  });

  it("does not add a bucket for a viewport edge that lands exactly on the lattice", () => {
    expect(bucketsForBounds(
      { west: 1.1, south: 41.2, east: 1.2, north: 41.3 },
      1000,
      catalonia,
    )).toEqual([{ west: 1.1, south: 41.2, east: 1.2, north: 41.3 }]);
  });

  it("returns a grid of buckets for a multi-bucket viewport", () => {
    const buckets = bucketsForBounds(
      { west: 1.11, south: 41.21, east: 1.31, north: 41.41 },
      1000,
      catalonia,
    );
    expect(buckets).toHaveLength(9);
    expect(new Set(buckets.map((bucket) => `${bucket.west},${bucket.south}`)).size).toBe(9);
  });

  it("clips the outermost buckets to the Catalonia service boundary", () => {
    const buckets = bucketsForBounds(
      { west: 0.0, south: 40.4, east: 0.2, north: 40.6 },
      1000,
      catalonia,
    );
    expect(buckets.every((bucket) => bucket.west >= catalonia.west)).toBe(true);
    expect(buckets.every((bucket) => bucket.south >= catalonia.south)).toBe(true);
  });

  it("returns nothing for bounds outside the service boundary", () => {
    expect(bucketsForBounds(
      { west: 5.0, south: 44.0, east: 5.5, north: 44.5 },
      1000,
      catalonia,
    )).toEqual([]);
  });

  it("uses a coarser lattice at a coarser resolution", () => {
    const fine = bucketsForBounds(
      { west: 1.11, south: 41.21, east: 1.29, north: 41.39 },
      250,
      catalonia,
    );
    const coarse = bucketsForBounds(
      { west: 1.11, south: 41.21, east: 1.29, north: 41.39 },
      2500,
      catalonia,
    );
    expect(fine.length).toBeGreaterThan(coarse.length);
    // 0.25° cells straddle the 1.25 and 41.25 lattice lines, so the same
    // ground area is still four coarse buckets rather than one.
    expect(coarse).toHaveLength(4);
    expect(coarse).toContainEqual({ west: 1, south: 41, east: 1.25, north: 41.25 });
  });

  it("keeps every bucket inside the area its resolution allows to be requested", () => {
    for (const bucket of bucketsForBounds(
      { west: 1.11, south: 41.21, east: 1.61, north: 41.71 },
      250,
      catalonia,
    )) {
      expect(mapBoundsFitResolution(bucket, 250)).toBe(true);
    }
  });

  it("can load central buckets first without changing the lattice", () => {
    const buckets = [
      { west: 0, south: 40, east: 0.25, north: 40.25 },
      { west: 1, south: 41, east: 1.25, north: 41.25 },
      { west: 2, south: 42, east: 2.25, north: 42.25 },
    ];
    const prioritized = prioritizeBucketsAround(buckets, [1.1, 41.1]);

    expect(prioritized[0]).toEqual(buckets[1]);
    expect(new Set(prioritized)).toEqual(new Set(buckets));
    expect(buckets[0]).toEqual({ west: 0, south: 40, east: 0.25, north: 40.25 });
  });
});

describe("resolution-aware map bounds", () => {
  it("allows a country view only at a coarse resolution", () => {
    expect(mapBoundsFitResolution(catalonia, 10000)).toBe(true);
    expect(mapBoundsFitResolution(catalonia, 1000)).toBe(false);
  });

  it("allows a local high-resolution viewport", () => {
    expect(mapBoundsFitResolution(
      { west: 2.2, south: 42.25, east: 2.45, north: 42.4 },
      1000,
    )).toBe(true);
  });

  it("parses and validates the complete spatial request contract", () => {
    const valid = new URLSearchParams({
      west: "2.2",
      south: "42.25",
      east: "2.6",
      north: "42.4",
      resolution: "1000",
    });
    expect(parseSpatialMapQuery(valid, 250)).toEqual({
      query: {
        bounds: { west: 2.2, south: 42.25, east: 2.6, north: 42.4 },
        limit: null,
        resolution: 1000,
      },
    });

    valid.set("resolution", "750");
    expect(parseSpatialMapQuery(valid, 250)).toEqual({
      error: "Invalid map resolution",
    });

    valid.set("resolution", "250");
    expect(parseSpatialMapQuery(valid, 250)).toEqual({
      error: "Bounding box is too large for this resolution",
    });
  });
});
