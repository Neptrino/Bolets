import { Control, DomEvent, Map as LeafletMap, latLngBounds, type LeafletMouseEvent } from "leaflet";
import type { StyleSpecification } from "maplibre-gl";
import { regionMapPanBounds } from "@/src/lib/map-view-bounds";
import type { createRegionMap } from "./map-instance";
import { MapEvents, type MapBounds, type MapCoordinate, type MapPadding, type RegionMapAdapter, type RegionMapEvents } from "./map-adapter";
import { RasterTiles, rasterStyleLayers } from "./raster-tiles";
import { addRasterFullscreen, addRasterNavigation } from "./raster-controls";
import { RasterGeolocateControl } from "./raster-geolocation";

const toBounds = (bounds: MapBounds) => latLngBounds(bounds.map(([lng, lat]) => [lat, lng]));
const noPadding: MapPadding = { top: 0, right: 0, bottom: 0, left: 0 };

export class RasterRegionMap extends MapEvents<RegionMapEvents> implements RegionMapAdapter {
  readonly leaflet: LeafletMap;
  private ready = false;
  private removed = false;
  private moving = false;
  private layers: RasterTiles[] = [];
  private attribution = document.createElement("div");
  private cleanup: (() => void)[] = [];
  private constrainViewport: boolean;

