import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createBucketNetworkGate,
  loadBucketedCells,
  summarizeBucketCoverage,
} from "@/src/lib/bucket-loader";
import type { SpatialBounds } from "@/src/lib/types";

const bucket = (west: number): SpatialBounds => ({
  west,
  south: 41.2,
  east: west + 0.1,
  north: 41.3,
});

const url = (candidate: SpatialBounds) => `/api/predictions?west=${candidate.west}`;

function respondWith(
  handler: (requestUrl: string) => { status?: number; body?: unknown } | Promise<{ status?: number; body?: unknown }>,
) {
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
    const requestUrl = typeof input === "string" ? input : input.toString();
    const { status = 200, body = { cells: [], truncated: false } } = await handler(requestUrl);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("bucketed cell loading", () => {
  it("merges every bucket and reports each one as it settles", async () => {
    respondWith((requestUrl) => ({
      body: {
        cells: [{ cellId: `cell-${new URL(requestUrl, "https://x").searchParams.get("west")}` }],
        truncated: false,
      },
    }));
    const merged = new Map<string, { cellId: string }>();
    const outcome = await loadBucketedCells<{ cellId: string }>(
      [bucket(1.1), bucket(1.2), bucket(1.3)],
      url,
      new AbortController().signal,
      (payload) => {
        for (const cell of payload.cells) merged.set(cell.cellId, cell);
      },
    );

    expect(outcome).toEqual({ succeeded: 3, failed: 0 });
    expect([...merged.keys()].sort()).toEqual(["cell-1.1", "cell-1.2", "cell-1.3"]);
  });

  it("keeps the buckets that resolved when others fail", async () => {
    respondWith((requestUrl) =>
      requestUrl.includes("west=1.2")
        ? { status: 404 }
        : { body: { cells: [{ cellId: requestUrl }], truncated: false } },
    );
    const merged: string[] = [];
    const outcome = await loadBucketedCells<{ cellId: string }>(
      [bucket(1.1), bucket(1.2), bucket(1.3)],
      url,
      new AbortController().signal,
      (payload) => {
        for (const cell of payload.cells) merged.push(cell.cellId);
      },
    );

    expect(outcome).toEqual({ succeeded: 2, failed: 1 });
    expect(merged).toHaveLength(2);
  });

  it("automatically retries only missing buckets", async () => {
    const attempts = new Map<string, number>();
    respondWith((requestUrl) => {
      const count = (attempts.get(requestUrl) ?? 0) + 1;
      attempts.set(requestUrl, count);
      return requestUrl.includes("west=1.2") && count === 1
        ? { status: 503 }
        : { body: { cells: [{ cellId: requestUrl }], truncated: false } };
    });

    const outcome = await loadBucketedCells(
      [bucket(1.1), bucket(1.2), bucket(1.3)],
      url,
      new AbortController().signal,
      () => undefined,
      { attempts: 1, retryPasses: 1, retryDelayMs: 0 },
    );

    expect(outcome).toEqual({ succeeded: 3, failed: 0 });
    expect([...attempts.values()].sort()).toEqual([1, 1, 2]);
  });

  it("keeps a superseded batch's response but stops counting it", async () => {
    const controller = new AbortController();
    respondWith(() => {
      controller.abort();
      return { body: { cells: [{ cellId: "late" }], truncated: false } };
    });
    const merged: string[] = [];
    const outcome = await loadBucketedCells<{ cellId: string }>(
      [bucket(1.1), bucket(1.2)],
      url,
      controller.signal,
      (payload) => {
        for (const cell of payload.cells) merged.push(cell.cellId);
      },
    );

    // The response was already paid for, so it is stored for the viewport that
    // replaced this one; only the superseded run's own tally stops.
    expect(merged).toContain("late");
    expect(outcome.succeeded).toBe(0);
  });

  it("does not refetch a bucket an overlapping viewport is already loading", async () => {
    let release = () => undefined as void;
    const held = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    const requested: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      requested.push(typeof input === "string" ? input : input.toString());
      await held;
      return new Response(JSON.stringify({ cells: [], truncated: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }));

    const inFlight = new Map<string, Promise<void>>();
    const signal = new AbortController().signal;
    const shared = [bucket(1.1), bucket(1.2)];
    const first = loadBucketedCells(shared, url, signal, () => undefined, { inFlight });
    // A second pan re-exposing the same ground before the first settles.
    const second = loadBucketedCells(shared, url, signal, () => undefined, { inFlight });
    release();
    await Promise.all([first, second]);

    expect(requested).toHaveLength(2);
    expect(new Set(requested).size).toBe(2);
  });

  it("uses a fresh persistent bucket without touching the network", async () => {
    const cachedPayload = {
      cells: [{ cellId: "cached" }],
      truncated: false,
    };
    const cache = {
      match: vi.fn(async () => new Response(JSON.stringify(cachedPayload), {
        headers: {
          "Content-Type": "application/json",
          "x-bolets-cached-at": new Date().toISOString(),
        },
      })),
    };
    vi.stubGlobal("window", {
      caches: { open: vi.fn(async () => cache) },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const stored: string[] = [];

    const outcome = await loadBucketedCells<{ cellId: string }>(
      [bucket(1.1)],
      () => "https://bolets.test/api/predictions?west=1.1",
      new AbortController().signal,
      (payload) => stored.push(...payload.cells.map((cell) => cell.cellId)),
    );

    expect(outcome).toEqual({ succeeded: 1, failed: 0 });
    expect(stored).toEqual(["cached"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads persistent buckets in parallel without raising network concurrency", async () => {
    let activeCacheReads = 0;
    let maximumCacheReads = 0;
    const cache = {
      match: vi.fn(async () => {
        activeCacheReads += 1;
        maximumCacheReads = Math.max(maximumCacheReads, activeCacheReads);
        await new Promise((resolve) => setTimeout(resolve, 2));
        activeCacheReads -= 1;
        return new Response(JSON.stringify({ cells: [], truncated: false }), {
          headers: {
            "Content-Type": "application/json",
            "x-bolets-cached-at": new Date().toISOString(),
          },
        });
      }),
    };
    vi.stubGlobal("window", {
      caches: { open: vi.fn(async () => cache) },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await loadBucketedCells(
      Array.from({ length: 12 }, (_, index) => bucket(1 + index / 10)),
      (candidate) => `https://bolets.test${url(candidate)}`,
      new AbortController().signal,
      () => undefined,
      { concurrency: 2 },
    );

    expect(outcome).toEqual({ succeeded: 12, failed: 0 });
    expect(maximumCacheReads).toBeGreaterThan(4);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps cold network requests within the configured limit", async () => {
    let activeRequests = 0;
    let maximumRequests = 0;
    respondWith(async () => {
      activeRequests += 1;
      maximumRequests = Math.max(maximumRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 2));
      activeRequests -= 1;
      return { body: { cells: [], truncated: false } };
    });

    const outcome = await loadBucketedCells(
      Array.from({ length: 12 }, (_, index) => bucket(1 + index / 10)),
      url,
      new AbortController().signal,
      () => undefined,
      { concurrency: 3 },
    );

    expect(outcome).toEqual({ succeeded: 12, failed: 0 });
    expect(maximumRequests).toBe(3);
  });

  it("shares one concurrency limit across simultaneous frame loads", async () => {
    let activeRequests = 0;
    let maximumRequests = 0;
    respondWith(async () => {
      activeRequests += 1;
      maximumRequests = Math.max(maximumRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 2));
      activeRequests -= 1;
      return { body: { cells: [], truncated: false } };
    });
    const networkGate = createBucketNetworkGate(2);
    const signal = new AbortController().signal;

    await Promise.all([
      loadBucketedCells(
        [bucket(1.1), bucket(1.2), bucket(1.3)],
        (candidate) => `/api/predictions?frame=1&west=${candidate.west}`,
        signal,
        () => undefined,
        { concurrency: 4, networkGate },
      ),
      loadBucketedCells(
        [bucket(1.1), bucket(1.2), bucket(1.3)],
        (candidate) => `/api/predictions?frame=2&west=${candidate.west}`,
        signal,
        () => undefined,
        { concurrency: 4, networkGate },
      ),
    ]);

    expect(maximumRequests).toBe(2);
  });

  it("cancels queued obsolete frame buckets", async () => {
    let release = () => undefined as void;
    const held = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    const requested: string[] = [];
    respondWith(async (requestUrl) => {
      requested.push(requestUrl);
      await held;
      return { body: { cells: [], truncated: false } };
    });
    const controller = new AbortController();
    const loading = loadBucketedCells(
      [bucket(1.1), bucket(1.2), bucket(1.3)],
      url,
      controller.signal,
      () => undefined,
      {
        networkGate: createBucketNetworkGate(1),
        persistAfterAbort: false,
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    release();

    await expect(loading).resolves.toEqual({ succeeded: 0, failed: 0 });
    expect(requested).toHaveLength(1);
  });

  it("still delivers a bucket inherited from a run that was superseded", async () => {
    let release = () => undefined as void;
    const held = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    respondWith(async () => {
      await held;
      return { body: { cells: [{ cellId: "shared" }], truncated: false } };
    });

    const inFlight = new Map<string, Promise<void>>();
    const superseded = new AbortController();
    const stored: string[] = [];
    const first = loadBucketedCells<{ cellId: string }>(
      [bucket(1.1)],
      url,
      superseded.signal,
      (payload) => {
        for (const cell of payload.cells) stored.push(cell.cellId);
      },
      { inFlight },
    );
    // A species change tears the first run down while its request is open.
    superseded.abort();
    const second = loadBucketedCells<{ cellId: string }>(
      [bucket(1.1)],
      url,
      new AbortController().signal,
      () => undefined,
      { inFlight },
    );
    release();
    await first;

    // The inherited request must count as delivered, not as a failed bucket.
    expect(await second).toEqual({ succeeded: 1, failed: 0 });
    expect(stored).toEqual(["shared"]);
  });

  it("requests nothing when the viewport covers no bucket", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const outcome = await loadBucketedCells(
      [],
      url,
      new AbortController().signal,
      () => undefined,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(outcome).toEqual({ succeeded: 0, failed: 0 });
  });
});

describe("bucket coverage summary", () => {
  it("splits published, verified-zero and withheld cells", () => {
    expect(summarizeBucketCoverage(
      [{ score: 42 }, { score: 0 }, { score: null }, { score: 7 }],
      { truncated: false, failed: 0 },
    )).toEqual({
      published: 2,
      excluded: 1,
      withheld: 1,
      truncated: false,
      incomplete: false,
    });
  });

  it("marks a viewport incomplete when a bucket never resolved", () => {
    expect(summarizeBucketCoverage([{ score: 42 }], { truncated: false, failed: 1 }))
      .toMatchObject({ incomplete: true, published: 1 });
  });
});
