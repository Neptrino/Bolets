import { afterEach, describe, expect, it, vi } from "vitest";
const cache = vi.hoisted(() => ({ values: new Map<string, { storedAt: number; compressed: string }>() }));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<{ storedAt: number; compressed: string }>) => async (...args: unknown[]) => {
    const key = JSON.stringify(args);
    if (!cache.values.has(key)) {
      const value = await fn(...args);
      if (JSON.stringify(value).length > 2 * 1024 * 1024) throw new Error("Next cache limit exceeded");
      cache.values.set(key, value);
    }
    return cache.values.get(key)!;
  },
}));
vi.mock("@/src/lib/spatial-service-auth.server", () => ({
  spatialServiceConfig: () => ({ url: "https://environment.test", key: "test-only" }),
}));
import { getEnvironmentFrame } from "@/src/lib/prediction-environment-frame";
const bounds = { west: 1, south: 41, east: 1.5, north: 41.5 };
function frame() {
  return {
    bounds, resolution: 5000, offset: 5, truncated: false,
    cells: Array.from({ length: 500 }, (_, index) => ({
      cellId: `cell-${index}`, regionId: "pirineus", gridSizeM: 5000,
      bounds: [[1, 41], [1.05, 41.05]], staticValues: {}, forecast: null,
      snapshot: {
        observedAt: "2026-09-05T00:00:00Z", source: ["provenance".repeat(500)],
        sourceResolutionM: 5000, confidence: "moderate", unavailableFields: ["temperatureAvg20dC"],
        values: { drySpellDays: 3, rainfall30dMm: 45.23 },
      },
    })),
  };
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); cache.values.clear(); });

describe("compressed timeline environment cache", () => {
  it("round trips a frame over 2 MiB without losing fields and coalesces concurrent reads", async () => {
    const payload = frame();
    expect(JSON.stringify(payload).length).toBeGreaterThan(2 * 1024 * 1024);
    const fetch = vi.fn(async () => Response.json(payload));
    vi.stubGlobal("fetch", fetch);
    const results = await Promise.all([getEnvironmentFrame(bounds, 1000, 5000, 5), getEnvironmentFrame(bounds, 1000, 5000, 5)]);
    expect(results[0]).toEqual(payload);
    expect(results[1]).toEqual(payload);
    await getEnvironmentFrame(bounds, 1000, 5000, 5);
    expect(fetch).toHaveBeenCalledOnce();
    expect([...cache.values.values()][0].compressed.length).toBeLessThan(2 * 1024 * 1024);
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }));
  });

  it("refreshes when the five-minute freshness deadline expires", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-05T01:00:00Z"));
    const fetch = vi.fn(async () => Response.json(frame()));
    vi.stubGlobal("fetch", fetch);
    await getEnvironmentFrame(bounds, 1000, 5000, 5);
    vi.setSystemTime(new Date("2026-09-05T01:05:00Z"));
    await getEnvironmentFrame(bounds, 1000, 5000, 5);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries a failed fetch and never caches invalid data", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("failed", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ cells: "bad" }))
      .mockResolvedValueOnce(Response.json(frame()));
    vi.stubGlobal("fetch", fetch);
    await expect(getEnvironmentFrame(bounds, 1000, 5000, 5)).rejects.toThrow("503");
    await expect(getEnvironmentFrame(bounds, 1000, 5000, 5)).rejects.toThrow();
    await expect(getEnvironmentFrame(bounds, 1000, 5000, 5)).resolves.toMatchObject({ offset: 5 });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

it("refetches environment inputs for a replacement publication inside the five-minute window", async () => {
  const fetch = vi.fn(async () => Response.json(frame()));
  vi.stubGlobal("fetch", fetch);
  await getEnvironmentFrame(bounds, 1000, 5000, 5, "generation-1");
  await getEnvironmentFrame(bounds, 1000, 5000, 5, "generation-1");
  await getEnvironmentFrame(bounds, 1000, 5000, 5, "generation-2");
  expect(fetch).toHaveBeenCalledTimes(2);
});
