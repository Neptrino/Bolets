/** @vitest-environment jsdom */
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Map as MapLibreMap } from "maplibre-gl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpatialGridSizeM } from "@/src/lib/types";

const access = vi.hoisted(() => ({ checked: true, active: false }));
vi.mock("@/components/use-contributor-map-access", () => ({
  useContributorMapAccess: () => access,
}));

import { MapDetailAccessNotice } from "@/components/map-detail-access-notice";
import { useMapResolutionAccess } from "@/components/region-map/use-resolution-access";

let container: HTMLDivElement;
let root: Root;
let zoom: number;
let wideViewport: boolean;
const listeners = new Map<string, () => void>();
const map = { current: {
  getZoom: () => zoom,
  getBounds: () => ({
    getWest: () => wideViewport ? 0.05 : 2.15,
    getSouth: () => wideViewport ? 40.48 : 42.2,
    getEast: () => wideViewport ? 3.32 : 2.25,
    getNorth: () => wideViewport ? 42.92 : 42.28,
  }),
  on: (event: string, callback: () => void) => listeners.set(event, callback),
  off: (event: string) => listeners.delete(event),
} as unknown as MapLibreMap };

function MapHarness({ combined = false }: { combined?: boolean }) {
  const [resolution, setResolution] = useState<SpatialGridSizeM>(2500);
  const { predictionMinimumGridSizeM } = useMapResolutionAccess(map, combined, setResolution);
  return createElement("div", { "data-minimum": predictionMinimumGridSizeM, "data-resolution": resolution },
    createElement(MapDetailAccessNotice, { resolution }));
}

beforeEach(() => {
  access.checked = true;
  access.active = false;
  zoom = 11.7;
  wideViewport = false;
  listeners.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("contextual map detail prompt", () => {
  it("supports an inline presentation outside the map", async () => {
    await act(async () => root.render(createElement(MapDetailAccessNotice, {
      resolution: 1000,
      inline: true,
    })));
    expect(container.querySelector(".map-detail-access--inline")).not.toBeNull();
  });

  it("appears at the finer-grid threshold and disappears when zooming back out", async () => {
    await act(async () => root.render(createElement(MapHarness)));
    expect(container.querySelector("a")).toBeNull();
    zoom = 11.8;
    await act(async () => listeners.get("zoom")?.());
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/col-labora");
    expect(container.textContent).toContain("2,5 km");
    expect(container.textContent).toContain("sense pagar");
    expect(container.firstElementChild?.getAttribute("data-minimum")).toBe("2500");
    zoom = 11.7;
    await act(async () => listeners.get("zoom")?.());
    expect(container.querySelector("a")).toBeNull();
  });

  it("uses the viewport cell budget and updates on resize and pan", async () => {
    zoom = 13;
    wideViewport = true;
    await act(async () => root.render(createElement(MapHarness)));
    expect(container.querySelector("a")).toBeNull();
    wideViewport = false;
    await act(async () => listeners.get("resize")?.());
    expect(container.querySelector("a")).not.toBeNull();
    wideViewport = true;
    await act(async () => listeners.get("moveend")?.());
    expect(container.querySelector("a")).toBeNull();
  });

  it("waits for the access check and never prompts active contributors", async () => {
    zoom = 14;
    access.checked = false;
    await act(async () => root.render(createElement(MapHarness)));
    expect(container.querySelector("a")).toBeNull();
    access.checked = true;
    access.active = true;
    await act(async () => root.render(createElement(MapHarness)));
    expect(container.querySelector("a")).toBeNull();
    expect(container.firstElementChild?.getAttribute("data-minimum")).toBe("250");
  });

  it("keeps the combined map's 1 km detail floor and cleans up map subscriptions", async () => {
    zoom = 14;
    await act(async () => root.render(createElement(MapHarness, { combined: true })));
    expect(container.firstElementChild?.getAttribute("data-resolution")).toBe("1000");
    expect(container.querySelector("a")).not.toBeNull();
    await act(async () => root.render(null));
    expect(listeners.size).toBe(0);
  });
});
