// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ReelPreview } from "@/app/admin/(private)/publicacio/reel-preview";

describe("Instagram Reel preview", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(createElement(ReelPreview, {
        durationLabel: "9,3 s",
        poster: "/poster.png",
        src: "/reel.mp4",
      }));
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows preparing until the Reel metadata is available", () => {
    expect(container.textContent).toContain("Preparant el Reel");

    act(() => {
      container.querySelector("video")?.dispatchEvent(new Event("loadedmetadata"));
    });

    expect(container.textContent).toContain("Reel preparat");
    expect(container.textContent).toContain("El vídeo ja es pot revisar i publicar.");
  });

  it("shows a retry action after a rendering failure", () => {
    act(() => {
      container.querySelector("video")?.dispatchEvent(new Event("error"));
    });

    expect(container.textContent).toContain("No s’ha pogut preparar");
    const retryButton = container.querySelector("button");
    expect(retryButton?.textContent).toBe("Tornar-ho a provar");

    act(() => retryButton?.click());

    expect(container.textContent).toContain("Preparant el Reel");
    expect(container.querySelector("video")?.getAttribute("src")).toBe("/reel.mp4");
  });
});
