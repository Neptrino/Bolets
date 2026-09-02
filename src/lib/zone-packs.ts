import { bucketsForBounds } from "@/src/lib/map-query";
import { habitatBucketUrl, predictionBucketUrl } from "@/src/lib/map-request-url";
import type { SpatialBounds, SpatialGridSizeM } from "@/src/lib/types";

/**
 * Offline packs contain public data only. Contributor detail is deliberately
 * online-only so expiring or revoked access cannot survive in Cache Storage.
 */
const ZONE_PACK_RESOLUTIONS: SpatialGridSizeM[] = [2500];

export type ZonePackRequest = {
  url: string;
  bucket: SpatialBounds;
  resolution: SpatialGridSizeM;
  layer: "predictions" | "habitat";
};

/**
 * Lists every request a downloaded zone must hold.
 *
 * These are the very URLs the live map builds for the same buckets, because
 * both sides go through `predictionBucketUrl`/`habitatBucketUrl`. That identity
 * is the whole mechanism: the downloaded responses answer the map's ordinary
 * requests, so nothing in the map needs an offline-specific read path.
 */
export function enumerateZonePackRequests(
  zone: SpatialBounds,
  speciesId: string,
  clamp: SpatialBounds,
  resolutions: SpatialGridSizeM[] = ZONE_PACK_RESOLUTIONS,
): ZonePackRequest[] {
  const requests: ZonePackRequest[] = [];
  for (const resolution of resolutions) {
    for (const bucket of bucketsForBounds(zone, resolution, clamp)) {
      requests.push({
        url: predictionBucketUrl(bucket, speciesId, resolution),
        bucket,
        resolution,
        layer: "predictions",
      });
      requests.push({
        url: habitatBucketUrl(bucket, speciesId, resolution),
        bucket,
        resolution,
        layer: "habitat",
      });
    }
  }
  return requests;
}
