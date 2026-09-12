import { afterEach, describe, expect, it, vi } from "vitest";
import { createProgressiveUpdate } from "@/components/region-map/progressive-update";

afterEach(() => vi.useRealTimers());

describe("progressive map updates", () => {
  it("coalesces a burst but continues painting before the complete batch arrives", () => {
    vi.useFakeTimers();
    const update = vi.fn();
    const progress = createProgressiveUpdate(update);
    for (let i = 0; i < 32; i++) progress.schedule();
    vi.advanceTimersByTime(99);
    expect(update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledTimes(1);
    progress.schedule();
    vi.advanceTimersByTime(100);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("cancels obsolete work on completion or navigation without cancelling the next batch", () => {
    vi.useFakeTimers();
    const update = vi.fn();
    const progress = createProgressiveUpdate(update);
    progress.schedule();
    progress.cancel();
    vi.advanceTimersByTime(100);
    expect(update).not.toHaveBeenCalled();
    progress.schedule();
    vi.advanceTimersByTime(100);
    expect(update).toHaveBeenCalledTimes(1);
    progress.cancel();
    vi.runAllTimers();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
