import "server-only";

import { promisify } from "node:util";
import { gzip, gunzip } from "node:zlib";
import { unstable_cache } from "next/cache";
import { spatialEnvironmentFrameSchema } from "@/src/lib/prediction-map-timeline-schema";
import { spatialServiceConfig } from "@/src/lib/spatial-service-auth.server";
import type { PredictionTimelineOffset, SpatialBounds, SpatialGridSizeM } from "@/src/lib/types";

const compress = promisify(gzip);
const decompress = promisify(gunzip);
type StoredFrame = { storedAt: number; compressed: string };
const pending = new Map<string, Promise<StoredFrame>>();

async function fetchCompressedFrame(
  bounds: SpatialBounds, limit: number, gridSizeM: SpatialGridSizeM,
  offset: Exclude<PredictionTimelineOffset, 0>,
) {
  const service = spatialServiceConfig(gridSizeM);
  const query = new URLSearchParams({
    mode: "frame", west: String(bounds.west), south: String(bounds.south),
    east: String(bounds.east), north: String(bounds.north),
    limit: String(Math.min(Math.max(Math.round(limit), 1), 1000)),
    resolution: String(gridSizeM), offset: String(offset),
  });
  const response = await fetch(`${service.url}/functions/v1/read-spatial-environment?${query}`, {
    headers: { Authorization: `Bearer ${service.key}`, apikey: service.key },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Spatial timeline frame returned ${response.status}`);
  const frame = spatialEnvironmentFrameSchema.parse(await response.json());
  // Five-day raw frames exceed Next's 2 MiB cache limit. Compress the validated
  // payload asynchronously; keep every observation and correction input intact.
  return { storedAt: Date.now(), compressed: (await compress(JSON.stringify(frame))).toString("base64") };
}

function freshFrame(bounds: SpatialBounds, limit: number, grid: SpatialGridSizeM, offset: Exclude<PredictionTimelineOffset, 0>) {
  const key = JSON.stringify([bounds, limit, grid, offset]);
  let task = pending.get(key);
  if (!task) {
    task = fetchCompressedFrame(bounds, limit, grid, offset).finally(() => { pending.delete(key); });
    pending.set(key, task);
  }
  return task;
}

const readCompressedFrame = unstable_cache(freshFrame,
  ["timeline-environment-gzip-v1"], { revalidate: 300 });

export async function getEnvironmentFrame(
  bounds: SpatialBounds, limit: number, gridSizeM: SpatialGridSizeM,
  offset: Exclude<PredictionTimelineOffset, 0>,
) {
  const cached = await readCompressedFrame(bounds, limit, gridSizeM, offset);
  // Next revalidates stable keys in the background. Do not deliver an old
  // forecast while that happens, and do not create new disk files every minute.
  const frame = Date.now() - cached.storedAt >= 300_000
    ? await freshFrame(bounds, limit, gridSizeM, offset)
    : cached;
  const json = await decompress(Buffer.from(frame.compressed, "base64"));
  return spatialEnvironmentFrameSchema.parse(JSON.parse(json.toString()));
}
