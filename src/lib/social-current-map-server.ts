import "server-only";

import sharp from "sharp";

import { bucketsForBounds } from "@/src/lib/map-query";
import { predictionBucketUrl } from "@/src/lib/map-request-url";
import {
  currentMapRequestBounds,
  SOCIAL_CURRENT_MAP_GRID_SIZE_M,
  SOCIAL_CURRENT_MAP_HEIGHT,
  SOCIAL_CURRENT_MAP_WIDTH,
  socialCurrentMapOverlaySvg,
  socialCurrentMapWmsUrl,
} from "@/src/lib/social-current-map";
import type { PredictionMapCell } from "@/src/lib/types";

type PredictionBucketPayload = {
  cells: PredictionMapCell[];
  truncated: boolean;
};

const BUCKET_CONCURRENCY = 6;

async function fetchPredictionCells(origin: string) {
  const mapBounds = currentMapRequestBounds();
  const buckets = bucketsForBounds(
    mapBounds,
    SOCIAL_CURRENT_MAP_GRID_SIZE_M,
    mapBounds,
  );
  const cells = new Map<string, PredictionMapCell>();
  let nextBucket = 0;

  const loadBucket = async () => {
    while (nextBucket < buckets.length) {
      const bucket = buckets[nextBucket++];
      const url = new URL(
        predictionBucketUrl(bucket, "all", SOCIAL_CURRENT_MAP_GRID_SIZE_M),
        origin,
      );
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Prediction bucket returned ${response.status}`);
      const payload = await response.json() as PredictionBucketPayload;
      if (!Array.isArray(payload.cells) || payload.truncated) {
        throw new Error("Prediction bucket was incomplete");
      }
      for (const cell of payload.cells) cells.set(cell.cellId, cell);
    }
  };

  await Promise.all(Array.from(
    { length: Math.min(BUCKET_CONCURRENCY, buckets.length) },
    loadBucket,
  ));
  if (cells.size === 0) throw new Error("Current map contained no prediction cells");
  return [...cells.values()];
}

async function fetchIcgcBaseMap() {
  const response = await fetch(socialCurrentMapWmsUrl(), {
    cache: "force-cache",
    signal: AbortSignal.timeout(10_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.startsWith("image/png")) {
    throw new Error(`ICGC map returned ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function renderSocialCurrentMapDataUrl(origin: string) {
  const [baseMap, cells] = await Promise.all([
    fetchIcgcBaseMap(),
    fetchPredictionCells(origin),
  ]);
  const overlay = Buffer.from(socialCurrentMapOverlaySvg(cells));
  const image = await sharp(baseMap)
    .resize(SOCIAL_CURRENT_MAP_WIDTH, SOCIAL_CURRENT_MAP_HEIGHT, { fit: "fill" })
    .composite([{ input: overlay, blend: "over" }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${image.toString("base64")}`;
}
