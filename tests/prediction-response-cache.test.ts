import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheMocks = vi.hoisted(() => ({
  global: vi.fn(),
  timeline: vi.fn(),
  timelineGeneration: vi.fn(async (): Promise<string | null> => "observed:1|forecast:1|valid"),
  species: vi.fn(),
  generation: vi.fn(() => Promise.resolve("generation:1")),
  registrations: [] as Array<{
    keyParts: string[];
    options: { revalidate?: number; tags?: string[] };
  }>,
}));

vi.mock("next/cache", () => ({
  unstable_cache: (
    callback: (...args: unknown[]) => unknown,
    keyParts: string[],
    options: { revalidate?: number; tags?: string[] },
  ) => {
    cacheMocks.registrations.push({ keyParts, options });
    const entries = new Map<string, unknown>();
    return async (...args: unknown[]) => {
      const key = JSON.stringify(args);
      if (entries.has(key)) return entries.get(key);
      // Model separate requests reaching a cache miss before its result is stored.
      const result = await callback(...args);
      entries.set(key, result);
      return result;
    };
  },
}));

vi.mock("@/src/lib/global-predictions", () => ({
  getGlobalPredictionCells: cacheMocks.global,
  globalSpeciesSetKey: "test-species-set",
}));

vi.mock("@/src/lib/prediction-timeline-generation", () => ({
  readTimelineGeneration: cacheMocks.timelineGeneration, TIMELINE_CACHE_SECONDS: 3600,
}));

vi.mock("@/src/lib/prediction-map-timeline", () => ({ getPredictionMapTimelineFrame: cacheMocks.timeline }));

vi.mock("@/src/lib/predictions", () => ({
  getPredictionCells: cacheMocks.species,
}));

vi.mock("@/src/lib/current-overview-generation-server", () => ({
  readCurrentOverviewGeneration: cacheMocks.generation,
}));

import {
  getCachedPredictionMapTimelineFrame,
  getCachedGlobalMapPredictionCells,
  getCachedSpeciesMapPredictionCells,
} from "@/src/lib/prediction-response-cache";

describe("prediction response cache", () => {
  beforeEach(() => {
    cacheMocks.global.mockReset();
    cacheMocks.species.mockReset();
  });

  it("caches the fully scored combined bucket by its semantic arguments", async () => {
    cacheMocks.global.mockResolvedValue({ cells: [], truncated: false });
    const bounds = { west: 1, south: 41, east: 1.25, north: 41.25 };

    await getCachedGlobalMapPredictionCells(bounds, 1000, 2500);
    await getCachedGlobalMapPredictionCells(bounds, 1000, 2500);

    expect(cacheMocks.global).toHaveBeenCalledTimes(1);
    expect(cacheMocks.global).toHaveBeenCalledWith(bounds, 1000, 2500);
  });

  it("uses the same five-minute server cache for single-species map buckets", async () => {
    cacheMocks.species.mockResolvedValue({ cells: [], truncated: false });
    const bounds = { west: 1, south: 41, east: 1.25, north: 41.25 };

    await getCachedSpeciesMapPredictionCells("boletus-edulis", bounds, 1000, 2500);
    await getCachedSpeciesMapPredictionCells("boletus-edulis", bounds, 1000, 2500);

    expect(cacheMocks.species).toHaveBeenCalledTimes(1);
    expect(cacheMocks.species).toHaveBeenCalledWith(
      "boletus-edulis",
      bounds,
      1000,
      2500,
      true,
    );
    expect(cacheMocks.registrations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        options: { revalidate: 300, tags: ["prediction-api-map"] },
      }),
      expect.objectContaining({
        options: { revalidate: 86_400, tags: ["prediction-api-map"] },
      }),
      expect.objectContaining({
        options: { revalidate: 30 },
      }),
    ]));
  });
});

it("reuses scored frames beyond a minute and invalidates publications, forecast expiry and the hourly bound", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    vi.setSystemTime(new Date("2026-09-05T02:00:00Z"));
    cacheMocks.timeline.mockReset().mockResolvedValue({ cells: [], truncated: false });
    const bounds = { west: 1, south: 41, east: 1.5, north: 41.5 };
    const read = () => getCachedPredictionMapTimelineFrame("all", bounds, 1000, 5000, 5);
    await Promise.all(Array.from({ length: 4 }, read));
    expect(cacheMocks.timeline).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date("2026-09-05T02:02:00Z"));
    await read();
    expect(cacheMocks.timeline).toHaveBeenCalledTimes(1);
    for (const generation of ["observed:2|forecast:1|valid", "observed:2|forecast:2|valid", "observed:2|forecast:2|expired"]) {
      cacheMocks.timelineGeneration.mockResolvedValue(generation);
      await read();
      expect(cacheMocks.timeline).toHaveBeenLastCalledWith("all", bounds, 1000, 5000, 5, generation);
    }
    expect(cacheMocks.timeline).toHaveBeenCalledTimes(4);
    await getCachedPredictionMapTimelineFrame("all", bounds, 1000, 5000, 4);
    await getCachedPredictionMapTimelineFrame("boletus-edulis", bounds, 1000, 5000, 5);
    expect(cacheMocks.timeline).toHaveBeenCalledTimes(6);
    vi.setSystemTime(new Date("2026-09-05T03:02:00Z"));
    await read();
    expect(cacheMocks.timeline).toHaveBeenCalledTimes(7);
  } finally { vi.useRealTimers(); }
});

it("bounds fallback frames to a minute when the publication check fails", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    vi.setSystemTime(new Date("2026-09-05T05:00:00Z"));
    cacheMocks.timelineGeneration.mockResolvedValue(null);
    cacheMocks.timeline.mockReset().mockResolvedValue({ cells: [], truncated: false });
    const read = () => getCachedPredictionMapTimelineFrame("all", { west: 1, south: 41, east: 1.5, north: 41.5 }, 1000, 5000, 1);
    await read(); await read();
    expect(cacheMocks.timeline).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date("2026-09-05T05:01:00Z"));
    await read();
    expect(cacheMocks.timeline).toHaveBeenCalledTimes(2);
  } finally { vi.useRealTimers(); }
});

it("shares concurrent cold species buckets and retries after a failed computation", async () => {
  const bounds = { west: 2.1, south: 42.1, east: 2.2, north: 42.2 };
  const read = () => getCachedSpeciesMapPredictionCells("boletus-edulis", bounds, 1000, 250);
  cacheMocks.species.mockReset();
  let reject!: (error: Error) => void;
  cacheMocks.species.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  const first = Promise.allSettled([read(), read(), read(), read()]);
  expect(cacheMocks.species).toHaveBeenCalledTimes(1);
  reject(new Error("Temporary upstream error"));
  expect((await first).every((result) => result.status === "rejected")).toBe(true);
  cacheMocks.species.mockResolvedValue({ cells: [], truncated: false });
  await Promise.all([read(), read(), read()]);
  expect(cacheMocks.species).toHaveBeenCalledTimes(2);
});

it("shares concurrent cold combined buckets without merging distinct resolutions", async () => {
  cacheMocks.global.mockReset().mockResolvedValue({ cells: [], truncated: false });
  const bounds = { west: 2.4, south: 42.1, east: 2.5, north: 42.2 };
  await Promise.all(Array.from({ length: 4 }, () => getCachedGlobalMapPredictionCells(bounds, 1000, 2500)));
  expect(cacheMocks.global).toHaveBeenCalledTimes(1);
  await getCachedGlobalMapPredictionCells(bounds, 1000, 5000);
  expect(cacheMocks.global).toHaveBeenCalledTimes(2);
});
