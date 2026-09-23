import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import sharp from "sharp";

import type { RainfallMapCell } from "@/components/region-map/rainfall-raster";
import { fetchGlobalEnvironment } from "@/src/lib/global-predictions";
import {
  RAIN_MAP_GRID_SIZE_M,
  RAIN_MAP_HEIGHT,
  RAIN_MAP_WIDTH,
  rainMapOverlaySvg,
  rainMapRaster,
  rainMapReadBounds,
  rainMapWmsUrl,
} from "@/src/lib/rain-map";
import type { RainfallCellReading } from "@/src/lib/rain-overview";

/**
 * One read of the coarse condition cache feeds both the painted map and the
 * territorial table, so the picture and the numbers beside it always describe
 * the same cells and the same publication.
 */

/**
 * The coarse condition cache republishes once a day, early morning; an hour
 * picks up the new publication without re-reading per visit.
 */
export const RAIN_SNAPSHOT_REVALIDATE_SECONDS = 60 * 60;

export interface RainfallSnapshot {
  mapCells: RainfallMapCell[];
  readings: RainfallCellReading[];
  /** Latest cell observation in the read, as an ISO timestamp. */
  observedAt: string | null;
  /** Provider credits carried by the cells. */
  sources: string[];
  incomplete: boolean;
}

async function readRainfall(): Promise<RainfallSnapshot> {
  const payloads = await Promise.all(rainMapReadBounds().map((bounds) =>
    fetchGlobalEnvironment(bounds, 1000, RAIN_MAP_GRID_SIZE_M),
  ));
  const mapCells = new Map<string, RainfallMapCell>();
  const readings = new Map<string, RainfallCellReading>();
  const sources = new Set<string>();
  let observedAt: string | null = null;
  let incomplete = payloads.some((payload) => payload.truncated);

  for (const payload of payloads) {
    for (const cell of payload.cells) {
      const [[west, south], [east, north]] = cell.bounds;
      const rainfall = cell.values.rainfall7dMm;
      mapCells.set(cell.cellId, {
        cellId: cell.cellId,
        gridSizeM: cell.gridSizeM,
        cellBounds: cell.bounds,
        rainfallMm: typeof rainfall === "number" ? rainfall : null,
      });
      readings.set(cell.cellId, {
        cellId: cell.cellId,
        centre: [(west + east) / 2, (south + north) / 2],
        rainfall7dMm: cell.values.rainfall7dMm,
        rainfall14dMm: cell.values.rainfall14dMm,
        rainfallDays7d: cell.values.rainfallDays7d,
        drySpellDays: cell.values.drySpellDays,
      });
      for (const source of cell.source) sources.add(source);
      const cellObservedAt = cell.values.weatherObservedAt ?? cell.observedAt;
      if (!observedAt || cellObservedAt > observedAt) observedAt = cellObservedAt;
      if (cell.stale) incomplete = true;
    }
  }

  if (mapCells.size === 0) throw new Error("The rain read returned no cells");
  return {
    mapCells: [...mapCells.values()],
    readings: [...readings.values()],
    observedAt,
    sources: [...sources],
    incomplete,
  };
}

/**
 * Two layers, matching the overview caches: `unstable_cache` shares one read
 * between the page and the map image across requests, and React `cache`
 * deduplicates within a single render. A failed read is never cached, so the
 * next request retries instead of freezing the failure for an hour.
 */
const loadCachedRainfall = unstable_cache(
  readRainfall,
  ["rain-snapshot-7d-5km-v1"],
  { revalidate: RAIN_SNAPSHOT_REVALIDATE_SECONDS, tags: ["rain-snapshot"] },
);

export const loadRainfallSnapshot = cache(loadCachedRainfall);

async function fetchBaseMap() {
  const response = await fetch(rainMapWmsUrl(), {
    cache: "force-cache",
    signal: AbortSignal.timeout(10_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.startsWith("image/png")) {
    throw new Error(`ICGC map returned ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function paintRainMap(): Promise<Buffer> {
  const [baseMap, snapshot] = await Promise.all([fetchBaseMap(), loadRainfallSnapshot()]);
  const raster = rainMapRaster(snapshot.mapCells);
  if (!raster) throw new Error("The rain map contained no measured cells");

  const surface = await sharp(Buffer.from(raster.pixels), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  }).png().toBuffer();
  const overlay = Buffer.from(
    rainMapOverlaySvg(raster, `data:image/png;base64,${surface.toString("base64")}`),
  );
  return sharp(baseMap)
    .resize(RAIN_MAP_WIDTH, RAIN_MAP_HEIGHT, { fit: "fill" })
    .composite([{ input: overlay, blend: "over" }])
    .webp({ quality: 86 })
    .toBuffer();
}

/**
 * The painted map only changes when the reading behind it does, so it is
 * rendered once per publication and held in the process. Concurrent misses
 * share the render rather than running several sharp pipelines at once, the
 * same way generated field cards coalesce their cold renders.
 */
let paintedMap: { key: string; image: Buffer } | null = null;
let pendingMap: { key: string; task: Promise<Buffer> } | null = null;

export async function renderRainMap(): Promise<Buffer> {
  const snapshot = await loadRainfallSnapshot();
  const key = snapshot.observedAt ?? "unknown";
  if (paintedMap?.key === key) return paintedMap.image;
  if (pendingMap?.key === key) return pendingMap.task;

  const task = paintRainMap();
  pendingMap = { key, task };
  try {
    const image = await task;
    paintedMap = { key, image };
    return image;
  } finally {
    if (pendingMap?.task === task) pendingMap = null;
  }
}
