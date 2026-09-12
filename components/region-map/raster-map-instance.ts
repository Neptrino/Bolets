import type { createRegionMap } from "./map-instance";

/**
 * Defer Leaflet module evaluation until the mount effect calls the factory.
 * The map component can then render on the server and Next can preload its
 * client bundle, without executing Leaflet's browser globals during SSR.
 */
export function createRasterRegionMap(options: Parameters<typeof createRegionMap>[0]) {
  // A literal synchronous require keeps the dependency bundled while delaying
  // its evaluation; an asynchronous import would add another startup waterfall.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const renderer = require("./raster-map-browser") as typeof import("./raster-map-browser");
  return renderer.createRasterRegionMap(options);
}
