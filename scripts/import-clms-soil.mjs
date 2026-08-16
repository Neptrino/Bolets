import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fromFile } from "geotiff";

const args = new Map(
  process.argv.slice(2).filter((argument) => argument.startsWith("--")).map((argument) => {
    const [key, ...value] = argument.slice(2).split("=");
    return [key, value.length ? value.join("=") : "true"];
  }),
);
const manifestPath = args.get("manifest");
const assetDirectory = args.get("asset-dir");
const pointsPath = args.get("points");
const dryRun = args.has("dry-run");
const historyOnly = args.has("history-only");
const limit = args.has("limit") ? Number(args.get("limit")) : Number.POSITIVE_INFINITY;
if (!manifestPath || !assetDirectory) {
  throw new Error(
    "Usage: npm run soil:import-clms -- --manifest=/absolute/manifest.json --asset-dir=/absolute/cog-directory [--points=/absolute/points.json] [--limit=500] [--dry-run]",
  );
}
if ((!Number.isInteger(limit) && limit !== Number.POSITIVE_INFINITY) || limit < 1) {
  throw new Error("--limit must be a positive integer");
}
if (Number.isFinite(limit) && !dryRun) {
  throw new Error("--limit is a dry-run diagnostic only; live imports must cover the complete canonical lattice");
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;
const importToken = process.env.CLMS_SOIL_IMPORT_TOKEN;
if (!pointsPath && (!supabaseUrl || !serviceRole)) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to discover canonical atmosphere points");
}
if (!dryRun && (!supabaseUrl || (!serviceRole && (!anonKey || !importToken)))) {
  throw new Error(
    "Uploading requires SUPABASE_URL plus either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY with CLMS_SOIL_IMPORT_TOKEN",
  );
}

function sourceFilename(href) {
  if (typeof href !== "string") throw new Error("Every CLMS asset must provide an href");
  const path = href.startsWith("s3://") ? href : new URL(href).pathname;
  const filename = basename(path);
  if (!filename.toLowerCase().endsWith(".tiff")) throw new Error("CLMS asset hrefs must identify TIFF files");
  return filename;
}

async function verifyChecksum(path, asset, label) {
  const rawChecksum = String(asset.checksum ?? "").toLowerCase();
  const multihash = /^d50110([0-9a-f]{32})$/.exec(rawChecksum);
  const algorithm = multihash
    ? "md5"
    : String(asset.checksumAlgorithm ?? "").toLowerCase().replace("-", "");
  const expected = multihash?.[1] ?? rawChecksum;
  if (!expected || !["md5", "sha256"].includes(algorithm)) {
    throw new Error(`${label} is missing verifiable MD5 or SHA-256 checksum provenance`);
  }
  const hash = createHash(algorithm);
  await new Promise((resolvePromise, reject) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolvePromise);
  });
  if (hash.digest("hex") !== expected) throw new Error(`${label} failed checksum verification`);
}

const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8"));

