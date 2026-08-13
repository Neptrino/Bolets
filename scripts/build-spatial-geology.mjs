import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { once } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { basename, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fromFile } from "geotiff";
import proj4 from "proj4";
import sharp from "sharp";
import { summarizeLandCoverCounts } from "./lib/land-cover.mjs";
import {
  ensureIcgcGeologyPackage,
  ICGC_GEOLOGY_SOURCE,
  loadGeologyMapping,
  parseGeoPackagePolygon,
  polygonContainsPoint,
  summarizeGeologySamples,
} from "./lib/icgc-geology.mjs";

const execFileAsync = promisify(execFile);
const GRID_M = 250;
const SAMPLE_M = 50;
const DEFAULT_TILE_M = 40_000;
// Same canonical EPSG:25831 envelope used by build-spatial-cells.mjs.
const SOURCE_BOUNDS = [259_000, 4_483_750, 529_000, 4_754_250];
const rgbToCode = new Map([
  ["51,204,51", 221], ["102,255,51", 222], ["104,144,24", 223], ["150,125,95", 224],
  ["25,230,30", 225], ["180,255,155", 226], ["170,165,0", 227], ["195,195,160", 228], ["0,255,155", 229],
]);
const soilCoverages = ["phh2o_0-5cm_mean", "clay_0-5cm_mean", "sand_0-5cm_mean", "silt_0-5cm_mean"];
proj4.defs("EPSG:25831", "+proj=utm +zone=31 +ellps=GRS80 +units=m +no_defs +type=crs");
const toWgs84 = proj4("EPSG:25831", "EPSG:4326");

function argumentValue(name) {
  return process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const cacheDirectory = resolve(argumentValue("cache") ?? process.env.BOLETS_SPATIAL_CACHE ?? "/tmp/bolets-spatial-cache");
const outputPath = resolve(argumentValue("output") ?? "/tmp/bolets-spatial-geology.ndjson");
const mappingPath = resolve(argumentValue("mapping") ?? new URL("../data/geology/icgc-geology-50k-units.json", import.meta.url).pathname);
const requestedBounds = argumentValue("bbox")?.split(",").map(Number) ?? SOURCE_BOUNDS;
const tileSizeM = Number(argumentValue("tile-size") ?? DEFAULT_TILE_M);
const limit = Number(argumentValue("limit") ?? Number.POSITIVE_INFINITY);
const includeAllGridCells = process.argv.includes("--include-all-grid-cells");
const cellsPath = argumentValue("cells") ? resolve(argumentValue("cells")) : undefined;
const deriveCanonicalCells = process.argv.includes("--derive-canonical-cells");

if (requestedBounds.length !== 4 || requestedBounds.some((value) => !Number.isFinite(value))) throw new Error("--bbox must be minX,minY,maxX,maxY in EPSG:25831");
if (!Number.isFinite(tileSizeM) || tileSizeM < GRID_M || tileSizeM % GRID_M) throw new Error("--tile-size must be a multiple of 250 metres");
if (!(limit === Number.POSITIVE_INFINITY || (Number.isFinite(limit) && limit >= 1))) throw new Error("--limit must be positive");
const bounds = [
  Math.max(SOURCE_BOUNDS[0], Math.floor(requestedBounds[0] / GRID_M) * GRID_M),
  Math.max(SOURCE_BOUNDS[1], Math.floor(requestedBounds[1] / GRID_M) * GRID_M),
  Math.min(SOURCE_BOUNDS[2], Math.ceil(requestedBounds[2] / GRID_M) * GRID_M),
  Math.min(SOURCE_BOUNDS[3], Math.ceil(requestedBounds[3] / GRID_M) * GRID_M),
];

const mapping = await loadGeologyMapping(mappingPath);
const unitsById = new Map(mapping.units.map((unit) => [unit.unitId, unit]));
const unitByCode = new Map(mapping.units.map((unit) => [unit.code, unit]));
const gpkgPath = await ensureIcgcGeologyPackage(join(cacheDirectory, "icgc-geology"));
await mkdir(resolve(outputPath, ".."), { recursive: true });
const output = createWriteStream(outputPath, { encoding: "utf8" });

async function loadCanonicalCells(path) {
  if (!path) return undefined;
  const cellIds = new Set();
  const input = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of input) {
    if (!line.trim()) continue;
    const cellId = JSON.parse(line).cellId;
    if (typeof cellId !== "string" || !cellId.startsWith("epsg25831:250:")) throw new Error(`Invalid canonical cell in ${path}`);
    cellIds.add(cellId);
  }
  if (!cellIds.size) throw new Error(`No canonical cells found in ${path}`);
  console.log(`Loaded ${cellIds.size} canonical 250 m cells from ${path}`);
  return cellIds;
}

