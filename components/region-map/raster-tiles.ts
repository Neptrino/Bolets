import { EPSG3857, DomUtil, TileLayer, point, type Coords, type LatLng, type Map as LeafletMap, type Point } from "./leaflet-raster";
import type { StyleSpecification } from "maplibre-gl";
import { icgcBootstrapTileUrl } from "@/src/lib/icgc-bootstrap";

/** Translate the existing raster-only styles without duplicating providers. */
export function rasterStyleLayers(style: StyleSpecification) {
  return style.layers.flatMap(layer => {
    if (layer.type !== "raster") return [];
    const source = style.sources[layer.source];
    if (source?.type !== "raster" || !source.tiles?.length) throw new Error("A raster basemap needs explicit tiles");
    const paint = layer.paint;
    const contrast = typeof paint?.["raster-contrast"] === "number" ? paint["raster-contrast"] : 0;
    const saturation = typeof paint?.["raster-saturation"] === "number" ? paint["raster-saturation"] : 0;
    return [{
      url: source.tiles[0],
      attribution: source.attribution ?? "",
      tileSize: source.tileSize ?? 256,
      maxNativeZoom: source.maxzoom ?? 18,
      opacity: typeof paint?.["raster-opacity"] === "number" ? paint["raster-opacity"] : 1,
      filter: `saturate(${1 + saturation}) contrast(${contrast > 0 ? 1 / (1 - contrast) : 1 + contrast})`,
    }];
  });
}

export class RasterTiles extends TileLayer {
  constructor(private template: string, private filter: string, options: ConstructorParameters<typeof TileLayer>[1]) {
    super(template, options);
  }
  getTileUrl(coords: Coords) {
    if (!this.template.includes("{bbox-epsg-3857}")) {
      const url = super.getTileUrl(coords);
      return icgcBootstrapTileUrl(url) ?? url;
    }
    const size = this.getTileSize();
    const northwest = EPSG3857.project(EPSG3857.pointToLatLng(point(coords.x * size.x, coords.y * size.y), coords.z));
    const southeast = EPSG3857.project(EPSG3857.pointToLatLng(point((coords.x + 1) * size.x, (coords.y + 1) * size.y), coords.z));
    return this.template.replace("{bbox-epsg-3857}", [northwest.x, southeast.y, southeast.x, northwest.y].join(","));
  }
  onAdd(map: LeafletMap) {
    super.onAdd(map);
    // Filter the joined layer, not each image: separate filtered tiles create
    // bright seams at fractional zoom and require many compositing surfaces.
    const container = this.getContainer();
    if (container) container.style.filter = this.filter;
    return this;
  }
  /**
   * Leaflet 1.9.4 rounds this translation after scaling the tile-level origin.
   * That makes the same restored camera shift tiles by a fraction of a pixel
   * depending on where the level was first created. Keep the exact translation
   * so tile geography agrees with the independent prediction canvas. This is
   * the only vendor rendering hook; keep the pinned version and camera tests.
   */
  _setZoomTransform(level: { origin: Point; zoom: number; el: HTMLElement }, center: LatLng, zoom: number) {
    const map = this._map;
    const scale = map.getZoomScale(zoom, level.zoom);
    const pixelOrigin = map.project(center, zoom).subtract(map.getSize().divideBy(2))
      .add(map.layerPointToContainerPoint([0, 0])).round();
    DomUtil.setTransform(level.el, level.origin.multiplyBy(scale).subtract(pixelOrigin), scale);
  }
}
