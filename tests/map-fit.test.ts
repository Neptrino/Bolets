import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { regionMapMaxBounds } from "@/components/region-map/map-instance";
import {
  cataloniaBounds,
  fitCatalonia,
  initialRegionMapView,
} from "@/components/region-map/support";
import { regionMapPanBounds } from "@/src/lib/map-view-bounds";

describe("region map framing", () => {
  it("does not constrain the camera bounds of a static map", () => {
    expect(regionMapMaxBounds(false)).toBeUndefined();
    expect(regionMapMaxBounds(true)).toEqual(regionMapPanBounds);
  });

  it("fits Catalunya with a consistent safe margin", () => {
    const fitBounds = vi.fn();
    const map = { fitBounds } as unknown as MapLibreMap;

    fitCatalonia(map, false);

    expect(fitBounds).toHaveBeenCalledWith(cataloniaBounds, {
      padding: { top: 54, right: 54, bottom: 54, left: 54 },
      duration: 0,
    });
  });

  it("derives a focused initial camera from explicit bounds", () => {
    expect(initialRegionMapView({
      activeRegions: [],
      focusBounds: { west: 1, south: 40, east: 2, north: 42 },
      prediction: false,
    })).toEqual({ center: [1.5, 41], zoom: 10.8 });
  });

  it("refits static maps after their container is resized", () => {
    const regionMapSource = readFileSync("components/region-map.tsx", "utf8");

    expect(regionMapSource).toContain(
      "!initialInteractive.current && !initialMapCentre.current && !initialFocusBounds.current && !initialRegion.current",
    );
    expect(regionMapSource).toContain("fitCatalonia(localMap, false)");
  });
});
