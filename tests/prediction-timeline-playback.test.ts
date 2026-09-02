// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PredictionTimelineControl } from "@/components/prediction-timeline-control";

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  document.body.replaceChildren();
});

describe("prediction timeline playback", () => {
  it("waits for a complete frame before advancing", async () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const onChange = vi.fn();

    await act(async () => root.render(createElement(PredictionTimelineControl, {
      incomplete: false,
      loading: true,
      offset: 0,
      onChange,
      unavailable: false,
    })));
    const play = container.querySelector("button")!;
    await act(async () => play.click());
    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => root.render(createElement(PredictionTimelineControl, {
      incomplete: false,
      loading: false,
      offset: 0,
      onChange,
      unavailable: false,
    })));
    await act(async () => vi.advanceTimersByTimeAsync(1_150));
    expect(onChange).toHaveBeenCalledWith(1);

    await act(async () => root.unmount());
  });

  it("disables playback when retries leave a frame incomplete", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(createElement(PredictionTimelineControl, {
      incomplete: true,
      loading: false,
      offset: 2,
      onChange: () => undefined,
      unavailable: false,
    })));

    expect(container.querySelector("button")?.disabled).toBe(true);
    expect(container.textContent).toContain("Fotograma incomplet");
    await act(async () => root.unmount());
  });
});
