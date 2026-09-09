import { describe, expect, it } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { visibleGridSize } from "@/components/region-map/support";
import { predictionRenderingForGrid } from "@/components/region-map/prediction-view";
import { predictionQueryBounds } from "@/components/region-map/smoothed-viewport";
import type { SpatialBounds, SpatialGridSizeM } from "@/src/lib/types";

const localBounds = { west: 1.65, south: 42.15, east: 1.72, north: 42.22 };
function mapAt(zoom: number, bounds = localBounds) {
  return {
    getZoom: () => zoom,
    getBounds: () => ({ getWest: () => bounds.west, getSouth: () => bounds.south,
      getEast: () => bounds.east, getNorth: () => bounds.north }),
  } as unknown as MapLibreMap;
}
function view(zoom: number, floor: SpatialGridSizeM, bounds?: SpatialBounds, interactive = true) {
  const grid = visibleGridSize(mapAt(zoom, bounds), floor, undefined, "heatmap", interactive);
  return { grid, rendering: predictionRenderingForGrid("heatmap", grid, interactive) };
}

describe("smoothed overview with automatic detailed sectors", () => {
  it.each([7, 10, 11.79, 11.8, 13.4, 16])("keeps public users smoothed at zoom %s", (zoom) => {
    expect(view(zoom, 2500)).toEqual({ grid: 2500, rendering: "heatmap" });
  });

  it("switches to 1 km at its zoom threshold, retaining the viewer's access floor", () => {
    expect(view(11.79, 1000)).toEqual({ grid: 2500, rendering: "heatmap" });
    expect(view(11.8, 1000)).toEqual({ grid: 1000, rendering: "cells" });
    expect(view(15, 1000)).toEqual({ grid: 1000, rendering: "cells" });
  });

  it("continues into 250 m cells only when permitted, then restores smoothing on zoom-out", () => {
    expect([11.7, 12, 13.4, 12, 11.7].map((zoom) => view(zoom, 250))).toEqual([
      { grid: 2500, rendering: "heatmap" }, { grid: 1000, rendering: "cells" },
      { grid: 250, rendering: "cells" }, { grid: 1000, rendering: "cells" },
      { grid: 2500, rendering: "heatmap" },
    ]);
  });

  it("waits for the viewport to fit the detailed cell budget", () => {
    expect(view(14, 250, { west: 0.05, south: 40.48, east: 3.32, north: 42.92 }))
      .toEqual({ grid: 2500, rendering: "heatmap" });
  });

  it("retains static overview rendering and the timeline's 5 km floor", () => {
    expect(view(14, 250, undefined, false)).toEqual({ grid: 2500, rendering: "heatmap" });
    expect(view(14, 5000)).toEqual({ grid: 5000, rendering: "heatmap" });
  });

  it("preserves an explicit static sector rendering", () => {
    for (const zoom of [7, 10, 12, 14]) {
      const grid = visibleGridSize(mapAt(zoom), 250, undefined, "cells", false);
      expect(predictionRenderingForGrid("cells", grid, false)).toBe("cells");
    }
  });

  it("uses the resolved rendering for neighbour requests", () => {
    const near = view(12, 1000);
    expect(predictionQueryBounds(localBounds, near.grid, near.rendering)).toEqual(localBounds);
    const far = view(10, 1000);
    expect(predictionQueryBounds(localBounds, far.grid, far.rendering).west).toBeLessThan(localBounds.west);
  });

  it("keeps already loaded overview data smoothed until detailed cells replace it", () => {
    expect(predictionRenderingForGrid("heatmap", 2500, true)).toBe("heatmap");
    expect(predictionRenderingForGrid("heatmap", 1000, true)).toBe("cells");
  });
});