function isoTimestamp(value, label) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be an ISO timestamp`);
  return new Date(parsed).toISOString();
}

function validateLocalProduct(product, kind, snapshotDate) {
  const productId = String(product?.productId ?? "");
  const version = String(product?.version ?? "");
  const pattern = kind === "ssm"
    ? /^c_gls_SSM1km_(\d{12})_CEURO_S1CSAR_(V(\d+)\.(\d+)\.(\d+))_cog$/
    : /^c_gls_SWI1km_(\d{12})_CEURO_SCATSAR_(V(\d+)\.(\d+)\.(\d+))_cog$/;
  const match = pattern.exec(productId);
  if (!match || version !== match[2]) throw new Error(`Manifest has an invalid ${kind.toUpperCase()} product identity`);
  const parts = match.slice(3, 6).map(Number);
  const minimum = kind === "ssm" ? [1, 2, 1] : [2, 1, 1];
  const versionIsSupported = parts[0] === minimum[0] && parts[1] === minimum[1] && parts[2] >= minimum[2];
  if (!versionIsSupported) {
    throw new Error(`Manifest ${kind.toUpperCase()} version is unsupported`);
  }
  const token = match[1];
  if (token.slice(8, 12) !== (kind === "ssm" ? "0000" : "1200")) {
    throw new Error(`Manifest ${kind.toUpperCase()} nominal hour is invalid`);
  }
  const nominalParts = {
    year: Number(token.slice(0, 4)),
    month: Number(token.slice(4, 6)),
    day: Number(token.slice(6, 8)),
    hour: Number(token.slice(8, 10)),
    minute: Number(token.slice(10, 12)),
  };
  const nominalDate = new Date(Date.UTC(
    nominalParts.year,
    nominalParts.month - 1,
    nominalParts.day,
    nominalParts.hour,
    nominalParts.minute,
  ));
  if (nominalDate.getUTCFullYear() !== nominalParts.year || nominalDate.getUTCMonth() !== nominalParts.month - 1 ||
      nominalDate.getUTCDate() !== nominalParts.day || nominalDate.getUTCHours() !== nominalParts.hour ||
      nominalDate.getUTCMinutes() !== nominalParts.minute) {
    throw new Error(`Manifest ${kind.toUpperCase()} product ID has an invalid nominal timestamp`);
  }
  const nominalFromId = nominalDate.toISOString();
  const nominalAt = isoTimestamp(product.nominalAt, `${kind.toUpperCase()} nominalAt`);
  if (nominalAt !== nominalFromId || nominalAt.slice(0, 10) !== snapshotDate) {
    throw new Error(`Manifest ${kind.toUpperCase()} nominal time does not match its product ID and snapshot`);
  }
  const nominalMilliseconds = Date.parse(nominalAt);
  const expectedStart = new Date(kind === "ssm" ? nominalMilliseconds : nominalMilliseconds - 86_399_000).toISOString();
  const expectedEnd = new Date(kind === "ssm" ? nominalMilliseconds + 86_399_000 : nominalMilliseconds).toISOString();
  if (isoTimestamp(product.contentStart, `${kind.toUpperCase()} contentStart`) !== expectedStart ||
      isoTimestamp(product.contentEnd, `${kind.toUpperCase()} contentEnd`) !== expectedEnd ||
      Date.parse(isoTimestamp(product.publishedAt, `${kind.toUpperCase()} publishedAt`)) < Date.parse(expectedEnd)) {
    throw new Error(`Manifest ${kind.toUpperCase()} content or publication time is invalid`);
  }
}

const parsedSnapshotDate = new Date(`${manifest.snapshotDate}T00:00:00Z`);
if (typeof manifest.snapshotDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(manifest.snapshotDate) ||
    Number.isNaN(parsedSnapshotDate.valueOf()) || parsedSnapshotDate.toISOString().slice(0, 10) !== manifest.snapshotDate ||
    (manifest.nativeResolutionM ?? 1000) !== 1000 || manifest.snapshotDate < "2025-07-14") {
  throw new Error("Manifest snapshot date or native resolution is invalid");
}
validateLocalProduct(manifest.ssm, "ssm", manifest.snapshotDate);
validateLocalProduct(manifest.swi, "swi", manifest.snapshotDate);

const assetSpecs = {
  ssmDn: manifest?.ssm?.assets?.ssm,
  ssmNoiseDn: manifest?.ssm?.assets?.noise,
  swi002Dn: manifest?.swi?.assets?.swi002,
  qflag002Dn: manifest?.swi?.assets?.qflag002,
  swi005Dn: manifest?.swi?.assets?.swi005,
  qflag005Dn: manifest?.swi?.assets?.qflag005,
  swi010Dn: manifest?.swi?.assets?.swi010,
  qflag010Dn: manifest?.swi?.assets?.qflag010,
  ssfDn: manifest?.swi?.assets?.ssf,
};
const missingAsset = Object.entries(assetSpecs).find(([, asset]) => !asset?.href);
if (missingAsset) throw new Error(`Manifest is missing the ${missingAsset[0]} asset`);

function expectedAssetHrefs(product, kind, bandNames) {
  const productId = String(product?.productId ?? "");
  const version = String(product?.version ?? "");
  const pattern = kind === "ssm"
    ? /^c_gls_SSM1km_(\d{12})_CEURO_S1CSAR_(V\d+\.\d+\.\d+)_cog$/
    : /^c_gls_SWI1km_(\d{12})_CEURO_SCATSAR_(V\d+\.\d+\.\d+)_cog$/;
  const match = pattern.exec(productId);
  if (!match || version !== match[2]) throw new Error(`Manifest has an invalid ${kind.toUpperCase()} product identity`);
  const nominalToken = match[1];
  const datePath = `${nominalToken.slice(0, 4)}/${nominalToken.slice(4, 6)}/${nominalToken.slice(6, 8)}`;
  const root = kind === "ssm"
    ? "surface_soil_moisture/ssm_europe_1km_daily_v1"
    : "soil_water_index/swi_europe_1km_daily_v2";
  const family = kind === "ssm" ? "SSM" : "SWI";
  const sensor = kind === "ssm" ? "S1CSAR" : "SCATSAR";
  return Object.fromEntries(Object.entries(bandNames).map(([key, band]) => [
    key,
    `s3://eodata/CLMS/bio-geophysical/${root}/${datePath}/${productId}/` +
    `c_gls_${family}1km-${band}_${nominalToken}_CEURO_${sensor}_${version}.tiff`,
  ]));
}