const canonicalCells = await loadCanonicalCells(cellsPath);
if (!canonicalCells && !deriveCanonicalCells && !includeAllGridCells) {
  throw new Error("Pass --cells=/path/to/bolets-spatial-cells.ndjson, use --derive-canonical-cells with the existing spatial cache, or use --include-all-grid-cells for diagnostics only");
}

async function loadSoilRaster(coverage) {
  const path = join(cacheDirectory, `${coverage}.tif`);
  const image = await (await fromFile(path)).getImage();
  return {
    data: await image.readRasters({ interleave: true }),
    width: image.getWidth(),
    height: image.getHeight(),
    bounds: image.getBoundingBox(),
    noData: Number(image.getGDALNoData()),
  };
}

function rasterHasValue(raster, longitude, latitude) {
  const [west, south, east, north] = raster.bounds;
  const x = Math.floor((longitude - west) / (east - west) * raster.width);
  const y = Math.floor((north - latitude) / (north - south) * raster.height);
  if (x < 0 || x >= raster.width || y < 0 || y >= raster.height) return false;
  const value = Number(raster.data[y * raster.width + x]);
  return Number.isFinite(value) && value !== raster.noData && value > 0;
}

function parseArcGrid(text, expectedWidth, expectedHeight) {
  const lines = text.trim().split(/\r?\n/);
  const header = Object.fromEntries(lines.slice(0, 6).map((line) => {
    const [key, ...value] = line.trim().split(/\s+/);
    return [key.toUpperCase(), Number(value.join(" "))];
  }));
  if (header.NCOLS !== expectedWidth || header.NROWS !== expectedHeight) throw new Error(`Unexpected cached terrain grid ${header.NCOLS}×${header.NROWS}`);
  return { values: lines.slice(6).flatMap((line) => line.trim().split(/\s+/).map(Number)), noData: header.NODATA_VALUE };
}

async function loadEligibilityTile(minX, minY, maxX, maxY) {
  const tileName = `${minX}-${minY}-${maxX}-${maxY}`;
  const landPath = join(cacheDirectory, `land-${SAMPLE_M}m-${tileName}.tif`);
  const terrainPath = join(cacheDirectory, `terrain-${tileName}.asc`);
  const land = await sharp(landPath).raw().toBuffer({ resolveWithObject: true });
  const cellWidth = (maxX - minX) / GRID_M;
  const cellHeight = (maxY - minY) / GRID_M;
  if (land.info.width !== (maxX - minX) / SAMPLE_M || land.info.height !== (maxY - minY) / SAMPLE_M || land.info.channels < 3) {
    throw new Error(`Unexpected cached land-cover tile ${land.info.width}×${land.info.height}`);
  }
  return { land, terrain: parseArcGrid(await readFile(terrainPath, "utf8"), cellWidth, cellHeight), cellWidth, cellHeight };
}

function hasNaturalLandCover(land, cellX, cellY) {
  const samplesPerCell = GRID_M / SAMPLE_M;
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
  return Boolean(summarizeLandCoverCounts(counts, samplesPerCell * samplesPerCell));
}

const soilRasters = deriveCanonicalCells ? await Promise.all(soilCoverages.map(loadSoilRaster)) : undefined;

