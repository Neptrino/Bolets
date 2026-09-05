import { describe, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import { createMapCacheWarmer, mapWarmTargets } from "@/src/lib/map-cache-warmer";
import { predictionBucketUrl } from "@/src/lib/map-request-url";

describe("map cache warmer", () => {
  it("uses bounded public buckets with the map's canonical URL builder", () => {
    const targets = mapWarmTargets();
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.length).toBeLessThanOrEqual(64);
    expect(new Set(targets.map((target) => target.url)).size).toBe(targets.length);
    for (const target of targets) {
      expect(target.resolution).toBeGreaterThanOrEqual(2500);
      expect(target.url).toBe(predictionBucketUrl(target.bounds, "all", target.resolution));
    }
  });

  it("coalesces runs, limits concurrency and warms only once per generation", async () => {
    let current = "generation-1";
    let active = 0;
    let max = 0;
    const load = vi.fn(async () => {
      max = Math.max(max, ++active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return { truncated: false };
    });
    const warm = createMapCacheWarmer({ generation: async () => current, load });
    const [first, duplicate] = await Promise.all([warm(), warm()]);
    expect(first).toEqual(duplicate);
    expect(first.status).toBe("warmed");
    expect(max).toBe(2);
    expect(load).toHaveBeenCalledTimes(mapWarmTargets().length);
    expect((await warm()).status).toBe("unchanged");
    current = "generation-2";
    expect((await warm()).status).toBe("warmed");
    expect(load).toHaveBeenCalledTimes(mapWarmTargets().length * 2);
  });

  it("retries truncated or failed runs and publication changes", async () => {
    const load = vi.fn(async () => ({ truncated: true }));
    const generation = vi.fn(async () => "generation-1");
    const warm = createMapCacheWarmer({ generation, load });
    expect((await warm()).status).toBe("incomplete");
    load.mockResolvedValue({ truncated: false });
    generation.mockResolvedValueOnce("generation-1").mockResolvedValueOnce("generation-2");
    expect((await warm()).status).toBe("incomplete");
    expect((await warm()).status).toBe("warmed");
  });

  it("does no work without a complete published generation", async () => {
    const load = vi.fn();
    const warm = createMapCacheWarmer({ generation: async () => null, load });
    expect((await warm()).status).toBe("unavailable");
    expect(load).not.toHaveBeenCalled();
  });
});
