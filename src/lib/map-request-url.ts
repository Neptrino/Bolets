import { formatMapCoordinate } from "@/src/lib/map-query";
import { HABITAT_MODEL_VERSION, PREDICTION_CACHE_VERSION } from "@/src/lib/model-versions";
import type { SpatialBounds, SpatialGridSizeM } from "@/src/lib/types";

/**
 * A single bucket holds far fewer cells than this at every resolution, so the
 * limit is a guard rather than a truncation the viewport has to report.
 */
const BUCKET_CELL_LIMIT = "1000";

/**
 * The one place a bucket request URL is spelled. The live map and a downloaded
 * offline zone must produce byte-identical URLs for the same bucket, because
 * that identity is what lets the cache answer the map's own requests with no
 * offline-specific read path.
 */
export function bucketRequestParams(
  bucket: SpatialBounds,
  speciesId: string,
  gridSizeM: SpatialGridSizeM,
  extras?: Record<string, string>,
) {
  return new URLSearchParams({
    species: speciesId,
    west: formatMapCoordinate(bucket.west),
    south: formatMapCoordinate(bucket.south),
    east: formatMapCoordinate(bucket.east),
    north: formatMapCoordinate(bucket.north),
    limit: BUCKET_CELL_LIMIT,
    resolution: String(gridSizeM),
    ...extras,
  });
}

export function predictionBucketUrl(
  bucket: SpatialBounds,
  speciesId: string,
  gridSizeM: SpatialGridSizeM,
) {
  const params = bucketRequestParams(bucket, speciesId, gridSizeM, {
    view: "map",
    v: PREDICTION_CACHE_VERSION,
  });
  return `/api/predictions?${params}`;
}

export function habitatBucketUrl(
  bucket: SpatialBounds,
  speciesId: string,
  gridSizeM: SpatialGridSizeM,
) {
  const params = bucketRequestParams(bucket, speciesId, gridSizeM, {
    v: HABITAT_MODEL_VERSION,
    view: "map",
  });
  return `/api/habitat?${params}`;
}
