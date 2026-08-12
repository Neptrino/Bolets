import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { once } from "node:events";
import { fromFile } from "geotiff";
import proj4 from "proj4";
import sharp from "sharp";
import { summarizeLandCoverCounts } from "./lib/land-cover.mjs";

const GRID_M = 250;
const WEATHER_GRID_M = 2500;
const DEFAULT_TILE_M = 40_000;
const DEFAULT_SAMPLE_M = 50;
// Intersection of the ICGC 2024 land-cover and 15 m terrain services, aligned to the 250 m grid.
const SOURCE_BOUNDS = [259_000, 4_483_750, 529_000, 4_754_250];
const SOIL_BOUNDS = [0, 40.35, 3.45, 43.05];
const CACHE_DIR = resolve(process.env.BOLETS_SPATIAL_CACHE ?? "/tmp/bolets-spatial-cache");
const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
const bboxArgument = process.argv.find((argument) => argument.startsWith("--bbox="));
const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
const tileArgument = process.argv.find((argument) => argument.startsWith("--tile-size="));
const sampleArgument = process.argv.find((argument) => argument.startsWith("--landcover-sample="));
const outputPath = resolve(outputArgument?.split("=")[1] ?? "/tmp/bolets-spatial-cells.ndjson");
const requestedBounds = bboxArgument?.split("=")[1]?.split(",").map(Number) ?? SOURCE_BOUNDS;
const limit = Number(limitArgument?.split("=")[1] ?? Number.POSITIVE_INFINITY);
const tileSizeM = Number(tileArgument?.split("=")[1] ?? DEFAULT_TILE_M);
const sampleM = Number(sampleArgument?.split("=")[1] ?? DEFAULT_SAMPLE_M);

if (requestedBounds.length !== 4 || requestedBounds.some((value) => !Number.isFinite(value))) throw new Error("--bbox must be minX,minY,maxX,maxY in EPSG:25831");
if (!Number.isFinite(tileSizeM) || tileSizeM < GRID_M || tileSizeM % GRID_M) throw new Error("--tile-size must be a multiple of 250 metres");
if (!Number.isFinite(sampleM) || sampleM < 1 || GRID_M % sampleM) throw new Error("--landcover-sample must divide 250 metres exactly");

const bounds = [
  Math.max(SOURCE_BOUNDS[0], Math.floor(requestedBounds[0] / GRID_M) * GRID_M),
  Math.max(SOURCE_BOUNDS[1], Math.floor(requestedBounds[1] / GRID_M) * GRID_M),
  Math.min(SOURCE_BOUNDS[2], Math.ceil(requestedBounds[2] / GRID_M) * GRID_M),
  Math.min(SOURCE_BOUNDS[3], Math.ceil(requestedBounds[3] / GRID_M) * GRID_M)
];

proj4.defs("EPSG:25831", "+proj=utm +zone=31 +ellps=GRS80 +units=m +no_defs +type=crs");
const toWgs84 = proj4("EPSG:25831", "EPSG:4326");
const regionDefinitions = JSON.parse(await readFile(new URL("../data/regions.json", import.meta.url), "utf8"));

const rgbToCode = new Map([
  ["51,204,51", 221], ["102,255,51", 222], ["104,144,24", 223], ["150,125,95", 224],
  ["25,230,30", 225], ["180,255,155", 226], ["170,165,0", 227], ["195,195,160", 228], ["0,255,155", 229]
]);

const soilProducts = [
  ["phh2o", "phh2o_0-5cm_mean"],
  ["clay", "clay_0-5cm_mean"],
  ["sand", "sand_0-5cm_mean"],
  ["silt", "silt_0-5cm_mean"]
];

async function fetchFile(url, path, attempts = 4) {
  try {
    await readFile(path);
    return path;
  } catch {}
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "Bolets-Atles-Spatial-Builder/1.0" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const body = Buffer.from(await response.arrayBuffer());
      await import("node:fs/promises").then(({ writeFile }) => writeFile(path, body));
      return path;
    } catch (error) {
      if (attempt === attempts) throw new Error(`Unable to download ${url}: ${error instanceof Error ? error.message : error}`);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 750));
    }
  }
}

async function loadSoilRaster(property, coverage) {
  const path = join(CACHE_DIR, `${coverage}.tif`);
  const url = new URL("https://maps.isric.org/mapserv");
  url.searchParams.set("map", `/map/${property}.map`);
  url.searchParams.set("SERVICE", "WCS");
  url.searchParams.set("VERSION", "2.0.1");
  url.searchParams.set("REQUEST", "GetCoverage");
  url.searchParams.set("COVERAGEID", coverage);
  url.searchParams.set("FORMAT", "GEOTIFF_INT16");
  url.searchParams.append("SUBSET", `x(${SOIL_BOUNDS[0]},${SOIL_BOUNDS[2]})`);
  url.searchParams.append("SUBSET", `y(${SOIL_BOUNDS[1]},${SOIL_BOUNDS[3]})`);
  url.searchParams.set("SUBSETTINGCRS", "http://www.opengis.net/def/crs/EPSG/0/4326");
  url.searchParams.set("OUTPUTCRS", "http://www.opengis.net/def/crs/EPSG/0/4326");
  await fetchFile(url, path);
  const image = await (await fromFile(path)).getImage();
  return {
    data: (await image.readRasters({ interleave: true })),
    width: image.getWidth(),
    height: image.getHeight(),
    bounds: image.getBoundingBox(),
    noData: Number(image.getGDALNoData())
  };
}

