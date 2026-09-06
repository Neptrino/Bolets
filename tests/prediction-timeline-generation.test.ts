import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ observed: vi.fn(), entries: new Map<string, unknown>() }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => Promise<unknown>) => async () => {
  if (!mocks.entries.has("value")) mocks.entries.set("value", await fn());
  return mocks.entries.get("value");
} }));
vi.mock("@/src/lib/current-overview-generation-server", () => ({ readCurrentOverviewGeneration: mocks.observed }));
import { readTimelineGeneration } from "@/src/lib/prediction-timeline-generation";
const forecast = { snapshot_date: "2026-09-05", generated_at: "2026-09-05T00:00:00Z", completed_at: "2026-09-05T01:00:00Z" };
beforeEach(() => {
  mocks.entries.clear();
  mocks.observed.mockResolvedValue("coarse:1|territorial:1");
  vi.stubEnv("SUPABASE_URL", "https://database.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-06T11:59:59Z"));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("timeline publication identity", () => {
  it("checks forecast expiry even while the publication metadata is cached", async () => {
    const fetch = vi.fn(async () => Response.json([forecast]));
    vi.stubGlobal("fetch", fetch);
    expect(await readTimelineGeneration()).toMatch(/\|valid$/);
    vi.setSystemTime(new Date("2026-09-06T12:00:01Z"));
    expect(await readTimelineGeneration()).toMatch(/\|expired$/);
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = new URL((fetch.mock.calls as unknown as [string][])[0][0]);
    expect(url.searchParams.get("completed_at")).toBe("not.is.null");
    expect(url.searchParams.get("limit")).toBe("1");
  });
  it("coalesces metadata reads and detects a replacement forecast after 30 seconds", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([forecast]))
      .mockResolvedValueOnce(Response.json([{ ...forecast, completed_at: "2026-09-05T02:00:00Z" }]));
    vi.stubGlobal("fetch", fetch);
    const values = await Promise.all([readTimelineGeneration(), readTimelineGeneration()]);
    expect(values[0]).toBe(values[1]);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date("2026-09-06T12:00:30Z"));
    expect(await readTimelineGeneration()).not.toBe(values[0]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each(["http", "schema", "observed"])("falls back when the %s boundary is unavailable", async (failure) => {
    vi.stubGlobal("fetch", vi.fn(async () => failure === "http" ? new Response(null, { status: 503 })
      : Response.json(failure === "schema" ? [{ generated_at: "bad" }] : [forecast])));
    if (failure === "observed") mocks.observed.mockResolvedValue("fallback:1");
    expect(await readTimelineGeneration()).toBeNull();
  });
});