async function loadPolygonsForTile(minX, minY, maxX, maxY) {
  const layer = ICGC_GEOLOGY_SOURCE.layer;
  const rtree = `rtree_${layer}_geom`;
  const sql = `select u.id, u.Codi as code, u.Descripcio as description, r.minx, r.maxx, r.miny, r.maxy, hex(u.geom) as geometry from ${layer} u join ${rtree} r on r.id = u.id where r.maxx >= ${minX} and r.minx <= ${maxX} and r.maxy >= ${minY} and r.miny <= ${maxY} order by u.id`;
  const { stdout } = await execFileAsync("sqlite3", ["-readonly", "-json", gpkgPath, sql], { maxBuffer: 256 * 1024 * 1024 });
  return JSON.parse(stdout || "[]").map((feature) => {
    const unit = unitByCode.get(feature.code);
    if (!unit) throw new Error(`Official polygon references code absent from the exhaustive mapping: ${feature.code}`);
    if (unit.description !== feature.description.trim()) throw new Error(`Official description changed for geology code ${feature.code}; regenerate and review the mapping`);
    return {
      unitId: unit.unitId,
      bounds: [Number(feature.minx), Number(feature.miny), Number(feature.maxx), Number(feature.maxy)],
      polygons: parseGeoPackagePolygon(feature.geometry),
    };
  });
}

function indexTileFeatures(features, minX, minY, bucketSizeM = 1_000) {
  const buckets = new Map();
  for (const feature of features) {
    const [west, south, east, north] = feature.bounds;
    const firstX = Math.max(0, Math.floor((west - minX) / bucketSizeM));
    const lastX = Math.floor((east - minX) / bucketSizeM);
    const firstY = Math.max(0, Math.floor((south - minY) / bucketSizeM));
    const lastY = Math.floor((north - minY) / bucketSizeM);
    for (let bucketY = firstY; bucketY <= lastY; bucketY += 1) {
      for (let bucketX = firstX; bucketX <= lastX; bucketX += 1) {
        const key = `${bucketX}:${bucketY}`;
        const bucket = buckets.get(key) ?? [];
        bucket.push(feature);
        buckets.set(key, bucket);
      }
    }
  }
  return { buckets, minX, minY, bucketSizeM };
}

function unitAtPoint(index, x, y) {
  const key = `${Math.floor((x - index.minX) / index.bucketSizeM)}:${Math.floor((y - index.minY) / index.bucketSizeM)}`;
  for (const feature of index.buckets.get(key) ?? []) {
    const [west, south, east, north] = feature.bounds;
    if (x >= west && x <= east && y >= south && y <= north && polygonContainsPoint(feature.polygons, x, y)) return feature.unitId;
  }
  return undefined;
}

async function writeLine(value) {
  if (!output.write(`${JSON.stringify(value)}\n`)) await once(output, "drain");
}

let visited = 0;
let mapped = 0;
let unmappedEligible = 0;
let written = 0;
let tileNumber = 0;
const classAreaTotals = Object.fromEntries(["silicic", "calcareous", "mixed", "unconsolidated"].map((value) => [value, 0]));
const totalTiles = Math.ceil((bounds[2] - bounds[0]) / tileSizeM) * Math.ceil((bounds[3] - bounds[1]) / tileSizeM);

