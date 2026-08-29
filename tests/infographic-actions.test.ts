/** @vitest-environment jsdom */

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const analytics = vi.hoisted(() => ({
  queueUmamiEvent: vi.fn(),
}));

vi.mock("@/src/lib/umami-goals", () => ({
  queueUmamiEvent: analytics.queueUmamiEvent,
  UMAMI_EVENTS: {
    infographicDownloaded: "infographic-downloaded",
    infographicShared: "infographic-shared",
  },
}));

import { InfographicActions } from "@/components/infographic-actions";

let container: HTMLDivElement;
let root: Root;

function setNavigatorAction(name: "canShare" | "share" | "clipboard", value: unknown) {
  Object.defineProperty(window.navigator, name, {
    configurable: true,
    value,
  });
}

function actionButton(label: string) {
  return [...container.querySelectorAll("button")]
    .find((button) => button.textContent?.includes(label));
}

beforeEach(async () => {
  analytics.queueUmamiEvent.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    blob: async () => new Blob(["poster"], { type: "image/png" }),
  })));
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:poster"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

  await act(async () => {
    root.render(createElement(InfographicActions, { posterPath: "/poster.png" }));
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("infographic actions", () => {
  it("counts a download after the poster is prepared", async () => {
    await act(async () => {
      actionButton("Baixar")?.click();
    });

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(analytics.queueUmamiEvent).toHaveBeenCalledWith("infographic-downloaded");
  });

  it("counts a native share only after it completes", async () => {
    let finishShare: (() => void) | undefined;
    const share = vi.fn(() => new Promise<void>((resolve) => { finishShare = resolve; }));
    setNavigatorAction("canShare", vi.fn(() => true));
    setNavigatorAction("share", share);

    await act(async () => {
      actionButton("Compartir")?.click();
      await Promise.resolve();
    });
    expect(analytics.queueUmamiEvent).not.toHaveBeenCalled();

    await act(async () => {
      finishShare?.();
      await share.mock.results[0]?.value;
    });
    expect(analytics.queueUmamiEvent).toHaveBeenCalledWith("infographic-shared");
  });

  it("does not count copying a link as a completed share", async () => {
    const writeText = vi.fn(async () => undefined);
    setNavigatorAction("canShare", undefined);
    setNavigatorAction("share", undefined);
    setNavigatorAction("clipboard", { writeText });

    await act(async () => {
      actionButton("Compartir")?.click();
    });

    expect(writeText).toHaveBeenCalledOnce();
    expect(analytics.queueUmamiEvent).not.toHaveBeenCalled();
  });
});
