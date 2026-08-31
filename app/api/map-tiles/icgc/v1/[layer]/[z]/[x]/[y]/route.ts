const WEB_MERCATOR_EXTENT = 20_037_508.342789244;
const MAX_TILE_ZOOM = 18;
const TILE_CACHE_SECONDS = 31_536_000;

const icgcLayers = {
  relief: {
    service: "elevacions-territorial",
    layer:
      "model-elevacions-terreny-ombrejat-catalunya-topografic-5m-2009-2018",
    background: null,
    format: "image/png",
  },
  references: {
    service: "mapa-base",
    layer: "topografic-gris",
    background: "0xEEEDE8",
    format: "image/png",
  },
  simplified: {
    service: "mapa-base",
    layer: "simplificat",
    background: "0xF2EBD5",
    format: "image/jpeg",
  },
} as const;

type IcgcLayer = keyof typeof icgcLayers;
type TileContext = {
  params: Promise<{ layer: string; z: string; x: string; y: string }>;
};

function isIcgcLayer(value: string): value is IcgcLayer {
  return value === "relief" || value === "references" || value === "simplified";
}

function parseTileCoordinate(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function tileBounds(z: number, x: number, y: number) {
  const span = (WEB_MERCATOR_EXTENT * 2) / 2 ** z;
  const west = -WEB_MERCATOR_EXTENT + x * span;
  const east = west + span;
  const north = WEB_MERCATOR_EXTENT - y * span;
  const south = north - span;
  return [west, south, east, north].join(",");
}

function upstreamTileUrl(layer: IcgcLayer, z: number, x: number, y: number) {
  const config = icgcLayers[layer];
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: config.layer,
    STYLES: "",
    FORMAT: config.format,
    TRANSPARENT: config.background ? "FALSE" : "TRUE",
    SRS: "EPSG:3857",
    BBOX: tileBounds(z, x, y),
    WIDTH: "256",
    HEIGHT: "256",
  });
  if (config.background) params.set("BGCOLOR", config.background);
  return `https://geoserveis.icgc.cat/servei/catalunya/${config.service}/wms?${params}`;
}

function tileError(status: number, message: string) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(_request: Request, context: TileContext) {
  const params = await context.params;
  if (!isIcgcLayer(params.layer)) return tileError(404, "Capa no trobada.");

  const z = parseTileCoordinate(params.z);
  const x = parseTileCoordinate(params.x);
  const y = parseTileCoordinate(params.y);
  if (z === null || x === null || y === null || z > MAX_TILE_ZOOM) {
    return tileError(400, "Tessel·la no vàlida.");
  }
  const dimension = 2 ** z;
  if (x >= dimension || y >= dimension) {
    return tileError(400, "Tessel·la fora de rang.");
  }

  const layer = params.layer;
  const config = icgcLayers[layer];
  try {
    const upstream = await fetch(upstreamTileUrl(layer, z, x, y), {
      cache: "force-cache",
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !contentType.startsWith(config.format)) {
      console.error("[icgc-map-tile] Invalid upstream response", {
        layer,
        status: upstream.status,
        tile: `${z}/${x}/${y}`,
      });
      return tileError(502, "No s’ha pogut carregar la tessel·la.");
    }

    const body = await upstream.arrayBuffer();
    return new Response(body, {
      headers: {
        "Cache-Control": `public, max-age=${TILE_CACHE_SECONDS}, s-maxage=${TILE_CACHE_SECONDS}, immutable`,
        "Content-Length": String(body.byteLength),
        "Content-Type": config.format,
      },
    });
  } catch (error) {
    console.error("[icgc-map-tile] Upstream request failed", {
      error: error instanceof Error ? error.message : String(error),
      layer,
      tile: `${z}/${x}/${y}`,
    });
    return tileError(502, "No s’ha pogut carregar la tessel·la.");
  }
}