outer: for (let tileY = bounds[1]; tileY < bounds[3]; tileY += tileSizeM) {
  for (let tileX = bounds[0]; tileX < bounds[2]; tileX += tileSizeM) {
    const maxX = Math.min(tileX + tileSizeM, bounds[2]);
    const maxY = Math.min(tileY + tileSizeM, bounds[3]);
    tileNumber += 1;
    const features = await loadPolygonsForTile(tileX, tileY, maxX, maxY);
    const featureIndex = indexTileFeatures(features, tileX, tileY);
    const eligibility = deriveCanonicalCells ? await loadEligibilityTile(tileX, tileY, maxX, maxY) : undefined;
    console.log(`Tile ${tileNumber}/${totalTiles}: ${tileX},${tileY} → ${maxX},${maxY} (${features.length} polygons)`);
    for (let south = tileY; south < maxY; south += GRID_M) {
      for (let west = tileX; west < maxX; west += GRID_M) {
        visited += 1;
        const cellId = `epsg25831:250:${west / GRID_M}:${south / GRID_M}`;
        if (canonicalCells && !canonicalCells.has(cellId)) continue;
        if (eligibility && soilRasters) {
          const cellX = (west - tileX) / GRID_M;
          const cellY = (south - tileY) / GRID_M;
          if (!hasNaturalLandCover(eligibility.land, cellX, cellY)) continue;
          const terrainRow = eligibility.cellHeight - 1 - cellY;
          const altitude = eligibility.terrain.values[terrainRow * eligibility.cellWidth + cellX];
          if (!Number.isFinite(altitude) || altitude === eligibility.terrain.noData || altitude < -50) continue;
          const [longitude, latitude] = toWgs84.forward([west + GRID_M / 2, south + GRID_M / 2]);
          if (soilRasters.some((raster) => !rasterHasValue(raster, longitude, latitude))) continue;
        }
        const samples = [];
        for (let sampleY = SAMPLE_M / 2; sampleY < GRID_M; sampleY += SAMPLE_M) {
          for (let sampleX = SAMPLE_M / 2; sampleX < GRID_M; sampleX += SAMPLE_M) {
            samples.push(unitAtPoint(featureIndex, west + sampleX, south + sampleY));
          }
        }
        // Very narrow mapped slivers can miss the regular 5×5 lattice. Preserve
        // their contextual evidence with a deterministic 10 m fallback lattice.
        if (samples.every((unitId) => unitId === undefined)) {
          samples.length = 0;
          for (let sampleY = 5; sampleY < GRID_M; sampleY += 10) {
            for (let sampleX = 5; sampleX < GRID_M; sampleX += 10) {
              samples.push(unitAtPoint(featureIndex, west + sampleX, south + sampleY));
            }
          }
        }
        const evidence = summarizeGeologySamples(samples, unitsById, samples.length);
        if (!evidence.mappedCoveragePercent) {
          unmappedEligible += 1;
          if (canonicalCells || deriveCanonicalCells) continue;
        }
        if (!evidence.mappedCoveragePercent && !includeAllGridCells && !canonicalCells) continue;
        mapped += evidence.mappedCoveragePercent > 0 ? 1 : 0;
        for (const [substrateClass, percent] of Object.entries(evidence.coverages)) classAreaTotals[substrateClass] += percent;
        await writeLine({
          cellId,
          classCoveragesPacked: evidence.coveragesPacked,
          mappedCoveragePercent: evidence.mappedCoveragePercent,
          ...(evidence.dominantUnitId ? { dominantUnitId: evidence.dominantUnitId } : {}),
          ...(evidence.dominantUnitCoveragePercent ? { dominantUnitCoveragePercent: evidence.dominantUnitCoveragePercent } : {}),
        });
        written += 1;
        if (written >= limit) break outer;
      }
    }
  }
}

output.end();
await once(output, "finish");
if (canonicalCells && (written !== canonicalCells.size || unmappedEligible) && bounds.every((value, index) => value === SOURCE_BOUNDS[index])) {
  throw new Error(`Geology mapped ${written}/${canonicalCells.size} canonical cells; ${unmappedEligible} had no ICGC polygon samples`);
}
console.log(JSON.stringify({
  output: outputPath,
  visited,
  mapped,
  unmappedEligible,
  written,
  gridSizeM: GRID_M,
  samplingM: SAMPLE_M,
  sourceBounds: bounds,
  sourceVersion: ICGC_GEOLOGY_SOURCE.sourceVersion,
  mappingFingerprint: mapping.audit.mappingFingerprint,
  classAreaEquivalentCells: Object.fromEntries(Object.entries(classAreaTotals).map(([key, value]) => [key, Number((value / 100).toFixed(2))])),
  cache: basename(cacheDirectory),
}, null, 2));
