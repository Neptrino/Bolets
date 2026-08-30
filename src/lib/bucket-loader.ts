import { fetchJsonWithRetry } from "@/src/lib/fetch-json";
import {
  readMapBucketPayload,
  writeMapBucketPayload,
} from "@/src/lib/map-bucket-cache";
import type { SpatialBounds } from "@/src/lib/types";

/**
 * Bucket requests are small and numerous. Network work stays deliberately
 * bounded, while local Cache Storage lookups can fan out more widely.
 */
const DEFAULT_CONCURRENCY = 4;
const CACHE_LOOKUP_CONCURRENCY = 32;

function concurrencyGate(limit: number) {
  let active = 0;
  const waiters: Array<() => void> = [];

  const acquire = async () => {
    if (active < limit) {
      active += 1;
      return;
    }
    await new Promise<void>((resolve) => waiters.push(resolve));
  };

  const release = () => {
    const next = waiters.shift();
    if (next) next();
    else active -= 1;
  };

  return async <R>(task: () => Promise<R>) => {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  };
}

export type BucketPayload<T> = {
  cells: T[];
  truncated: boolean;
};

export type BucketLoadOutcome = {
  succeeded: number;
  failed: number;
};

/**
 * Loads one request per bucket and reports each one as it settles, so the map
 * can paint the buckets it already holds instead of waiting for the slowest.
 * A single signal supersedes the whole batch, because every bucket in a batch
 * shares the viewport and species that produced it.
 *
 * Failures are counted rather than thrown: offline, a batch where only some
 * buckets are cached is the normal case, and the caller reports the gap.
 */
export async function loadBucketedCells<T>(
  buckets: SpatialBounds[],
  buildUrl: (bucket: SpatialBounds) => string,
  signal: AbortSignal,
  onBucketSettled: (payload: BucketPayload<T>, bucket: SpatialBounds) => void,
  { concurrency = DEFAULT_CONCURRENCY, attempts = 2, timeoutMs, inFlight }: {
    concurrency?: number;
    attempts?: number;
    timeoutMs?: number;
    /**
     * Buckets already being fetched by an earlier, overlapping viewport. A pan
     * that re-exposes such a bucket waits for the request in progress instead
     * of issuing a second one for the same ground.
     */
    inFlight?: Map<string, Promise<void>>;
  } = {},
): Promise<BucketLoadOutcome> {
  const networkConcurrency = Math.max(1, Math.floor(concurrency));
  const withNetworkSlot = concurrencyGate(networkConcurrency);
  let nextIndex = 0;
  let succeeded = 0;
  let failed = 0;

  const runWorker = async () => {
    while (nextIndex < buckets.length) {
      if (signal.aborted) return;
      const bucket = buckets[nextIndex];
      nextIndex += 1;
      const url = buildUrl(bucket);
      const pending = inFlight?.get(url);
      if (pending) {
        // The owning batch stores the payload; waiting here only needs to know
        // whether the bucket became available.
        try {
          await pending;
          succeeded += 1;
        } catch {
          failed += 1;
        }
        continue;
      }
      const task = (async () => {
        const cached = await readMapBucketPayload<T>(url);
        if (cached) {
          onBucketSettled(cached, bucket);
          return;
        }
        // Deliberately not the run's signal. A registered request outlives the
        // viewport that asked for it, and a later viewport may be waiting on
        // it: cancelling it when this run is superseded would fail that
        // waiter's bucket for no reason. `fetchJsonWithRetry` applies its own
        // deadline, so nothing here can hang.
        const payload = await withNetworkSlot(() =>
          fetchJsonWithRetry<BucketPayload<T>>(
            url,
            new AbortController().signal,
            attempts,
            timeoutMs,
          ),
        );
        // Always store, even if this run no longer cares. The response is
        // already paid for and the next viewport over this ground will use it.
        onBucketSettled(payload, bucket);
        await writeMapBucketPayload(url, payload);
      })();
      inFlight?.set(url, task);
      try {
        await task;
        if (signal.aborted) return;
        succeeded += 1;
      } catch {
        if (signal.aborted) return;
        failed += 1;
      } finally {
        if (inFlight?.get(url) === task) inFlight.delete(url);
      }
    }
  };

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          Math.max(CACHE_LOOKUP_CONCURRENCY, networkConcurrency),
          buckets.length,
        ),
      },
      runWorker,
    ),
  );
  return { succeeded, failed };
}

export type BucketCoverage = {
  published: number;
  excluded: number;
  withheld: number;
  truncated: boolean;
  /**
   * At least one bucket in the viewport never resolved. Offline this is the
   * normal way a partly downloaded zone presents, so the map says so rather
   * than passing a viewport with holes off as complete.
   */
  incomplete: boolean;
};

/**
 * Summarizes a merged set of prediction cells. A published cell carries a
 * positive score, a verified zero is excluded, and anything without a score is
 * withheld — the same three-way split a single-request viewport reported.
 */
export function summarizeBucketCoverage(
  cells: Iterable<{ score: number | null }>,
  { truncated, failed }: { truncated: boolean; failed: number },
): BucketCoverage {
  let published = 0;
  let excluded = 0;
  let withheld = 0;
  for (const cell of cells) {
    if (cell.score === null) withheld += 1;
    else if (cell.score > 0) published += 1;
    else excluded += 1;
  }
  return { published, excluded, withheld, truncated, incomplete: failed > 0 };
}
