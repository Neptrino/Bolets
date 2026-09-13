// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Browser, point } from "@/components/region-map/leaflet-raster";
import { basemapOptions, basemapStyle } from "@/components/region-map/basemaps";
import { MapEvents } from "@/components/region-map/map-adapter";
import { RasterRegionMap } from "@/components/region-map/raster-map-browser";
import { RasterTiles, rasterStyleLayers } from "@/components/region-map/raster-tiles";

const maps: RasterRegionMap[] = [];
const originalAny3d = Browser.any3d;
afterEach(() => { for (const map of maps.splice(0)) map.remove(); document.body.replaceChildren(); Object.defineProperty(Browser, "any3d", { value: originalAny3d }); });
function createMap() {
  // jsdom lacks CSS transforms; emulate the capability of the browser E2E runs.
  Object.defineProperty(Browser, "any3d", { value: true });
  const container = document.createElement("div");
  document.body.append(container);
  Object.defineProperties(container, { clientWidth: { value: 1200 }, clientHeight: { value: 800 } });
  const map = new RasterRegionMap({ container, center: [1.7, 42], zoom: 8.25, habitat: false,
    interactive: false, showNavigation: false, showFullscreen: false, useGeolocation: false, style: basemapStyle("icgc-relief") });
  maps.push(map);
  return map;
}
describe("raster map compatibility", () => {
  it("registers every gesture handler in the raster-only Leaflet entry", () => {
    const map = createMap().leaflet;
    for (const name of ["dragging", "scrollWheelZoom", "doubleClickZoom", "touchZoom", "boxZoom", "keyboard"] as const) {
      expect(map[name], name).toBeDefined();
      expect(map[name].enabled(), name).toBe(false);
      map[name].enable();
      expect(map[name].enabled(), name).toBe(true);
      map[name].disable();
    }
  });
  it("requests tiles only after the initial camera is fitted", async () => {
    const map = createMap();
    expect(map.getCanvas().querySelectorAll(".leaflet-tile")).toHaveLength(0);
    map.jumpTo({ center: [2, 41], zoom: 6 });
    await Promise.resolve();
    const tiles = [...map.getCanvas().querySelectorAll<HTMLImageElement>(".leaflet-tile")];
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.every(tile => /\/(relief|references)\/7\//.test(tile.src))).toBe(true);
  });
  it("does not start superseded styles or a removed map's tile requests", async () => {
    const map = createMap();
    map.setStyle(basemapStyle("open-map"));
    await Promise.resolve();
    const tiles = [...map.getCanvas().querySelectorAll<HTMLImageElement>(".leaflet-tile")];
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.every(tile => tile.src.includes("openstreetmap.org"))).toBe(true);
    map.setStyle(basemapStyle("icgc-relief"));
    map.remove(); maps.splice(maps.indexOf(map), 1);
    await Promise.resolve();
    expect(map.getCanvas().querySelectorAll(".leaflet-tile")).toHaveLength(0);
  });
  it("preserves all configured raster providers and credits", () => {
    for (const option of basemapOptions) {
      const style = basemapStyle(option.id);
      const layers = rasterStyleLayers(style);
      expect(layers.length).toBe(style.layers.filter(layer => layer.type === "raster").length);
      expect(layers.every(layer => layer.url && layer.attribution && layer.tileSize === 256)).toBe(true);
    }
  });
  it("converts WMS tile coordinates into the expected Web Mercator bounds", () => {
    const layer = new RasterTiles("https://example.test/wms?BBOX={bbox-epsg-3857}", "none", { tileSize: 256 });
    const bounds = new URL(layer.getTileUrl(Object.assign(point(1, 1), { z: 1 }))).searchParams.get("BBOX")!.split(",").map(Number);
    expect(bounds[0]).toBeCloseTo(0, 5);
    expect(bounds[1]).toBeCloseTo(-20037508.342789244, 4);
    expect(bounds[2]).toBeCloseTo(20037508.342789244, 5);
    expect(bounds[3]).toBeCloseTo(0, 5);
  });
  it("retains the 512-pixel map zoom scale and subpixel Mercator projection", () => {
    const map = createMap();
    const center = map.project([1.7, 42]);
    const east = map.project([2.7, 42]);
    expect(map.getZoom()).toBe(8.25);
    expect(map.getCenter().lng).toBeCloseTo(1.7, 2);
    expect(map.getCenter().lat).toBeCloseTo(42, 2);
    expect(Math.abs(center.x - 600)).toBeLessThanOrEqual(.5);
    expect(Math.abs(center.y - 400)).toBeLessThanOrEqual(.5);
    expect(east.x - center.x).toBeCloseTo(512 * 2 ** 8.25 / 360, 6);
    map.jumpTo({ center: [2, 41], zoom: 11.7 });
    expect(map.getZoom()).toBeCloseTo(11.7, 8);
    expect(map.getCenter().lat).toBeCloseTo(41, 3);
  });
  it("loads predictions without waiting for provider tile responses", async () => {
    const map = createMap(); const loaded = vi.fn();
    map.once("load", loaded);
    await Promise.resolve();
    expect(loaded).toHaveBeenCalledOnce();
    expect(map.loaded()).toBe(true);
  });
  it("can cancel pending load callbacks and never emits after removal", async () => {
    const map = createMap(); const canceled = vi.fn(); const removed = vi.fn();
    map.once("load", canceled); map.off("load", canceled); map.once("load", removed);
    map.remove(); maps.splice(maps.indexOf(map), 1);
    await Promise.resolve();
    expect(canceled).not.toHaveBeenCalled(); expect(removed).not.toHaveBeenCalled();
  });
  it("cancels once listeners without mixing event types", () => {
    class Source extends MapEvents<{ a: undefined; b: undefined }> { send(type: "a" | "b") { this.emit(type, undefined); } }
    const source = new Source(); const listener = vi.fn();
    source.once("a", listener); source.once("b", listener); source.off("a", listener);
    source.send("a"); source.send("b"); source.send("b");
    expect(listener).toHaveBeenCalledOnce();
  });
  it("deduplicates once listeners and removes them before recursive dispatch", () => {
    class Source extends MapEvents<{ ready: undefined }> { send() { this.emit("ready", undefined); } }
    const source = new Source();
    const listener = vi.fn(() => source.send());
    source.once("ready", listener); source.once("ready", listener);
    source.send(); source.send();
    expect(listener).toHaveBeenCalledOnce();
  });
});
