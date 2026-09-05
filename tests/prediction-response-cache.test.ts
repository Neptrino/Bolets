import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheMocks = vi.hoisted(() => ({
  global: vi.fn(),
  timeline: vi.fn(),
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
    return (...args: unknown[]) => {
      const key = JSON.stringify(args);
      if (!entries.has(key)) entries.set(key, callback(...args));
      return entries.get(key);
    };
  },
}));

vi.mock("@/src/lib/global-predictions", () => ({
  getGlobalPredictionCells: cacheMocks.global,
  globalSpeciesSetKey: "test-species-set",
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

it("caches scored timeline frames separately by species and offset and expires after a minute", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    vi.setSystemTime(new Date("2026-09-05T02:00:00Z"));
    cacheMocks.timeline.mockResolvedValue({ cells: [], truncated: false });
    const bounds = { west: 1, south: 41, east: 1.5, north: 41.5 };
    await Promise.all(Array.from({ length: 4 }, () => getCachedPredictionMapTimelineFrame("all", bounds, 1000, 5000, 5)));
    expect(cacheMocks.timeline).toHaveBeenCalledTimes(1);
    await getCachedPredictionMapTimelineFrame("all", bounds, 1000, 5000, 4);
    await getCachedPredictionMapTimelineFrame("boletus-edulis", bounds, 1000, 5000, 5);
    expect(cacheMocks.timeline).toHaveBeenCalledTimes(3);
    vi.setSystemTime(new Date("2026-09-05T02:01:00Z"));
    await getCachedPredictionMapTimelineFrame("all", bounds, 1000, 5000, 5);
    expect(cacheMocks.timeline).toHaveBeenCalledTimes(4);
  } finally { vi.useRealTimers(); }
});
