import type { SpatialBounds, SpatialGridSizeM } from "@/src/lib/types";

export function formatMapCoordinate(value: number) {
  return value.toFixed(4);
}

const requestBucketDegrees: Record<SpatialGridSizeM, number> = {
  250: 0.025,
  1000: 0.1,
  2500: 0.25,
  5000: 0.5,
  10000: 1,
};

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
