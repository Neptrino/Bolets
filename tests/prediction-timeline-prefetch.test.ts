import { afterEach, describe, expect, it, vi } from "vitest";
import { createBucketNetworkGate, loadBucketedCells } from "@/src/lib/bucket-loader";
import { predictionBucketUrl } from "@/src/lib/map-request-url";
import { nextTimelineOffset, prefetchTimelineFrames } from "@/src/lib/prediction-timeline-prefetch";
import type { PredictionMapCell } from "@/src/lib/types";
vi.mock("@/src/lib/map-bucket-cache", () => ({ readMapBucketPayload: async () => null, writeMapBucketPayload: async () => undefined }));
const bounds = { west: 1, south: 41, east: 1.5, north: 41.5 };
const payload = { cells: [{ cellId: "test", score: 50 }] as PredictionMapCell[], truncated: false };
function setup() {
  const controller = new AbortController();
  const store = new Map<string, PredictionMapCell[]>();
  return { controller, options: {
    buckets: () => ({ bounds: [bounds], resolution: 5000 as const }), speciesId: "all", offset: 0 as const,
    signal: controller.signal, store, inFlight: new Map<string, Promise<void>>(), networkGate: createBucketNetworkGate(),
    remember: (url: string, cells: PredictionMapCell[]) => { store.set(url, cells); },
  } };
}
afterEach(() => vi.unstubAllGlobals());
describe("timeline buffering", () => {
  it("loads only the next two frames with canonical URLs and skips buffered data", async () => {
    const { options } = setup();
    const fetch = vi.fn(async () => Response.json(payload));
    vi.stubGlobal("fetch", fetch);
    await prefetchTimelineFrames(options);
    expect((fetch.mock.calls as unknown as [string][]).map((call) => call[0])).toEqual([
      predictionBucketUrl(bounds, "all", 5000, 1), predictionBucketUrl(bounds, "all", 5000, 2),
    ]);
    await prefetchTimelineFrames(options);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(nextTimelineOffset(5)).toBe(-3);
    expect(nextTimelineOffset(-1)).toBe(0);
  });
  it("lets foreground playback adopt a pending bucket after prefetch cancellation", async () => {
    const { controller, options } = setup();
    let finish!: (response: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetch);
    const prefetch = prefetchTimelineFrames(options);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    controller.abort();
    const url = predictionBucketUrl(bounds, "all", 5000, 1);
    const foreground = loadBucketedCells([bounds], () => url, new AbortController().signal, vi.fn(),
      { inFlight: options.inFlight, networkGate: options.networkGate });
    finish(Response.json(payload));
    await Promise.all([prefetch, foreground]);
    expect(options.store.get(url)).toEqual(payload.cells);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(options.inFlight.size).toBe(0);
  });
  it("never promotes a truncated speculative response to a complete frame", async () => {
    const { options } = setup();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ...payload, truncated: true })));
    await prefetchTimelineFrames(options);
    expect(options.store.size).toBe(0);
  });
  it("does not start requests after cancellation", async () => {
    const { controller, options } = setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    controller.abort();
    options.buckets = vi.fn(options.buckets);
    await prefetchTimelineFrames(options);
    expect(options.buckets).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
