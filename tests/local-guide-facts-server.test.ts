import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ read: vi.fn(), aggregate: vi.fn(), entries: new Map<string, Promise<unknown>>() }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => (...args: unknown[]) => {
  const key = JSON.stringify(args);
  if (!state.entries.has(key)) state.entries.set(key, fn(...args).catch((error) => {
    state.entries.delete(key); throw error;
  }));
  return state.entries.get(key);
} }));
vi.mock("@/src/lib/habitat", () => ({ getPotentialHabitatCoverage: state.read }));
vi.mock("@/src/lib/local-guide-facts", () => ({ aggregateLocalGuideFacts: state.aggregate }));
import { loadLocalGuideFacts } from "@/src/lib/local-guide-facts-server";
const args = ["boletus-edulis", "montseny/viladrau", { west: 1, east: 2, south: 41, north: 42 }, "entorn"] as const;
beforeEach(() => { state.entries.clear(); state.read.mockReset(); state.aggregate.mockReset(); });
it("retries truncated evidence instead of caching the unavailable placeholder", async () => {
  state.read.mockResolvedValueOnce({ truncated: true, cells: [] }).mockResolvedValue({ truncated: false, cells: [] });
  state.aggregate.mockReturnValue({ facts: ["verified"] });
  await expect(loadLocalGuideFacts(...args)).rejects.toThrow("truncated");
  expect(state.aggregate).not.toHaveBeenCalled();
  expect(await loadLocalGuideFacts(...args)).toEqual({ facts: ["verified"] });
  expect(state.read).toHaveBeenCalledTimes(2);
});
it("retains a verified empty habitat result", async () => {
  state.read.mockResolvedValue({ truncated: false, cells: [] });
  state.aggregate.mockReturnValue(null);
  expect(await loadLocalGuideFacts(...args)).toBeNull();
  expect(await loadLocalGuideFacts(...args)).toBeNull();
  expect(state.read).toHaveBeenCalledTimes(1);
});
