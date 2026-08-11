import type { SpatialBounds } from "@/src/lib/types";

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
