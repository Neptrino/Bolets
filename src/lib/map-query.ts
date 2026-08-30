import type { SpatialBounds, SpatialGridSizeM } from "@/src/lib/types";
import { isSpatialGridSize } from "@/src/lib/map-grid";

export function formatMapCoordinate(value: number) {
  return value.toFixed(4);
}

const requestBucketDegrees: Record<SpatialGridSizeM, number> = {
  250: 0.025,
  1000: 0.1,
  2500: 0.5,
  5000: 0.5,
  10000: 1,
};

export function requestBucketDegreesForGrid(resolution: SpatialGridSizeM) {
  return requestBucketDegrees[resolution];
}

const maximumRequestAreaDegrees: Record<SpatialGridSizeM, number> = {
  250: 0.05,
  1000: 0.5,
  2500: 2,
  5000: 6,
  10000: 12.5,
};

export function mapBoundsFitResolution(bounds: SpatialBounds, resolution: SpatialGridSizeM) {
  return (bounds.east - bounds.west) * (bounds.north - bounds.south)
    <= maximumRequestAreaDegrees[resolution];
}

/**
 * Expands a viewport to a stable geographic bucket. Nearby pans then share
 * the same CDN and Next.js cache key instead of creating a unique request for
 * every sub-pixel change in map position.
 */
export function cacheAlignedMapBounds(
  bounds: SpatialBounds,
  resolution: SpatialGridSizeM,
  clamp: SpatialBounds,
): SpatialBounds {
  const bucket = requestBucketDegrees[resolution];
  const stable = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
  const floor = (value: number) => stable(Math.floor(value / bucket) * bucket);
  const ceil = (value: number) => stable(Math.ceil(value / bucket) * bucket);
  return {
    west: Math.max(clamp.west, floor(bounds.west)),
    south: Math.max(clamp.south, floor(bounds.south)),
    east: Math.min(clamp.east, ceil(bounds.east)),
    north: Math.min(clamp.north, ceil(bounds.north)),
  };
}

/**
 * Enumerates every request bucket that intersects the given bounds. The bucket
 * lattice is anchored at zero and depends only on the resolution, so the same
 * ground area always resolves to the same rectangles whatever the viewport
 * shape. That makes a request URL reproducible ahead of time, which is what
 * lets a downloaded offline zone answer the map's own live requests.
 */
export function bucketsForBounds(
  bounds: SpatialBounds,
  resolution: SpatialGridSizeM,
  clamp: SpatialBounds,
): SpatialBounds[] {
  const bucket = requestBucketDegrees[resolution];
  const stable = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
  const west = Math.max(clamp.west, bounds.west);
  const south = Math.max(clamp.south, bounds.south);
  const east = Math.min(clamp.east, bounds.east);
  const north = Math.min(clamp.north, bounds.north);
  if (west >= east || south >= north) return [];

  const buckets: SpatialBounds[] = [];
  const firstColumn = Math.floor(west / bucket);
  const lastColumn = Math.ceil(east / bucket) - 1;
  const firstRow = Math.floor(south / bucket);
  const lastRow = Math.ceil(north / bucket) - 1;
  for (let column = firstColumn; column <= lastColumn; column += 1) {
    for (let row = firstRow; row <= lastRow; row += 1) {
      const bucketWest = Math.max(clamp.west, stable(column * bucket));
      const bucketEast = Math.min(clamp.east, stable((column + 1) * bucket));
      const bucketSouth = Math.max(clamp.south, stable(row * bucket));
      const bucketNorth = Math.min(clamp.north, stable((row + 1) * bucket));
      // The clamp can collapse an edge bucket that only overlapped the service
      // boundary by a sliver. Such a bucket has no cells to request.
      if (bucketWest >= bucketEast || bucketSouth >= bucketNorth) continue;
      buckets.push({
        west: bucketWest,
        south: bucketSouth,
        east: bucketEast,
        north: bucketNorth,
      });
    }
  }
  return buckets;
}

/**
 * Keeps the bucket lattice unchanged while loading the most immediately
 * useful ground first. This is especially noticeable when a fine grid covers
 * a large viewport and dozens of cache-stable requests are required.
 */
export function prioritizeBucketsAround(
  buckets: SpatialBounds[],
  [longitude, latitude]: [number, number],
) {
  const distanceSquared = (bucket: SpatialBounds) => {
    const bucketLongitude = (bucket.west + bucket.east) / 2;
    const bucketLatitude = (bucket.south + bucket.north) / 2;
    return (bucketLongitude - longitude) ** 2 + (bucketLatitude - latitude) ** 2;
  };
  return [...buckets].sort(
    (first, second) => distanceSquared(first) - distanceSquared(second),
  );
}

const numberParam = (params: URLSearchParams, name: string) => {
  const value = params.get(name);
  return value?.trim() ? Number(value) : Number.NaN;
};

export function parseMapQuery(params: URLSearchParams, defaultResolution: number) {
  const bounds: SpatialBounds = {
    west: numberParam(params, "west"),
    south: numberParam(params, "south"),
    east: numberParam(params, "east"),
    north: numberParam(params, "north")
  };
  if (!Object.values(bounds).every(Number.isFinite)
    || bounds.west >= bounds.east || bounds.south >= bounds.north
    || bounds.east - bounds.west > 4 || bounds.north - bounds.south > 3) return null;

  const limit = numberParam(params, "limit");
  const resolution = numberParam(params, "resolution");
  return {
    bounds,
    limit: Number.isFinite(limit) ? limit : null,
    resolution: Number.isFinite(resolution) ? resolution : defaultResolution
  };
}

export function parseSpatialMapQuery(
  params: URLSearchParams,
  defaultResolution: SpatialGridSizeM,
) {
  const query = parseMapQuery(params, defaultResolution);
  if (!query) return { error: "Invalid or excessive bounding box" } as const;
  const { resolution } = query;
  if (!isSpatialGridSize(resolution)) {
    return { error: "Invalid map resolution" } as const;
  }
  if (!mapBoundsFitResolution(query.bounds, resolution)) {
    return { error: "Bounding box is too large for this resolution" } as const;
  }
  return { query: { ...query, resolution } } as const;
}
