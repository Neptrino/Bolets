import { afterEach, describe, expect, it, vi } from "vitest";
import { createBoundedWorkQueue, WorkQueueBusyError } from "@/supabase/functions/_shared/bounded-work-queue";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};
afterEach(() => vi.useRealTimers());

describe("bounded spatial work", () => {
  it("limits a burst of distinct jobs, including body consumption, and releases failed jobs", async () => {
    const run = createBoundedWorkQueue({ concurrency: 2, maxQueued: 120, maxWaitMs: 1000 });
    let active = 0, peak = 0;
    const body = deferred();
    const jobs = Array.from({ length: 110 }, (_, i) => run(async () => {
      active++; peak = Math.max(peak, active);
      await body.promise;
      active--;
      if (i === 0) throw new Error("body failed");
      return i;
    }));
    await Promise.resolve();
    expect(active).toBe(2);
    body.resolve();
    const results = await Promise.allSettled(jobs);
    expect(peak).toBe(2);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(109);
    await expect(run(async () => "recovered")).resolves.toBe("recovered");
  });

  it("reserves a current-read slot and prioritizes current work over queued frames", async () => {
    const run = createBoundedWorkQueue({ concurrency: 2, backgroundConcurrency: 1, maxQueued: 8, maxWaitMs: 1000 });
    const first = deferred(), second = deferred();
    const order: string[] = [];
    const a = run(async () => { order.push("frame1"); await first.promise; }, { background: true });
    const b = run(async () => { order.push("frame2"); }, { background: true });
    const c = run(async () => { order.push("current1"); await second.promise; });
    const d = run(async () => { order.push("current2"); });
    await Promise.resolve();
    expect(order).toEqual(["frame1", "current1"]);
    first.resolve();
    await Promise.all([a, d]);
    expect(order.indexOf("current2")).toBeLessThan(order.indexOf("frame2") === -1 ? Infinity : order.indexOf("frame2"));
    second.resolve();
    await Promise.all([b, c]);
    expect(order).toEqual(["frame1", "current1", "current2", "frame2"]);
  });

  it("bounds queue length and time and never runs rejected jobs later", async () => {
    vi.useFakeTimers();
    const run = createBoundedWorkQueue({ concurrency: 1, maxQueued: 1, maxWaitMs: 20 });
    const blocker = deferred();
    const first = run(() => blocker.promise);
    const task = vi.fn();
    const queued = expect(run(task)).rejects.toBeInstanceOf(WorkQueueBusyError);
    await expect(run(task)).rejects.toBeInstanceOf(WorkQueueBusyError);
    await vi.advanceTimersByTimeAsync(20);
    await queued;
    blocker.resolve(); await first;
    expect(task).not.toHaveBeenCalled();
    await expect(run(async () => 1)).resolves.toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("removes aborted waiters without starting them or releasing active allocations early", async () => {
    const run = createBoundedWorkQueue({ concurrency: 1, maxQueued: 2, maxWaitMs: 1000 });
    const activeAbort = new AbortController(), queuedAbort = new AbortController();
    const blocker = deferred(), started = vi.fn();
    const first = run(() => blocker.promise, { signal: activeAbort.signal });
    await Promise.resolve();
    const cancelled = expect(run(started, { signal: queuedAbort.signal })).rejects.toThrow("queued cancellation");
    queuedAbort.abort(new Error("queued cancellation"));
    await cancelled;
    const next = run(started);
    activeAbort.abort();
    await Promise.resolve();
    expect(started).not.toHaveBeenCalled();
    blocker.resolve(); await first; await next;
    expect(started).toHaveBeenCalledOnce();
    await expect(run(started, { signal: queuedAbort.signal })).rejects.toThrow("queued cancellation");
  });
});
