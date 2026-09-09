import { cataloniaSpatialBounds } from "@/data/regions";
import type { GlobalGridSizeM } from "@/src/lib/global-map";
import { requestBucketDegreesForGrid } from "@/src/lib/map-query";
import type { SpatialBounds } from "@/src/lib/types";

// Coalesce only while the upstream payload remains modest. The 2.5 km public
// bucket already uses the 0.5° read shape, so expanding it again would add
// cells without removing another browser request.
const GLOBAL_MAP_SHARD_FACTOR: Record<GlobalGridSizeM, number> = {
  1000: 2,
  2500: 1,
  5000: 2,
  10000: 2,
};

const stableCoordinate = (value: number) =>
  Math.round(value * 1_000_000) / 1_000_000;

export function globalMapReadBounds(
  bounds: SpatialBounds,
  gridSizeM: GlobalGridSizeM,
) {
  const bucketDegrees = requestBucketDegreesForGrid(gridSizeM);
  const tolerance = 1e-6;
  if (
    bounds.east - bounds.west > bucketDegrees + tolerance ||
    bounds.north - bounds.south > bucketDegrees + tolerance
  ) {
    return bounds;
  }

  const shardDegrees = bucketDegrees * GLOBAL_MAP_SHARD_FACTOR[gridSizeM];
  const shardUnits = Math.round(shardDegrees * 1_000_000);
  // Work in integer coordinate units: 42.4 / 0.2 is slightly below 212 in
  // floating point, which otherwise shifts an entire request one shard south.
  const shardStart = (coordinate: number) =>
    Math.floor(Math.round(coordinate * 1_000_000) / shardUnits) * shardUnits / 1_000_000;
  const west = Math.max(
    cataloniaSpatialBounds.west,
    shardStart(bounds.west),
  );
  const south = Math.max(
    cataloniaSpatialBounds.south,
    shardStart(bounds.south),
  );
  const readBounds = {
    west,
    south,
    east: Math.min(
      cataloniaSpatialBounds.east,
      stableCoordinate(west + shardDegrees),
    ),
    north: Math.min(
      cataloniaSpatialBounds.north,
      stableCoordinate(south + shardDegrees),
    ),
  };
  // Non-canonical callers can straddle a shard. Coalescing must never discard
  // part of their requested ground; keep their original read in that case.
  return readBounds.west <= bounds.west && readBounds.south <= bounds.south &&
    readBounds.east >= bounds.east && readBounds.north >= bounds.north
    ? readBounds : bounds;
}
