import "server-only";

import { timingSafeEqual } from "node:crypto";
import { cataloniaSpatialBounds } from "@/data/regions";
import { bucketsForBounds } from "@/src/lib/map-query";
import { readTimelineGeneration, TIMELINE_CACHE_SECONDS } from "@/src/lib/prediction-timeline-generation";
import { predictionBucketUrl } from "@/src/lib/map-request-url";
import { readCurrentOverviewGeneration } from "@/src/lib/current-overview-generation-server";
import {
  getCachedGlobalMapPredictionCells, getCachedPredictionMapTimelineFrame, readCachedPredictionGeneration,
} from "@/src/lib/prediction-response-cache";

export function mapWarmTargets() {
  return ([2500, 10000, 5000] as const).flatMap((resolution) =>
    bucketsForBounds(cataloniaSpatialBounds, resolution, cataloniaSpatialBounds)
      .map((bounds) => ({ bounds, resolution, offset: 0 as const, url: predictionBucketUrl(bounds, "all", resolution) })),
  );
}

export function timelineWarmTargets() {
  return ([1, 2, 3, 4, 5, -3, -2, -1] as const).flatMap((offset) =>
    bucketsForBounds(cataloniaSpatialBounds, 5000, cataloniaSpatialBounds)
      .map((bounds) => ({ bounds, resolution: 5000 as const, offset,
        url: predictionBucketUrl(bounds, "all", 5000, offset) })),
  );
}

type Target = ReturnType<typeof mapWarmTargets>[number] | ReturnType<typeof timelineWarmTargets>[number];
type Result = { status: "warmed" | "unchanged" | "unavailable" | "incomplete"; completed: number; total: number };
type Dependencies = {
  generation: () => Promise<string | null>;
  load: (target: Target) => Promise<{ truncated: boolean }>;
  now?: () => number;
  targets?: () => Target[];
};

/** Two bounded reads at a time; retain successful targets across the 90-second run budget. */
export function createMapCacheWarmer({ generation, load, now = Date.now, targets: getTargets = mapWarmTargets }: Dependencies) {
  let completedKey: string | null = null;
  let completedAt = 0;
  let progressKey: string | null = null;
  const finished = new Set<string>();
  let pending: Promise<Result> | null = null;
  async function run(): Promise<Result> {
    const targets = getTargets();
    if (targets.length > 512) throw new Error("Map warming target bound exceeded");
    const initial = await generation();
    if (!initial) return { status: "unavailable", completed: 0, total: targets.length };
    const day = new Date(now()).toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
    const key = `${initial}:${day}`;
    if (key === completedKey && now() - completedAt < TIMELINE_CACHE_SECONDS * 1000) return { status: "unchanged", completed: 0, total: targets.length };
    if (progressKey !== key || key === completedKey) {
      finished.clear();
      progressKey = key;
      completedKey = null;
    }
    const remaining = targets.filter((target) => !finished.has(target.url));
    const deadline = now() + 90_000;
    let next = 0;
    await Promise.all(Array.from({ length: 2 }, async () => {
      while (next < remaining.length && now() < deadline) {
        const target = remaining[next++];
        try {
          if (!(await load(target)).truncated) finished.add(target.url);
        } catch { /* Keep serving published data; retry incomplete warming next time. */ }
      }
    }));
    const unchanged = await generation() === initial;
    const completed = finished.size;
    if (!unchanged) progressKey = null;
    const status = completed === targets.length && unchanged ? "warmed" : "incomplete";
    if (status === "warmed") { completedKey = key; completedAt = now(); }
    return { status, completed, total: targets.length };
  }
  return () => {
    if (!pending) pending = run().finally(() => { pending = null; });
    return pending;
  };
}

export const warmMapCaches = createMapCacheWarmer({
  targets: () => [...mapWarmTargets(), ...timelineWarmTargets()],
  generation: async () => {
    const [published, cached, timeline] = await Promise.all([
      readCurrentOverviewGeneration(), readCachedPredictionGeneration(), readTimelineGeneration(),
    ]);
    // Wait for the short generation lookup cache to catch up. Never mark old
    // scored entries as warmed for a newly published generation.
    return !published.startsWith("fallback:") && published === cached && timeline ? timeline : null;
  },
  load: ({ bounds, resolution, offset }) => offset === 0
    ? getCachedGlobalMapPredictionCells(bounds, 1000, resolution)
    : getCachedPredictionMapTimelineFrame("all", bounds, 1000, resolution, offset),
});

export function isMapWarmRequestAuthorized(headers: Headers) {
  const secret = process.env.CACHE_WARM_SECRET;
  const authorization = headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(authorization.slice(7));
  return expected.length === received.length && timingSafeEqual(expected, received);
}
