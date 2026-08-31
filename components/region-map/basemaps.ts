import type { StyleSpecification } from "maplibre-gl";

const defaultBasemapId = "icgc-relief";
const basemapStorageKey = "bolets-basemap";
const basemapOptions = [
  {
    id: defaultBasemapId,
    label: "Relleu ombrejat",
    shortLabel: "Relleu",
    provider: "ICGC",
    description: "Relleu ombrejat amb referències topogràfiques de l’ICGC",
    preview: "relief",
  },
  {
    id: "icgc-topographic",
    label: "Topogràfic",
    shortLabel: "Topo",
    provider: "ICGC",
    description: "Mapa general de l’ICGC",
    preview: "topographic",
  },
  {
    id: "open-map",
    label: "Obert",
    shortLabel: "Obert",
    provider: "OSM",
    description: "Mapa estàndard d’OpenStreetMap",
    preview: "open",
  },
  {
    id: "icgc-aerial",
    label: "Ortofoto",
    shortLabel: "Aèria",
    provider: "ICGC",
    description: "Imatge aèria híbrida de l’ICGC",
    preview: "aerial",
  },
  {
    id: "icgc-muted",
    label: "Gris",
    shortLabel: "Gris",
    provider: "ICGC",
    description: "Mapa de l’ICGC amb menys contrast",
    preview: "muted",
  },
  {
    id: "esri-topographic",
    label: "Topogràfic mundial",
    shortLabel: "Topo",
    provider: "Esri",
    description: "Mapa topogràfic mundial d’Esri",
    preview: "topographic",
  },
  {
    id: "icgc-simplified",
    label: "Simplificat",
    shortLabel: "Simple",
    provider: "ICGC",
    description: "Mapa base simplificat de l’ICGC",
    preview: "simplified",
  },
] as const;

type BasemapId = (typeof basemapOptions)[number]["id"];
type IcgcBaseLayer =
  | "estandard"
  | "estandard-gris"
  | "orto-hibrida"
  | "topografic-gris";

function isBasemapId(value: string | null): value is BasemapId {
  return basemapOptions.some((option) => option.id === value);
}

function storedBasemapId(fallback: BasemapId = defaultBasemapId): BasemapId {
  try {
    const stored = window.localStorage.getItem(basemapStorageKey);
    return isBasemapId(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

function icgcTileUrl(
  wmsLayer: IcgcBaseLayer,
  format: "image/jpeg" | "image/png" = "image/jpeg",
) {
  const background = wmsLayer.includes("gris") ? "0xEEEDE8" : "0xF2EBD5";
  return (
    `https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${wmsLayer}` +
    `&STYLES=&FORMAT=${format}&TRANSPARENT=FALSE&BGCOLOR=${background}&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256`
  );
}

function icgcBasemapStyle(wmsLayer: IcgcBaseLayer): StyleSpecification {
  const sourceId = `icgc-${wmsLayer}`;
  return {
    version: 8,
    sources: {
      [sourceId]: {
        type: "raster",
        tiles: [icgcTileUrl(wmsLayer)],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 18,
        attribution: "© Institut Cartogràfic i Geològic de Catalunya",
      },
    },
    layers: [
      {
        id: sourceId,
        type: "raster",
        source: sourceId,
        paint: { "raster-fade-duration": 0 },
      },
    ],
  };
}

function icgcReliefStyle(): StyleSpecification {
  const reliefSourceId = "icgc-shaded-relief";
  const labelsSourceId = "icgc-relief-references";
  const reliefTiles = "/api/map-tiles/icgc/v1/relief/{z}/{x}/{y}";
  const referenceTiles = "/api/map-tiles/icgc/v1/references/{z}/{x}/{y}";

  return {
    version: 8,
    sources: {
      [reliefSourceId]: {
        type: "raster",
        tiles: [reliefTiles],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 18,
        attribution: "© Institut Cartogràfic i Geològic de Catalunya",
      },
      [labelsSourceId]: {
        type: "raster",
        tiles: [referenceTiles],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 18,
        attribution: "© Institut Cartogràfic i Geològic de Catalunya",
      },
    },
    layers: [
      {
        id: "icgc-relief-background",
        type: "background",
        paint: { "background-color": "#e8e6de" },
      },
      {
        id: reliefSourceId,
        type: "raster",
        source: reliefSourceId,
        paint: {
          "raster-contrast": 0.36,
          "raster-fade-duration": 0,
          "raster-opacity": 0.96,
          "raster-saturation": -1,
        },
      },
      {
        id: labelsSourceId,
        type: "raster",
        source: labelsSourceId,
        paint: {
          "raster-fade-duration": 0,
          "raster-opacity": 0.7,
          "raster-saturation": -1,
        },
      },
    ],
  };
}

function openStreetMapStyle(): StyleSpecification {
  const sourceId = "openstreetmap-standard";
  return {
    version: 8,
    sources: {
      [sourceId]: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',
      },
    },
    layers: [
      {
        id: sourceId,
        type: "raster",
        source: sourceId,
        paint: { "raster-fade-duration": 0 },
      },
    ],
  };
}

function rasterBasemapStyle({
  attribution,
  maxzoom,
  sourceId,
  tiles,
}: {
  attribution: string;
  maxzoom: number;
  sourceId: string;
  tiles: string;
}): StyleSpecification {
  return {
    version: 8,
    sources: {
      [sourceId]: {
        type: "raster",
        tiles: [tiles],
        tileSize: 256,
        minzoom: 0,
        maxzoom,
        attribution,
      },
    },
    layers: [
      {
        id: sourceId,
        type: "raster",
        source: sourceId,
        paint: { "raster-fade-duration": 0 },
      },
    ],
  };
}

function esriTopographicStyle() {
  return rasterBasemapStyle({
    attribution:
      "Tiles © Esri — Sources: Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), OpenStreetMap contributors, and the GIS User Community",
    maxzoom: 23,
    sourceId: "esri-world-topographic",
    tiles:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  });
}

function icgcSimplifiedStyle() {
  return rasterBasemapStyle({
    attribution: "© Institut Cartogràfic i Geològic de Catalunya",
    maxzoom: 18,
    sourceId: "icgc-simplified",
    tiles: "/api/map-tiles/icgc/v1/simplified/{z}/{x}/{y}?encoding=jpeg-v1",
  });
}

function basemapStyle(id: BasemapId): StyleSpecification {
  if (id === "icgc-relief") return icgcReliefStyle();
  if (id === "open-map") return openStreetMapStyle();
  if (id === "icgc-aerial") return icgcBasemapStyle("orto-hibrida");
  if (id === "icgc-muted") return icgcBasemapStyle("estandard-gris");
  if (id === "esri-topographic") return esriTopographicStyle();
  if (id === "icgc-simplified") return icgcSimplifiedStyle();
  return icgcBasemapStyle("estandard");
}

export {
  basemapOptions,
  basemapStorageKey,
  basemapStyle,
  defaultBasemapId,
  storedBasemapId,
};
export type { BasemapId };
