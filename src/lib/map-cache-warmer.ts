import "server-only";

import { timingSafeEqual } from "node:crypto";
import { cataloniaSpatialBounds } from "@/data/regions";
import { bucketsForBounds } from "@/src/lib/map-query";
import { predictionBucketUrl } from "@/src/lib/map-request-url";
import { readCurrentOverviewGeneration } from "@/src/lib/current-overview-generation-server";
import {
  getCachedGlobalMapPredictionCells, readCachedPredictionGeneration,
} from "@/src/lib/prediction-response-cache";

export function mapWarmTargets() {
  return ([10000, 5000] as const).flatMap((resolution) =>
    bucketsForBounds(cataloniaSpatialBounds, resolution, cataloniaSpatialBounds)
      .map((bounds) => ({ bounds, resolution, url: predictionBucketUrl(bounds, "all", resolution) })),
  );
}

type Target = ReturnType<typeof mapWarmTargets>[number];
type Result = { status: "warmed" | "unchanged" | "unavailable" | "incomplete"; completed: number; total: number };
type Dependencies = {
  generation: () => Promise<string | null>;
  load: (target: Target) => Promise<{ truncated: boolean }>;
  now?: () => number;
};

/** One run per generation/day, two bounded reads at a time, retry partial runs. */
export function createMapCacheWarmer({ generation, load, now = Date.now }: Dependencies) {
  let completedKey: string | null = null;
  let pending: Promise<Result> | null = null;
  async function run(): Promise<Result> {
    const targets = mapWarmTargets();
    if (targets.length > 64) throw new Error("Map warming target bound exceeded");
    const initial = await generation();
    if (!initial) return { status: "unavailable", completed: 0, total: targets.length };
    const day = new Date(now()).toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
    const key = `${initial}:${day}`;
    if (key === completedKey) return { status: "unchanged", completed: 0, total: targets.length };
    const deadline = now() + 90_000;
    let next = 0;
    let completed = 0;
    await Promise.all(Array.from({ length: 2 }, async () => {
      while (next < targets.length && now() < deadline) {
        const target = targets[next++];
        try {
          if (!(await load(target)).truncated) completed++;
        } catch { /* Keep serving published data; retry incomplete warming next time. */ }
      }
    }));
    const unchanged = await generation() === initial;
    const status = completed === targets.length && unchanged ? "warmed" : "incomplete";
    if (status === "warmed") completedKey = key;
    return { status, completed, total: targets.length };
  }
  return () => {
    if (!pending) pending = run().finally(() => { pending = null; });
    return pending;
  };
}

export const warmMapCaches = createMapCacheWarmer({
  generation: async () => {
    const [published, cached] = await Promise.all([
      readCurrentOverviewGeneration(), readCachedPredictionGeneration(),
    ]);
    // Wait for the short generation lookup cache to catch up. Never mark old
    // scored entries as warmed for a newly published generation.
    return !published.startsWith("fallback:") && published === cached ? published : null;
  },
  load: ({ bounds, resolution }) => getCachedGlobalMapPredictionCells(bounds, 1000, resolution),
});

export function isMapWarmRequestAuthorized(headers: Headers) {
  const secret = process.env.CACHE_WARM_SECRET;
  const authorization = headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(authorization.slice(7));
  return expected.length === received.length && timingSafeEqual(expected, received);
}
