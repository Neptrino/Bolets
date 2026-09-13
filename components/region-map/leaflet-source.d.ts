// Leaflet's published source modules expose the same public API as its bundle.
// These declarations are deliberately limited to the pinned raster entry.
declare module "leaflet/src/map/index.js" { export { Map } from "leaflet"; }
declare module "leaflet/src/control/Control.js" { export { Control } from "leaflet"; }
declare module "leaflet/src/layer/tile/TileLayer.js" { export { TileLayer } from "leaflet"; }
declare module "leaflet/src/geo/LatLng.js" { export { latLng as toLatLng } from "leaflet"; }
declare module "leaflet/src/geo/LatLngBounds.js" { export { latLngBounds as toLatLngBounds } from "leaflet"; }
declare module "leaflet/src/geometry/Point.js" { export { point as toPoint } from "leaflet"; }
declare module "leaflet/src/geo/crs/CRS.EPSG3857.js" {
  export const EPSG3857: typeof import("leaflet").CRS.EPSG3857;
}
declare module "leaflet/src/core/Browser.js" {
  const Browser: typeof import("leaflet").Browser;
  export default Browser;
}
declare module "leaflet/src/dom/DomEvent.js" {
  import { DomEvent } from "leaflet";
  export = DomEvent;
}
declare module "leaflet/src/dom/DomUtil.js" {
  import { DomUtil } from "leaflet";
  export = DomUtil;
}
