import { cataloniaSpatialBounds } from "@/data/regions";
import { formatMapCoordinate } from "@/src/lib/map-query";
import type { RegionId, SpatialBounds } from "@/src/lib/types";

type BoundsQuery = Partial<Record<"west" | "south" | "east" | "north", string>>;

export function territorialMapPath(
  speciesId: string,
  regionId: RegionId,
  bounds: SpatialBounds,
) {
  const query = new URLSearchParams({
    species: speciesId,
    region: regionId,
    west: formatMapCoordinate(bounds.west),
    south: formatMapCoordinate(bounds.south),
    east: formatMapCoordinate(bounds.east),
    north: formatMapCoordinate(bounds.north),
  });
  return `/map?${query}`;
}

export function territorialBoundsFromQuery(query: BoundsQuery): SpatialBounds | null {
  const bounds = {
    west: Number(query.west),
    south: Number(query.south),
    east: Number(query.east),
    north: Number(query.north),
  };
  if (
    !Object.values(bounds).every(Number.isFinite) ||
    bounds.west >= bounds.east ||
    bounds.south >= bounds.north ||
    bounds.west < cataloniaSpatialBounds.west ||
    bounds.south < cataloniaSpatialBounds.south ||
    bounds.east > cataloniaSpatialBounds.east ||
    bounds.north > cataloniaSpatialBounds.north
  ) return null;
  return bounds;
}