const expectedHrefs = {
  ...expectedAssetHrefs(manifest.ssm, "ssm", { ssmDn: "SSM", ssmNoiseDn: "NOISE" }),
  ...expectedAssetHrefs(manifest.swi, "swi", {
    swi002Dn: "SWI002",
    qflag002Dn: "QFLAG002",
    swi005Dn: "SWI005",
    qflag005Dn: "QFLAG005",
    swi010Dn: "SWI010",
    qflag010Dn: "QFLAG010",
    ssfDn: "SSF",
  }),
};
for (const [key, asset] of Object.entries(assetSpecs)) {
  if (asset.href !== expectedHrefs[key]) {
    throw new Error(`${key} does not match the official product band, date, version, and path`);
  }
}

async function fetchAtmospherePoints() {
  if (pointsPath) {
    const parsed = JSON.parse(await readFile(resolve(pointsPath), "utf8"));
    if (!Array.isArray(parsed)) throw new Error("--points must contain a JSON array");
    return parsed;
  }
  const points = [];
  for (let start = 0; ; start += 1000) {
    const url = new URL(`${supabaseUrl}/rest/v1/weather_grid_points`);
    url.searchParams.set("select", "point_id,requested_lat,requested_lon");
    url.searchParams.set("model", "eq.arome_france");
    url.searchParams.set("native_resolution_m", "eq.2500");
    url.searchParams.set("order", "point_id.asc");
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${serviceRole}`,
        apikey: serviceRole,
        Range: `${start}-${start + 999}`,
      },
    });
    if (!response.ok) throw new Error(`Unable to read canonical atmosphere points (${response.status})`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("Canonical atmosphere point response is invalid");
    points.push(...batch);
    if (batch.length < 1000) break;
  }
  return points;
}

function normalizePoint(input) {
  const pointId = input?.point_id ?? input?.pointId;
  const latitude = Number(input?.requested_lat ?? input?.latitude);
  const longitude = Number(input?.requested_lon ?? input?.longitude);
  if (typeof pointId !== "string" || !/^open-meteo:arome-2500:-?\d+:-?\d+$/.test(pointId) ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Canonical atmosphere point input is invalid");
  }
  return { pointId, latitude, longitude };
}

const points = (await fetchAtmospherePoints()).map(normalizePoint).slice(0, limit);
if (!points.length) throw new Error("No canonical atmosphere points were available to sample");

const assetEntries = await Promise.all(Object.entries(assetSpecs).map(async ([key, asset]) => {
  const path = join(resolve(assetDirectory), sourceFilename(asset.href));
  await verifyChecksum(path, asset, key);
  const tiff = await fromFile(path);
  const image = await tiff.getImage();
  if (image.getSamplesPerPixel() !== 1) throw new Error(`${key} must be a single-band GeoTIFF`);
  return [key, image];
}));
const images = Object.fromEntries(assetEntries);
const reference = images.ssmDn;
const width = reference.getWidth();
const height = reference.getHeight();
const [west, south, east, north] = reference.getBoundingBox();
const [originX, originY] = reference.getOrigin();
const [resolutionX, resolutionY] = reference.getResolution();
const referenceGeoKeys = reference.getGeoKeys();
const pixelDegrees = 1 / 112;
if (referenceGeoKeys?.GeographicTypeGeoKey !== 4326 || referenceGeoKeys?.ProjectedCSTypeGeoKey !== undefined ||
    width !== 6832 || height !== 4144 || Math.abs(west + 11) > 1e-6 || Math.abs(south - 35) > 1e-6 ||
    Math.abs(east - 50) > 1e-6 || Math.abs(north - 72) > 1e-6) {
  throw new Error("CLMS reference raster does not match the documented EPSG:4326 CEURO grid");
}
if (Math.abs(originX + 11) > 1e-8 || Math.abs(originY - 72) > 1e-8 ||
    Math.abs(resolutionX - pixelDegrees) > 1e-12 || Math.abs(resolutionY + pixelDegrees) > 1e-12 ||
    reference.getFileDirectory().ModelTransformation !== undefined) {
  throw new Error("CLMS reference raster is not on the documented north-up 1/112-degree transform");
}
for (const [key, image] of assetEntries) {
  const bounds = image.getBoundingBox();
  const origin = image.getOrigin();
  const resolution = image.getResolution();
  const geoKeys = image.getGeoKeys();
  if (image.getWidth() !== width || image.getHeight() !== height ||
      geoKeys?.GeographicTypeGeoKey !== 4326 || geoKeys?.ProjectedCSTypeGeoKey !== undefined ||
      image.getFileDirectory().ModelTransformation !== undefined ||
      bounds.some((value, index) => Math.abs(value - [west, south, east, north][index]) > 1e-8) ||
      Math.abs(origin[0] - originX) > 1e-8 || Math.abs(origin[1] - originY) > 1e-8 ||
      Math.abs(resolution[0] - resolutionX) > 1e-12 || Math.abs(resolution[1] - resolutionY) > 1e-12) {
    throw new Error(`${key} is not aligned with the CLMS reference grid`);
  }
}

const pixelWidth = (east - west) / width;
const pixelHeight = (north - south) / height;
function pixelFor(point) {
  const column = Math.floor((point.longitude - west) / pixelWidth);
  const row = Math.floor((north - point.latitude) / pixelHeight);
  if (column < 0 || column >= width || row < 0 || row >= height) {
    throw new Error("A canonical atmosphere point lies outside the CLMS CEURO raster");
  }
  return { ...point, column, row };
}
const pixelPoints = points.map(pixelFor);
const minColumn = Math.min(...pixelPoints.map((point) => point.column));
const maxColumn = Math.max(...pixelPoints.map((point) => point.column));
const minRow = Math.min(...pixelPoints.map((point) => point.row));
const maxRow = Math.max(...pixelPoints.map((point) => point.row));
const window = [minColumn, minRow, maxColumn + 1, maxRow + 1];
const windowWidth = maxColumn - minColumn + 1;

const rasterEntries = await Promise.all(assetEntries.map(async ([key, image]) => {
  const raster = await image.readRasters({ window, samples: [0], interleave: true });
  return [key, raster];
}));
const rasters = Object.fromEntries(rasterEntries);

function rawValue(key, point) {
  const index = (point.row - minRow) * windowWidth + (point.column - minColumn);
  const value = Number(rasters[key][index]);
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error(`${key} returned an invalid raw DN`);
  return value;
}

const samples = pixelPoints.map((point) => ({
  atmospherePointId: point.pointId,
  sourcePixelLatitude: north - (point.row + 0.5) * pixelHeight,
  sourcePixelLongitude: west + (point.column + 0.5) * pixelWidth,
  ssmDn: rawValue("ssmDn", point),
  ssmNoiseDn: rawValue("ssmNoiseDn", point),
  swi002Dn: rawValue("swi002Dn", point),
  qflag002Dn: rawValue("qflag002Dn", point),
  swi005Dn: rawValue("swi005Dn", point),
  qflag005Dn: rawValue("qflag005Dn", point),
  swi010Dn: rawValue("swi010Dn", point),
  qflag010Dn: rawValue("qflag010Dn", point),
  ssfDn: rawValue("ssfDn", point),
}));

const allowedSsm = new Set([241, 242, 251, 252, 253, 255]);
const allowedSwi = new Set([241, 242, 251, 252, 253, 254, 255]);
const onlyNoData = new Set([255]);
function validateDn(value, flags, label) {
  if (!Number.isInteger(value) || ((value < 0 || value > 200) && !flags.has(value))) {
    throw new Error(`${label} returned an unsupported raw DN`);
  }
}
for (const sample of samples) {
  validateDn(sample.ssmDn, allowedSsm, "SSM");
  validateDn(sample.ssmNoiseDn, onlyNoData, "SSM noise");
  for (const key of ["swi002Dn", "qflag002Dn", "swi005Dn", "qflag005Dn", "swi010Dn", "qflag010Dn"]) {
    validateDn(sample[key], allowedSwi, key);
  }
  if (![0, 1, 2, 3, 4, 255].includes(sample.ssfDn)) throw new Error("SSF returned an unsupported raw DN");
}

const BATCH_SIZE = 500;
const batchCount = Math.ceil(samples.length / BATCH_SIZE);
if (dryRun) {
  const count = (key, predicate) => samples.filter((sample) => predicate(sample[key])).length;
  console.log(JSON.stringify({
    validInput: true,
    snapshotDate: manifest.snapshotDate,
    samples: samples.length,
    batchCount,
    sourceGrid: { width, height, pixelDegrees: pixelWidth },
    diagnostics: {
      ssmMeasurements: count("ssmDn", (value) => value <= 200),
      swi005Measurements: count("swi005Dn", (value) => value <= 200),
      unfrozenNominalSurfaceStates: count("ssfDn", (value) => value === 0),
    },
    scoringEnabled: false,
  }, null, 2));
  process.exit(0);
}

const authorization = serviceRole ?? anonKey;
let finalResult;
for (let batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
  const batch = samples.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
  const response = await fetch(`${supabaseUrl}/functions/v1/import-clms-soil`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authorization}`,
      apikey: authorization,
      "Content-Type": "application/json",
      ...(importToken ? { "x-clms-import-token": importToken } : {}),
    },
    body: JSON.stringify({
      manifest,
      samples: batch,
      batchIndex,
      batchCount,
      expectedSamples: samples.length,
      // Dates older than the four-date hot preview only feed the append-only
      // history archive (pass --history-only for backfills).
      ...(historyOnly ? { historyOnly: true } : {}),
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`CLMS import failed in batch ${batchIndex + 1} (${result.error ?? response.status})`);
  finalResult = result;
  console.log(
    `Imported CLMS ${historyOnly ? "history" : "shadow"} batch ${batchIndex + 1}/${batchCount}: ` +
      `${historyOnly ? result.historyRowsWritten : result.samplesWritten} samples`,
  );
}

if (!historyOnly && finalResult?.complete !== true) {
  throw new Error(
    `CLMS shadow import is incomplete (${finalResult?.samplesStoredForDate ?? 0}/${finalResult?.canonicalSampleCount ?? "unknown"} canonical samples)`,
  );
}

console.log(JSON.stringify({
  snapshotDate: manifest.snapshotDate,
  samples: samples.length,
  complete: finalResult?.complete === true,
  canonicalSampleCount: finalResult?.canonicalSampleCount,
  scoringEnabled: false,
}, null, 2));
