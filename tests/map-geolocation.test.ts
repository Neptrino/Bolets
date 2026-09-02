import { beforeEach, describe, expect, it, vi } from "vitest";
import { gridSizeForZoom } from "@/src/lib/map-grid";

const constructors = vi.hoisted(() => ({ map: vi.fn(), geolocate: vi.fn() }));
vi.mock("maplibre-gl", () => ({
  Map: class {
    constructor(options: unknown) { constructors.map(options); }
    addControl() {}
  },
  GeolocateControl: class {
    constructor(options: unknown) { constructors.geolocate(options); }
  },
  FullscreenControl: class {},
  NavigationControl: class {},
}));

import { createRegionMap } from "@/components/region-map/map-instance";

describe("automatic geolocation framing", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([false, true])("starts with 2.5 km cells without limiting manual zoom (habitat=%s)", (habitat) => {
    createRegionMap({
      center: [2.15, 41.39],
      container: {} as HTMLElement,
      habitat,
      style: { version: 8, sources: {}, layers: [] },
      useGeolocation: true,
      zoom: 8,
    });
    const options = constructors.geolocate.mock.calls[0][0];
    expect(gridSizeForZoom(options.fitBoundsOptions.maxZoom)).toBe(2500);
    expect(options.fitBoundsOptions.maxZoom).toBeLessThan(11.8);
    expect(constructors.map.mock.calls[0][0]).not.toHaveProperty("maxZoom");
  });
});