function rasterValue(raster, longitude, latitude) {
  const [west, south, east, north] = raster.bounds;
  const x = Math.floor(((longitude - west) / (east - west)) * raster.width);
  const y = Math.floor(((north - latitude) / (north - south)) * raster.height);
  if (x < 0 || x >= raster.width || y < 0 || y >= raster.height) return undefined;
  const value = Number(raster.data[y * raster.width + x]);
  return !Number.isFinite(value) || value === raster.noData || value <= 0 ? undefined : value;
}

function pointInPolygon([x, y], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function regionFor(point) {
  return regionDefinitions.find((region) => region.coordinates.length && pointInPolygon(point, region.coordinates))?.id ?? "altres";
}

function soilTexture(clayValue, sandValue, siltValue) {
  const total = clayValue + sandValue + siltValue;
  if (!total) return undefined;
  const clay = clayValue * 100 / total;
  const sand = sandValue * 100 / total;
  const silt = siltValue * 100 / total;
  if (clay >= 40) return "argilosa";
  if (sand >= 70 && clay < 15) return "arenosa";
  if (silt >= 80 && clay < 12) return "llimosa";
  if (clay >= 27 && sand <= 45) return "francoargilosa";
  if (sand >= 52) return "francoarenosa";
  if (silt >= 50) return "francollimosa";
  return "franca";
}

function parseArcGrid(text, expectedWidth, expectedHeight) {
  const lines = text.trim().split(/\r?\n/);
  const header = Object.fromEntries(lines.slice(0, 6).map((line) => {
    const [key, ...value] = line.trim().split(/\s+/);
    return [key.toUpperCase(), Number(value.join(" "))];
  }));
  if (header.NCOLS !== expectedWidth || header.NROWS !== expectedHeight) throw new Error(`Unexpected terrain grid ${header.NCOLS}×${header.NROWS}`);
  const values = lines.slice(6).flatMap((line) => line.trim().split(/\s+/).map(Number));
  if (values.length !== expectedWidth * expectedHeight) throw new Error("Incomplete terrain grid");
  return { values, noData: header.NODATA_VALUE };
}

async function loadTile(x0, y0, x1, y1) {
  const cellWidth = (x1 - x0) / GRID_M;
  const cellHeight = (y1 - y0) / GRID_M;
  const sampleWidth = (x1 - x0) / sampleM;
  const sampleHeight = (y1 - y0) / sampleM;
  const tileName = `${x0}-${y0}-${x1}-${y1}`;
  const landPath = join(CACHE_DIR, `land-${sampleM}m-${tileName}.tif`);
  const landUrl = new URL("https://geoserveis.icgc.cat/servei/catalunya/cobertes-sol/wms");
  Object.entries({ SERVICE: "WMS", VERSION: "1.1.1", REQUEST: "GetMap", LAYERS: "cobertes_2024", STYLES: "", FORMAT: "image/tiff", SRS: "EPSG:25831", BBOX: `${x0},${y0},${x1},${y1}`, WIDTH: String(sampleWidth), HEIGHT: String(sampleHeight) })
    .forEach(([key, value]) => landUrl.searchParams.set(key, value));
  await fetchFile(landUrl, landPath);
  const land = await sharp(landPath).raw().toBuffer({ resolveWithObject: true });
  if (land.info.width !== sampleWidth || land.info.height !== sampleHeight || land.info.channels < 3) throw new Error(`Unexpected land-cover image ${land.info.width}×${land.info.height}`);

  const terrainPath = join(CACHE_DIR, `terrain-${tileName}.asc`);
  const terrainUrl = new URL("https://geoserveis.icgc.cat/icc_mdt/wcs/service");
  Object.entries({ SERVICE: "WCS", REQUEST: "GetCoverage", VERSION: "1.0.0", CRS: "EPSG:25831", COVERAGE: "icc:met", WIDTH: String(cellWidth), HEIGHT: String(cellHeight), FORMAT: "ArcGrid", EXCEPTIONS: "XML", BBOX: `${x0},${y0},${x1},${y1}` })
    .forEach(([key, value]) => terrainUrl.searchParams.set(key, value));
  await fetchFile(terrainUrl, terrainPath);
  const terrainText = await readFile(terrainPath, "utf8");
  if (!terrainText.trimStart().startsWith("NCOLS")) throw new Error(`Terrain provider returned an invalid tile: ${terrainText.slice(0, 160)}`);
  return { land, terrain: parseArcGrid(terrainText, cellWidth, cellHeight), cellWidth, cellHeight };
}

function landCoverForCell(land, cellX, cellY) {
  const samplesPerCell = GRID_M / sampleM;
  const counts = new Map();
  for (let sampleY = 0; sampleY < samplesPerCell; sampleY += 1) {
    for (let sampleX = 0; sampleX < samplesPerCell; sampleX += 1) {
      const x = cellX * samplesPerCell + sampleX;
      const y = land.info.height - 1 - (cellY * samplesPerCell + sampleY);
      const offset = (y * land.info.width + x) * land.info.channels;
      const code = rgbToCode.get(`${land.data[offset]},${land.data[offset + 1]},${land.data[offset + 2]}`);
      if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  const total = samplesPerCell * samplesPerCell;
  return summarizeLandCoverCounts(counts, total);
}

function weatherPoint(westUtm, southUtm) {
  const gridX = Math.floor(westUtm / WEATHER_GRID_M);
  const gridY = Math.floor(southUtm / WEATHER_GRID_M);
  const [longitude, latitude] = toWgs84.forward([
    gridX * WEATHER_GRID_M + WEATHER_GRID_M / 2,
    gridY * WEATHER_GRID_M + WEATHER_GRID_M / 2
  ]);
  return {
    pointId: `open-meteo:arome-2500:${gridX}:${gridY}`,
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    nativeResolutionM: WEATHER_GRID_M
  };
}

async function writeLine(stream, value) {
  if (!stream.write(`${JSON.stringify(value)}\n`)) await once(stream, "drain");
}

await mkdir(CACHE_DIR, { recursive: true });
await mkdir(resolve(outputPath, ".."), { recursive: true });
console.log(`Loading SoilGrids rasters into ${CACHE_DIR}`);
const [phRaster, clayRaster, sandRaster, siltRaster] = await Promise.all(soilProducts.map(([property, coverage]) => loadSoilRaster(property, coverage)));
const output = createWriteStream(outputPath, { encoding: "utf8" });
let written = 0;
let visited = 0;
let tileNumber = 0;
const totalTiles = Math.ceil((bounds[2] - bounds[0]) / tileSizeM) * Math.ceil((bounds[3] - bounds[1]) / tileSizeM);

outer: for (let tileY = bounds[1]; tileY < bounds[3]; tileY += tileSizeM) {
  for (let tileX = bounds[0]; tileX < bounds[2]; tileX += tileSizeM) {
    const x1 = Math.min(tileX + tileSizeM, bounds[2]);
    const y1 = Math.min(tileY + tileSizeM, bounds[3]);
    tileNumber += 1;
    console.log(`Tile ${tileNumber}/${totalTiles}: ${tileX},${tileY} → ${x1},${y1}`);
    const { land, terrain, cellWidth, cellHeight } = await loadTile(tileX, tileY, x1, y1);
    for (let cellY = 0; cellY < cellHeight; cellY += 1) {
      for (let cellX = 0; cellX < cellWidth; cellX += 1) {
        visited += 1;
        const landCover = landCoverForCell(land, cellX, cellY);
        if (!landCover) continue;
        const terrainRow = cellHeight - 1 - cellY;
        const altitude = terrain.values[terrainRow * cellWidth + cellX];
        if (!Number.isFinite(altitude) || altitude === terrain.noData || altitude < -50) continue;
        const westUtm = tileX + cellX * GRID_M;
        const southUtm = tileY + cellY * GRID_M;
        const eastUtm = westUtm + GRID_M;
        const northUtm = southUtm + GRID_M;
        const corners = [[westUtm, southUtm], [eastUtm, southUtm], [eastUtm, northUtm], [westUtm, northUtm]].map((point) => toWgs84.forward(point));
        const centre = toWgs84.forward([(westUtm + eastUtm) / 2, (southUtm + northUtm) / 2]);
        const longitudes = corners.map(([longitude]) => longitude);
        const latitudes = corners.map(([, latitude]) => latitude);
        const ph = rasterValue(phRaster, centre[0], centre[1]);
        const clay = rasterValue(clayRaster, centre[0], centre[1]);
        const sand = rasterValue(sandRaster, centre[0], centre[1]);
        const silt = rasterValue(siltRaster, centre[0], centre[1]);
        if ([ph, clay, sand, silt].some((value) => value === undefined)) continue;
        const texture = soilTexture(clay, sand, silt);
        await writeLine(output, {
          cellId: `epsg25831:250:${westUtm / GRID_M}:${southUtm / GRID_M}`,
          regionId: regionFor(centre),
          bounds: [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]],
          weatherPoint: weatherPoint(westUtm, southUtm),
          staticValues: {
            altitudeM: Math.round(altitude),
            forestTypes: landCover.habitat,
            landCoverFractions: landCover.fractions,
            soilPh: Number((ph / 10).toFixed(1)),
            soilTexture: texture
          },
          sources: ["ICGC MDT 5/15 m", "ICGC Cobertes del sòl 2024", "ISRIC SoilGrids 2.0 WCS"],
          sourceResolutionM: 250,
          confidence: "limited"
        });
        written += 1;
        if (written >= limit) break outer;
      }
    }
  }
}

output.end();
await once(output, "finish");
console.log(JSON.stringify({ output: outputPath, visited, written, gridSizeM: GRID_M, landCoverSamplingM: sampleM, sourceBounds: bounds, cache: basename(CACHE_DIR) }, null, 2));
