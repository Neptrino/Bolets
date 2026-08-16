import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import proj4 from "proj4";
import sharp from "sharp";
import { fromFile } from "geotiff";

proj4.defs("EPSG:25831", "+proj=utm +zone=31 +ellps=GRS80 +units=m +no_defs +type=crs");
const toUtm = proj4("EPSG:4326", "EPSG:25831");
const toWgs = proj4("EPSG:25831", "EPSG:4326");

const GRID_M = 250, SAMPLE_M = 50, TILE_M = 10_000;
const SOURCE_BOUNDS = [259_000, 4_483_750, 529_000, 4_754_250];
const SOIL_BOUNDS = [0, 40.35, 3.45, 43.05];
const CACHE = "/tmp/gate-audit-cache";
mkdirSync(CACHE, { recursive: true });

const rgbToCode = new Map([
  ["51,204,51", 221], ["102,255,51", 222], ["104,144,24", 223], ["150,125,95", 224],
  ["25,230,30", 225], ["180,255,155", 226], ["170,165,0", 227], ["195,195,160", 228], ["0,255,155", 229]
]);

async function fetchFile(url, path, attempts = 4) {
  if (existsSync(path)) return path;
  for (let a = 1; a <= attempts; a++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "bolets-gate-audit/1.0" } });
      if (!r.ok) throw new Error(`${r.status}`);
      await writeFile(path, Buffer.from(await r.arrayBuffer()));
      return path;
    } catch (e) {
      if (a === attempts) throw new Error(`download failed ${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, a * 800));
    }
  }
}

function parseArcGrid(text, w, h) {
  const lines = text.trim().split(/\r?\n/);
  const header = Object.fromEntries(lines.slice(0, 6).map((l) => {
    const [k, ...v] = l.trim().split(/\s+/); return [k.toUpperCase(), Number(v.join(" "))];
  }));
  if (header.NCOLS !== w || header.NROWS !== h) throw new Error(`grid ${header.NCOLS}x${header.NROWS} != ${w}x${h}`);
  const values = lines.slice(6).flatMap((l) => l.trim().split(/\s+/).map(Number));
  if (values.length !== w * h) throw new Error("incomplete terrain grid");
  return { values, noData: header.NODATA_VALUE };
}

// ---- soil pH raster (single download, exactly as the builder does) ----
async function loadSoilRaster() {
  const path = join(CACHE, "phh2o.tif");
  const url = new URL("https://maps.isric.org/mapserv");
  url.searchParams.set("map", "/map/phh2o.map");
  url.searchParams.set("SERVICE", "WCS"); url.searchParams.set("VERSION", "2.0.1");
  url.searchParams.set("REQUEST", "GetCoverage"); url.searchParams.set("COVERAGEID", "phh2o_0-5cm_mean");
  url.searchParams.set("FORMAT", "GEOTIFF_INT16");
  url.searchParams.append("SUBSET", `x(${SOIL_BOUNDS[0]},${SOIL_BOUNDS[2]})`);
  url.searchParams.append("SUBSET", `y(${SOIL_BOUNDS[1]},${SOIL_BOUNDS[3]})`);
  url.searchParams.set("SUBSETTINGCRS", "http://www.opengis.net/def/crs/EPSG/0/4326");
  url.searchParams.set("OUTPUTCRS", "http://www.opengis.net/def/crs/EPSG/0/4326");
  await fetchFile(url, path);
  const image = await (await fromFile(path)).getImage();
  return { data: await image.readRasters({ interleave: true }), width: image.getWidth(),
    height: image.getHeight(), bounds: image.getBoundingBox(), noData: Number(image.getGDALNoData()) };
}
function rasterValue(r, lon, lat) {
  const [w, s, e, n] = r.bounds;
  const x = Math.floor(((lon - w) / (e - w)) * r.width);
  const y = Math.floor(((n - lat) / (n - s)) * r.height);
  if (x < 0 || x >= r.width || y < 0 || y >= r.height) return undefined;
  const v = Number(r.data[y * r.width + x]);
  return !Number.isFinite(v) || v === r.noData || v <= 0 ? undefined : v;
}

// ---- tiles ----
async function loadTile(tx, ty) {
  const x1 = tx + TILE_M, y1 = ty + TILE_M;
  const name = `${tx}-${ty}`;
  const landPath = join(CACHE, `land-${name}.tif`);
  const lurl = new URL("https://geoserveis.icgc.cat/servei/catalunya/cobertes-sol/wms");
  Object.entries({ SERVICE:"WMS", VERSION:"1.1.1", REQUEST:"GetMap", LAYERS:"cobertes_2024", STYLES:"",
    FORMAT:"image/tiff", SRS:"EPSG:25831", BBOX:`${tx},${ty},${x1},${y1}`,
    WIDTH:String(TILE_M/SAMPLE_M), HEIGHT:String(TILE_M/SAMPLE_M) }).forEach(([k,v])=>lurl.searchParams.set(k,v));
  await fetchFile(lurl, landPath);
  const land = await sharp(landPath).raw().toBuffer({ resolveWithObject: true });
  if (land.info.width !== TILE_M/SAMPLE_M || land.info.channels < 3) throw new Error(`bad land tile ${name}`);

  const terrPath = join(CACHE, `terr-${name}.asc`);
  const turl = new URL("https://geoserveis.icgc.cat/icc_mdt/wcs/service");
  Object.entries({ SERVICE:"WCS", REQUEST:"GetCoverage", VERSION:"1.0.0", CRS:"EPSG:25831",
    COVERAGE:"icc:met", WIDTH:String(TILE_M/GRID_M), HEIGHT:String(TILE_M/GRID_M),
    FORMAT:"ArcGrid", EXCEPTIONS:"XML", BBOX:`${tx},${ty},${x1},${y1}` }).forEach(([k,v])=>turl.searchParams.set(k,v));
  await fetchFile(turl, terrPath);
  const text = await readFile(terrPath, "utf8");
  if (!text.trimStart().startsWith("NCOLS")) throw new Error(`bad terrain tile ${name}`);
  return { land, terrain: parseArcGrid(text, TILE_M/GRID_M, TILE_M/GRID_M) };
}

// ---- main ----
const points = JSON.parse(readFileSync("/tmp/gatework/gbif-points.json", "utf8"));
for (const p of points) {
  const [x, y] = toUtm.forward([p.lon, p.lat]);
  p.utmX = x; p.utmY = y;
  p.cellX = Math.floor(x / GRID_M); p.cellY = Math.floor(y / GRID_M);
  p.cellId = `epsg25831:250:${p.cellX}:${p.cellY}`;
  p.inSource = x >= SOURCE_BOUNDS[0] && x < SOURCE_BOUNDS[2] && y >= SOURCE_BOUNDS[1] && y < SOURCE_BOUNDS[3];
}
const usable = points.filter((p) => p.inSource);
console.error(`points=${points.length} inSourceBounds=${usable.length} outside=${points.length-usable.length}`);

const cellIds = new Map();
for (const p of usable) if (!cellIds.has(p.cellId)) cellIds.set(p.cellId, { cellX: p.cellX, cellY: p.cellY });
const tiles = new Map();
for (const [id, c] of cellIds) {
  const tx = Math.floor(c.cellX * GRID_M / TILE_M) * TILE_M;
  const ty = Math.floor(c.cellY * GRID_M / TILE_M) * TILE_M;
  const key = `${tx}:${ty}`;
  if (!tiles.has(key)) tiles.set(key, { tx, ty, cells: [] });
  tiles.get(key).cells.push({ id, ...c });
}
console.error(`uniqueCells=${cellIds.size} tiles=${tiles.size}`);

const soil = await loadSoilRaster();
console.error(`soil raster ${soil.width}x${soil.height}`);

const cellData = new Map();
const unmapped = new Map();
const tileList = [...tiles.values()];
let done = 0;
const CONC = 6;
async function worker() {
  while (tileList.length) {
    const t = tileList.pop();
    let tile;
    try { tile = await loadTile(t.tx, t.ty); }
    catch (e) { console.error(`tile ${t.tx},${t.ty} FAILED: ${e.message}`); done++; continue; }
    const { land, terrain } = tile;
    const spc = GRID_M / SAMPLE_M;              // 5
    const cellsPerTile = TILE_M / GRID_M;       // 40
    for (const c of t.cells) {
      const lx = c.cellX - t.tx / GRID_M;       // 0..39
      const ly = c.cellY - t.ty / GRID_M;
      const counts = new Map();
      let unmappedCount = 0;
      for (let sy = 0; sy < spc; sy++) for (let sx = 0; sx < spc; sx++) {
        const px = lx * spc + sx;
        const py = land.info.height - 1 - (ly * spc + sy);
        const o = (py * land.info.width + px) * land.info.channels;
        const key = `${land.data[o]},${land.data[o+1]},${land.data[o+2]}`;
        const code = rgbToCode.get(key);
        if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
        else { unmappedCount++; unmapped.set(key, (unmapped.get(key) ?? 0) + 1); }
      }
      const trow = cellsPerTile - 1 - ly;
      const altRaw = terrain.values[trow * cellsPerTile + lx];
      const altitude = Number.isFinite(altRaw) && altRaw !== terrain.noData && altRaw >= -50 ? altRaw : undefined;
      const [lon, lat] = toWgs.forward([c.cellX*GRID_M + GRID_M/2, c.cellY*GRID_M + GRID_M/2]);
      const phRaw = rasterValue(soil, lon, lat);
      cellData.set(c.id, {
        counts: Object.fromEntries(counts), unmappedCount, altitude,
        soilPh: phRaw === undefined ? undefined : Number((phRaw/10).toFixed(1)),
      });
    }
    done++;
    if (done % 25 === 0) console.error(`tiles ${done}/${tiles.size}`);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));

writeFileSync("/tmp/gatework/cell-data.json", JSON.stringify({
  points, cells: Object.fromEntries(cellData),
  unmappedRgb: [...unmapped.entries()].sort((a,b)=>b[1]-a[1]),
}));
console.error(`\nresolved cells: ${cellData.size}/${cellIds.size}`);
