import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { regionMapMaxBounds } from "@/components/region-map/map-instance";
import { cataloniaBounds, fitCatalonia } from "@/components/region-map/support";

describe("region map framing", () => {
  it("does not constrain the camera bounds of a static map", () => {
    expect(regionMapMaxBounds(false)).toBeUndefined();
    expect(regionMapMaxBounds(true)).toEqual([
      [-0.5, 40.1],
      [3.9, 43.2],
    ]);
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

  it("refits static maps after their container is resized", () => {
    const regionMapSource = readFileSync("components/region-map.tsx", "utf8");

    expect(regionMapSource).toContain(
      "!initialInteractive.current && !initialMapCentre.current && !initialFocusBounds.current && !initialRegion.current",
    );
    expect(regionMapSource).toContain("fitCatalonia(localMap, false)");
  });
});
