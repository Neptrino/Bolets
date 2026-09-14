import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  entries: new Map<string, Promise<unknown>>(),
  generation: vi.fn(async () => "publication-1"),
  summary: vi.fn(),
}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>, keys: string[]) =>
  (...args: unknown[]) => {
    const key = JSON.stringify([fn.toString(), keys, args]);
    if (!state.entries.has(key)) {
      state.entries.set(key, fn(...args).catch((error) => { state.entries.delete(key); throw error; }));
    }
    return state.entries.get(key)!;
  },
}));
vi.mock("@/src/lib/current-overview-generation-server", () => ({ readCurrentOverviewGeneration: state.generation }));
vi.mock("@/src/lib/current-overview", () => ({ DAILY_OVERVIEW_REVALIDATE_SECONDS: 43_200 }));
vi.mock("@/src/lib/predictions", () => ({ getAreaPredictionSummary: state.summary }));
import { loadLocalGuideCondition, localGuideConditionPeriod } from "@/src/lib/local-guide-conditions-server";

const bounds = { west: 1, east: 2, south: 41, north: 42 };
const args = ["boletus-edulis", "montseny/viladrau", "montseny", bounds] as const;
const complete = { snapshot: { stale: false }, result: { score: 0, missingComponents: [] } };
beforeEach(() => {
  state.entries.clear();
  state.summary.mockReset().mockResolvedValue(complete);
  state.generation.mockReset().mockResolvedValue("publication-1");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T08:00:00Z"));
});
afterEach(() => { vi.useRealTimers(); });

describe("local condition cache", () => {
  it("warms the same semantic entry that a visitor reads, including valid zero scores", async () => {
    await loadLocalGuideCondition(...args, true);
    expect(await loadLocalGuideCondition(...args)).toEqual(complete);
    expect(state.summary).toHaveBeenCalledTimes(1);
    expect(state.summary).toHaveBeenCalledWith(args[0], { slug: args[1], regionId: args[2], bounds },
      { generation: "publication-1", background: true });
  });

  it("coalesces simultaneous warming and visitors, and releases rejected work", async () => {
    let release!: (value: typeof complete) => void;
    state.summary.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const first = loadLocalGuideCondition(...args);
    const second = loadLocalGuideCondition(...args, true);
    await Promise.resolve();
    expect(state.summary).toHaveBeenCalledTimes(1);
    release(complete);
    expect(await first).toEqual(await second);
  });

  it("refreshes both the summary and upstream read identity on publication changes", async () => {
    await loadLocalGuideCondition(...args);
    state.generation.mockResolvedValue("publication-2");
    await loadLocalGuideCondition(...args);
    expect(state.summary).toHaveBeenCalledTimes(2);
    expect(state.summary.mock.calls[1]![2]).toEqual({ generation: "publication-2", background: false });
  });

  it.each([
    { snapshot: { stale: true }, result: { score: 5, missingComponents: [] } },
    { snapshot: { stale: false }, result: { score: null, missingComponents: [] } },
    { snapshot: { stale: false }, result: { score: 5, missingComponents: ["water"] } },
  ])("retries degraded summaries after recovery", async (degraded) => {
    state.summary.mockResolvedValueOnce(degraded);
    await expect(loadLocalGuideCondition(...args, true)).rejects.toThrow("incomplete");
    expect(await loadLocalGuideCondition(...args)).toEqual(complete);
    expect(state.summary).toHaveBeenCalledTimes(2);
  });

  it("retries upstream errors without retaining failed entries", async () => {
    state.summary.mockRejectedValueOnce(new Error("timeout"));
    await expect(loadLocalGuideCondition(...args)).rejects.toThrow("timeout");
    expect(await loadLocalGuideCondition(...args)).toEqual(complete);
  });

  it("bounds cached freshness at twelve-hour and Catalonia civil-day boundaries", async () => {
    await loadLocalGuideCondition(...args);
    vi.setSystemTime(new Date("2026-09-14T12:00:00Z"));
    await loadLocalGuideCondition(...args);
    expect(state.summary).toHaveBeenCalledTimes(2);
    const beforeMidnight = localGuideConditionPeriod(Date.parse("2026-09-14T21:59:59Z"));
    expect(localGuideConditionPeriod(Date.parse("2026-09-14T22:00:00Z"))).not.toBe(beforeMidnight);
  });
});