  constructor(options: Parameters<typeof createRegionMap>[0]) {
    super();
    const interactive = options.interactive ?? true;
    this.constrainViewport = interactive;
    const map = this.leaflet = new LeafletMap(options.container, {
      center: [options.center[1], options.center[0]], zoom: options.zoom + 1,
      zoomSnap: 0, minZoom: 1, maxZoom: 23,
      zoomControl: false, attributionControl: false, zoomAnimation: false, fadeAnimation: false,
      trackResize: false, dragging: interactive, scrollWheelZoom: interactive,
      doubleClickZoom: interactive, touchZoom: interactive, boxZoom: interactive, keyboard: interactive,
      maxBounds: interactive ? toBounds(regionMapPanBounds) : undefined,
      maxBoundsViscosity: 1,
    });
    options.container.classList.add("raster-map-surface");
    map.getPane("mapPane")?.classList.add("raster-map-pane");
    // Keep existing control positions and responsive rules above the prediction canvas.
    options.container.querySelector(".leaflet-top.leaflet-right")?.classList.add("maplibregl-ctrl-top-right");
    options.container.querySelector(".leaflet-bottom.leaflet-right")?.classList.add("maplibregl-ctrl-bottom-right");
    map.on("movestart", () => { this.moving = true; this.emit("movestart", undefined); });
    map.on("moveend", () => { this.moving = false; this.emit("moveend", undefined); });
    for (const type of ["move", "zoom", "resize"] as const) map.on(type, () => this.emit(type, undefined));
    for (const type of ["click", "mousemove"] as const) map.on(type, (event: LeafletMouseEvent) => this.emit(type, { lngLat: { lng: event.latlng.lng, lat: event.latlng.lat } }));
    this.addAttribution();
    this.setStyle(options.style);
    this.resize();
    if (options.showNavigation ?? true) this.cleanup.push(addRasterNavigation(map));
    if (options.showFullscreen ?? true) this.cleanup.push(addRasterFullscreen(map, options.fullscreenContainer ?? options.container));
    queueMicrotask(() => {
      if (this.removed) return;
      this.ready = true;
      // Predictions must remain available even when a tile provider fails.
      this.emit("load", undefined);
    });
  }
  addCleanup(cleanup: () => void) { this.cleanup.push(cleanup); }
  private addAttribution() {
    const control = new Control({ position: "bottomright" });
    control.onAdd = () => {
      const group = document.createElement("div");
      group.className = "maplibregl-ctrl maplibregl-ctrl-attrib maplibregl-compact";
      const button = document.createElement("button");
      button.type = "button"; button.className = "maplibregl-ctrl-attrib-button";
      button.setAttribute("aria-label", "Mostra l’atribució del mapa"); button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", () => button.setAttribute("aria-expanded", String(group.classList.toggle("maplibregl-compact-show"))));
      this.attribution.className = "maplibregl-ctrl-attrib-inner";
      group.append(button, this.attribution);
      DomEvent.disableClickPropagation(group); DomEvent.disableScrollPropagation(group);
      return group;
    };
    control.addTo(this.leaflet);
  }
  project([lng, lat]: MapCoordinate) {
    // Leaflet's convenience projection rounds to integer pixels. The prediction
    // raster needs subpixel Mercator coordinates to retain its geographic grid.
    return this.leaflet.project([lat, lng]).subtract(this.leaflet.getPixelOrigin()).add(this.leaflet.containerPointToLayerPoint([0, 0]).multiplyBy(-1));
  }
  getCenter() {
    const center = this.leaflet.containerPointToLatLng(this.leaflet.getSize().divideBy(2));
    return { lng: center.lng, lat: center.lat };
  }
  getZoom() { return this.leaflet.getZoom() - 1; }
  getBearing() { return 0; }
  getPitch() { return 0; }
  getPadding() { return noPadding; }
  getBounds() { return this.leaflet.getBounds(); }
  getCanvas() { return this.leaflet.getContainer(); }
  isMoving() { return this.moving; }
  loaded() { return this.ready; }
  jumpTo({ center: [lng, lat], zoom }: { center: MapCoordinate; zoom: number }) {
    this.leaflet.setView([lat, lng], zoom + 1, { animate: false });
  }
  fitBounds(bounds: MapBounds, options: { padding?: MapPadding | number; duration?: number; maxZoom?: number } = {}) {
    const p = typeof options.padding === "number" ? { top: options.padding, right: options.padding, bottom: options.padding, left: options.padding } : options.padding ?? noPadding;
    const fit = { paddingTopLeft: [p.left, p.top] as [number, number], paddingBottomRight: [p.right, p.bottom] as [number, number], maxZoom: options.maxZoom === undefined ? undefined : options.maxZoom + 1 };
    if (options.duration) this.leaflet.flyToBounds(toBounds(bounds), { ...fit, duration: options.duration / 1000 });
    else this.leaflet.fitBounds(toBounds(bounds), { ...fit, animate: false });
  }
  setStyle(style: StyleSpecification) {
    const specifications = rasterStyleLayers(style);
    const next = specifications.map(layer => new RasterTiles(layer.url, layer.filter, {
      tileSize: layer.tileSize, opacity: layer.opacity, maxNativeZoom: layer.maxNativeZoom,
      maxZoom: 23, keepBuffer: 2, updateWhenIdle: true,
    }));
    for (const layer of this.layers) this.leaflet.removeLayer(layer);
    this.layers = next;
    // Initial bounds are fitted synchronously after construction. Waiting until
    // that camera is settled avoids downloading tiles for the temporary view.
    queueMicrotask(() => {
      if (this.removed || this.layers !== next) return;
      for (const layer of next) layer.addTo(this.leaflet);
      this.emit("style.load", undefined);
    });
    const background = style.layers.find(layer => layer.type === "background");
    const color = background?.type === "background" ? background.paint?.["background-color"] : undefined;
    this.leaflet.getContainer().style.backgroundColor = typeof color === "string" ? color : "#e8e6de";
    // Attribution strings are version-controlled basemap metadata, never provider responses.
    this.attribution.innerHTML = [...new Set(specifications.map(layer => layer.attribution))].join(" · ");
  }
  resize() {
    this.leaflet.invalidateSize({ pan: false });
    const size = this.leaflet.getSize();
    if (this.constrainViewport && size.x > 0 && size.y > 0)
      this.leaflet.setMinZoom(this.leaflet.getBoundsZoom(toBounds(regionMapPanBounds), true));
  }
  remove() {
    this.removed = true;
    for (const cleanup of this.cleanup) cleanup();
    this.leaflet.remove(); this.clearListeners();
  }
}

export function createRasterRegionMap(options: Parameters<typeof createRegionMap>[0]) {
  const map = new RasterRegionMap(options);
  const geolocate = options.useGeolocation ? new RasterGeolocateControl(map.leaflet, options.habitat) : undefined;
  if (geolocate) map.addCleanup(() => geolocate.remove());
  return { map, geolocate };
}
