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
    appInstallStarted: "app-install-started",
    appInstallAccepted: "app-install-accepted",
    appInstalled: "app-installed",
  },
}));

import { InstallApp } from "@/components/install-app";

let container: HTMLDivElement;
let root: Root;
let standalone = false;

function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: standalone,
      media: "(display-mode: standalone)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

async function renderInstallApp() {
  await act(async () => {
    root.render(createElement(InstallApp));
  });
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
    .IS_REACT_ACT_ENVIRONMENT = true;
  analytics.queueUmamiEvent.mockReset();
  standalone = false;
  installMatchMedia();
  window.localStorage.clear();
  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    value: "Linux x86_64",
  });
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: 0,
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("app install analytics", () => {
  it("tracks the Chromium install action, acceptance, and completion", async () => {
    await renderInstallApp();
    const prompt = vi.fn(async () => undefined);
    const installPrompt = Object.assign(new Event("beforeinstallprompt"), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });

    await act(async () => {
      window.dispatchEvent(installPrompt);
    });
    await act(async () => {
      container.querySelector("button")?.click();
      await installPrompt.userChoice;
    });

    expect(prompt).toHaveBeenCalledOnce();
    expect(analytics.queueUmamiEvent).toHaveBeenNthCalledWith(1, "app-install-started");
    expect(analytics.queueUmamiEvent).toHaveBeenNthCalledWith(2, "app-install-accepted");

    await act(async () => {
      window.dispatchEvent(new Event("appinstalled"));
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(analytics.queueUmamiEvent).toHaveBeenNthCalledWith(3, "app-installed");
    expect(analytics.queueUmamiEvent).toHaveBeenCalledTimes(3);
  });

  it("counts the first standalone launch once as an installation confirmation", async () => {
    standalone = true;
    installMatchMedia();

    await renderInstallApp();

    expect(analytics.queueUmamiEvent).toHaveBeenCalledOnce();
    expect(analytics.queueUmamiEvent).toHaveBeenCalledWith("app-installed");

    await act(async () => root.unmount());
    root = createRoot(container);
    await renderInstallApp();

    expect(analytics.queueUmamiEvent).toHaveBeenCalledOnce();
  });
});
