import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fromFile, type GeoTIFFImage } from "geotiff";
import { CLMS_GRID } from "./lib/clms-cdse.mjs";
import {
  clmsFlagMeaning,
  clmsShadowValues,
  normalizeClmsManifest,
  normalizeClmsSample,
  type ClmsManifestInput,
} from "../supabase/functions/_shared/clms-soil.ts";

type JsonRecord = Record<string, unknown>;

export type PrivateComparisonPoint = {
  label: string;
  latitude: number;
  longitude: number;
};

type PixelPoint = PrivateComparisonPoint & {
  column: number;
  row: number;
};

type AssetInput = {
  href: string;
  checksum: string;
  checksumAlgorithm?: string;
};

type ProductInput = {
  productId: string;
  version: string;
  nominalAt: string;
  contentStart: string;
  contentEnd: string;
  publishedAt: string;
  assets: Record<string, AssetInput>;
};

type ManifestInput = {
  snapshotDate: string;
  nativeResolutionM?: number;
  ssm: ProductInput;
  swi: ProductInput;
};

const ASSET_KEYS = {
  ssmDn: ["ssm", "ssm"],
  ssmNoiseDn: ["ssm", "noise"],
  swi002Dn: ["swi", "swi002"],
  qflag002Dn: ["swi", "qflag002"],
  swi005Dn: ["swi", "swi005"],
  qflag005Dn: ["swi", "qflag005"],
  swi010Dn: ["swi", "swi010"],
  qflag010Dn: ["swi", "qflag010"],
  ssfDn: ["swi", "ssf"],
} as const;

type AssetKey = keyof typeof ASSET_KEYS;
type RawBands = Record<AssetKey, number>;
const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const CLMS_SSF_CATALOG_URL =
  "https://stac.dataspace.copernicus.eu/v1/collections/clms_swi_europe_1km_daily_v2_cog";
const CLMS_SWI_PUM_URL =
  "https://land.copernicus.eu/en/technical-library/product-user-manual-soil-water-index-version-1/@@download/file";
const CLMS_SSF_CONFLICT_URL =
  "https://land.copernicus.eu/en/technical-library/quality-assessment-report-update-2023-soil-water-index-version-1/@@download/file";
const CLMS_SSF_DN_2_CAVEAT =
  "The current CDSE COG catalog labels raw SSF DN 2 as thawing, while the 2026 CLMS SWI1km " +
  "validation report section 5.2 labels SSF=2 as frozen. The raw code is preserved and the " +
  "physical state remains unresolved pending provider clarification.";
const CLMS_SSF_CATALOG_LABELS = new Map<number, string>([
  [0, "nominal"],
  [1, "frozen"],
  [2, "thawing"],
  [3, "frozen_snow"],
  [4, "wet_snow"],
]);

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonRecord;
}

function finiteNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

export function normalizePrivateComparisonPoints(input: unknown): PrivateComparisonPoint[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 100) {
    throw new Error("The private points file must contain between 1 and 100 locations");
  }
  return input.map((value, index) => {
    const point = record(value, `Location ${index + 1}`);
    const expectedLabel = `Location ${index + 1}`;
    if (point.label !== expectedLabel) {
      throw new Error(`Private point labels must be sequential (${expectedLabel})`);
    }
    const latitude = finiteNumber(point.latitude, `${expectedLabel} latitude`);
    const longitude = finiteNumber(point.longitude, `${expectedLabel} longitude`);
    if (latitude < CLMS_GRID.south || latitude >= CLMS_GRID.north ||
        longitude < CLMS_GRID.west || longitude >= CLMS_GRID.east) {
      throw new Error(`${expectedLabel} lies outside the CLMS CEURO grid`);
    }
    return { label: expectedLabel, latitude, longitude };
  });
}

function parseArguments(argv: string[]) {
  const args = new Map(argv.filter((argument) => argument.startsWith("--")).map((argument) => {
    const [key, ...value] = argument.slice(2).split("=");
    return [key, value.join("=")];
  }));
  const manifestPath = args.get("manifest");
  const assetDirectory = args.get("asset-dir");
  const pointsPath = args.get("points");
  if (!manifestPath || !assetDirectory || !pointsPath) {
    throw new Error(
      "Usage: npm run soil:sample-clms -- --manifest=/absolute/external/clms-manifest.json " +
      "--asset-dir=/absolute/external/cog-directory --points=/absolute/external/private-points.json",
    );
  }
  for (const [label, path] of [["--manifest", manifestPath], ["--asset-dir", assetDirectory], ["--points", pointsPath]]) {
    if (!isAbsolute(path)) throw new Error(`${label} must be an absolute path`);
  }
  return {
    manifestPath: resolve(manifestPath),
    assetDirectory: resolve(assetDirectory),
    pointsPath: resolve(pointsPath),
  };
}

function assertOutsideRepository(path: string, label: string) {
  const pathFromRepository = relative(REPOSITORY_ROOT, path);
  if (pathFromRepository === "" || (!pathFromRepository.startsWith("..") && !isAbsolute(pathFromRepository))) {
    throw new Error(`${label} must remain outside the repository`);
  }
}

function sourceFilename(href: string) {
  const path = href.startsWith("s3://") ? new URL(href).pathname : new URL(href).pathname;
  const filename = basename(path);
  if (!filename.toLowerCase().endsWith(".tiff")) {
    throw new Error("Every CLMS asset must identify a TIFF file");
  }
  return filename;
}

function checksumProvenance(asset: AssetInput, label: string) {
  const rawChecksum = String(asset.checksum ?? "").toLowerCase();
  const md5Multihash = /^d50110([0-9a-f]{32})$/.exec(rawChecksum);
  if (md5Multihash) return { algorithm: "md5", digest: md5Multihash[1] } as const;
  const algorithm = String(asset.checksumAlgorithm ?? "").toLowerCase().replace("-", "");
  if (algorithm === "md5" && /^[0-9a-f]{32}$/.test(rawChecksum)) {
    return { algorithm: "md5", digest: rawChecksum } as const;
  }
  if (algorithm === "sha256" && /^[0-9a-f]{64}$/.test(rawChecksum)) {
    return { algorithm: "sha256", digest: rawChecksum } as const;
  }
  throw new Error(`${label} is missing verifiable checksum provenance`);
}

async function digestFile(path: string, algorithm: "md5" | "sha256") {
  const hash = createHash(algorithm);
  await new Promise<void>((resolvePromise, reject) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

async function openVerifiedAsset(
  assetDirectory: string,
  asset: AssetInput,
  label: string,
) {
  const root = await realpath(assetDirectory);
  const path = await realpath(resolve(root, sourceFilename(asset.href)));
  const pathFromRoot = relative(root, path);
  if (pathFromRoot === "" || pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot)) {
    throw new Error(`${label} resolves outside --asset-dir`);
  }
  if (!(await stat(path)).isFile()) throw new Error(`${label} is not a regular file`);
  const checksum = checksumProvenance(asset, label);
  if (await digestFile(path, checksum.algorithm) !== checksum.digest) {
    throw new Error(`${label} failed checksum verification`);
  }
  const tiff = await fromFile(path);
  const image = await tiff.getImage();
  if (image.getSamplesPerPixel() !== 1) throw new Error(`${label} must be a single-band GeoTIFF`);
  return image;
}

function approximately(actual: number, expected: number, tolerance: number) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

function validateReferenceGrid(image: GeoTIFFImage) {
  const [west, south, east, north] = image.getBoundingBox();
  const [originX, originY] = image.getOrigin();
  const [resolutionX, resolutionY] = image.getResolution();
  const geoKeys = image.getGeoKeys();
  const fileDirectory = image.getFileDirectory() as unknown as { ModelTransformation?: unknown };
  if (image.getWidth() !== CLMS_GRID.width || image.getHeight() !== CLMS_GRID.height ||
      geoKeys?.GeographicTypeGeoKey !== 4326 || geoKeys?.ProjectedCSTypeGeoKey !== undefined ||
      !approximately(west, CLMS_GRID.west, 1e-6) || !approximately(south, CLMS_GRID.south, 1e-6) ||
      !approximately(east, CLMS_GRID.east, 1e-6) || !approximately(north, CLMS_GRID.north, 1e-6) ||
      !approximately(originX, CLMS_GRID.west, 1e-8) || !approximately(originY, CLMS_GRID.north, 1e-8) ||
      !approximately(resolutionX, CLMS_GRID.pixelDegrees, 1e-12) ||
      !approximately(resolutionY, -CLMS_GRID.pixelDegrees, 1e-12) ||
      fileDirectory.ModelTransformation !== undefined) {
    throw new Error("CLMS reference raster does not match the documented EPSG:4326 CEURO grid");
  }
  return { west, south, east, north, originX, originY, resolutionX, resolutionY };
}

function validateAlignedGrid(
  image: GeoTIFFImage,
  reference: ReturnType<typeof validateReferenceGrid>,
  label: string,
) {
  const bounds = image.getBoundingBox();
  const origin = image.getOrigin();
  const resolution = image.getResolution();
  const expectedBounds = [reference.west, reference.south, reference.east, reference.north];
  const geoKeys = image.getGeoKeys();
  const fileDirectory = image.getFileDirectory() as unknown as { ModelTransformation?: unknown };
  if (image.getWidth() !== CLMS_GRID.width || image.getHeight() !== CLMS_GRID.height ||
      geoKeys?.GeographicTypeGeoKey !== 4326 || geoKeys?.ProjectedCSTypeGeoKey !== undefined ||
      fileDirectory.ModelTransformation !== undefined ||
      bounds.some((value, index) => !approximately(value, expectedBounds[index], 1e-8)) ||
      !approximately(origin[0], reference.originX, 1e-8) || !approximately(origin[1], reference.originY, 1e-8) ||
      !approximately(resolution[0], reference.resolutionX, 1e-12) ||
      !approximately(resolution[1], reference.resolutionY, 1e-12)) {
    throw new Error(`${label} is not aligned with the CLMS reference grid`);
  }
}

function pixelFor(point: PrivateComparisonPoint): PixelPoint {
  const column = Math.floor((point.longitude - CLMS_GRID.west) / CLMS_GRID.pixelDegrees);
  const row = Math.floor((CLMS_GRID.north - point.latitude) / CLMS_GRID.pixelDegrees);
  if (column < 0 || column >= CLMS_GRID.width || row < 0 || row >= CLMS_GRID.height) {
    throw new Error(`${point.label} lies outside the CLMS CEURO raster`);
  }
  return { ...point, column, row };
}

function rawBand(rawDn: number, kind: "ssm" | "swi", relativePercent: number | undefined) {
  return {
    rawDn,
    relativePercent: relativePercent ?? null,
    flag: rawDn > 200 ? clmsFlagMeaning(rawDn, kind) ?? "no-data" : null,
  };
}

function noiseBand(rawDn: number, relativePercent: number | undefined) {
  return {
    rawDn,
    relativePercent: relativePercent ?? null,
    flag: rawDn === 255 ? "no-data" : null,
  };
}

function qualityBand(rawDn: number, relativePercent: number | undefined) {
  return {
    rawDn,
    relativePercent: relativePercent ?? null,
    flag: rawDn > 200 ? clmsFlagMeaning(rawDn, "swi") ?? "no-data" : null,
  };
}

function surfaceStateBand(rawDn: number, catalogDescription: string | undefined) {
  const hasOfficialDocumentationConflict = rawDn === 2;
  const catalogLabel = CLMS_SSF_CATALOG_LABELS.get(rawDn);
  return {
    rawDn,
    interpretation: rawDn === 255 ? "unavailable" : rawDn === 0 ? "nominal" : "non-nominal",
    catalogLabel: catalogLabel ?? null,
    catalogDescription: catalogDescription ?? null,
    semanticStatus: hasOfficialDocumentationConflict
      ? "official-documentation-conflict"
      : catalogLabel ? "catalog-label" : "unavailable",
    caveat: hasOfficialDocumentationConflict ? CLMS_SSF_DN_2_CAVEAT : null,
  };
}

function privacySafeLocation(point: PixelPoint, raw: RawBands) {
  const sourcePixelLatitude = CLMS_GRID.north - (point.row + 0.5) * CLMS_GRID.pixelDegrees;
  const sourcePixelLongitude = CLMS_GRID.west + (point.column + 0.5) * CLMS_GRID.pixelDegrees;
  const normalized = normalizeClmsSample({
    // This identifier remains internal to the local comparison. It lets the
    // shared shadow contract validate every raw band without exposing either
    // the private observation or its source-pixel coordinates in the report.
    atmospherePointId: `open-meteo:arome-2500:${point.row}:${point.column}`,
    sourcePixelLatitude,
    sourcePixelLongitude,
    ...raw,
  });
  const decoded = clmsShadowValues(normalized);
  return {
    label: point.label,
    surfaceSoilMoisture: {
      measurement: rawBand(raw.ssmDn, "ssm", decoded.surfaceSoilMoisturePercent),
      noise: noiseBand(raw.ssmNoiseDn, decoded.surfaceSoilMoistureNoisePercent),
      status: decoded.surfaceSoilMoistureStatus,
    },
    soilWaterIndex: {
      t2: rawBand(raw.swi002Dn, "swi", decoded.soilWaterIndexT2Percent),
      t2Quality: qualityBand(raw.qflag002Dn, decoded.soilWaterIndexT2QualityPercent),
      t5: rawBand(raw.swi005Dn, "swi", decoded.soilWaterIndexT5Percent),
      t5Quality: qualityBand(raw.qflag005Dn, decoded.soilWaterIndexT5QualityPercent),
      t10: rawBand(raw.swi010Dn, "swi", decoded.soilWaterIndexT10Percent),
      t10Quality: qualityBand(raw.qflag010Dn, decoded.soilWaterIndexT10QualityPercent),
      surfaceState: surfaceStateBand(raw.ssfDn, decoded.surfaceState),
      t5Status: decoded.soilWaterIndexT5Status,
    },
  };
}

export function buildPrivacySafeClmsReport(options: {
  manifest: ManifestInput;
  points: PixelPoint[];
  rawByLocation: RawBands[];
  uniqueSourcePixels: number;
}) {
  if (options.points.length !== options.rawByLocation.length) {
    throw new Error("CLMS point and raster sample counts do not match");
  }
  const normalizedManifest = normalizeClmsManifest(options.manifest as ClmsManifestInput);
  return {
    validInput: true,
    comparisonKind: "clms-private-point-shadow",
    snapshotDate: normalizedManifest.snapshot_date,
    provenance: {
      surfaceSoilMoisture: {
        productId: normalizedManifest.ssm_product_id,
        version: normalizedManifest.ssm_product_version,
        nominalAt: normalizedManifest.ssm_nominal_at,
        contentStart: normalizedManifest.ssm_content_start,
        contentEnd: normalizedManifest.ssm_content_end,
      },
      soilWaterIndex: {
        productId: normalizedManifest.swi_product_id,
        version: normalizedManifest.swi_product_version,
        nominalAt: normalizedManifest.swi_nominal_at,
        contentStart: normalizedManifest.swi_content_start,
        contentEnd: normalizedManifest.swi_content_end,
      },
      assetsVerified: Object.keys(ASSET_KEYS).length,
      surfaceStateSemantics: {
        catalogCodebook: CLMS_SSF_CATALOG_URL,
        productUserManual: CLMS_SWI_PUM_URL,
        conflictingValidationReport: CLMS_SSF_CONFLICT_URL,
        policy:
          "Preserve the raw code, treat DN 0 as nominal, keep DN 1-4 quality-limited, and treat DN 255 as unavailable.",
      },
    },
    sourceGrid: {
      crs: CLMS_GRID.crs,
      width: CLMS_GRID.width,
      height: CLMS_GRID.height,
      pixelDegrees: CLMS_GRID.pixelDegrees,
      nativeResolutionM: CLMS_GRID.nativeResolutionM,
      samplingMethod: "nearest-native-pixel",
      uniqueSourcePixels: options.uniqueSourcePixels,
    },
    locations: options.points.map((point, index) => privacySafeLocation(point, options.rawByLocation[index])),
    privacy: {
      coordinatesIncluded: false,
      sourcePixelCoordinatesIncluded: false,
    },
    scoringEnabled: false,
    comparisonLimit:
      "CLMS relative percentages remain an uncalibrated shadow stream and do not replace production soil moisture.",
  };
}

async function main() {
  const unresolvedPaths = parseArguments(process.argv.slice(2));
  const paths = {
    manifestPath: await realpath(unresolvedPaths.manifestPath),
    assetDirectory: await realpath(unresolvedPaths.assetDirectory),
    pointsPath: await realpath(unresolvedPaths.pointsPath),
  };
  assertOutsideRepository(paths.manifestPath, "--manifest");
  assertOutsideRepository(paths.assetDirectory, "--asset-dir");
  assertOutsideRepository(paths.pointsPath, "--points");

  const manifest = JSON.parse(await readFile(paths.manifestPath, "utf8")) as ManifestInput;
  // Validate identities, versions, content windows, official band paths and
  // checksum provenance before opening any local raster.
  normalizeClmsManifest(manifest as ClmsManifestInput);
  const points = normalizePrivateComparisonPoints(JSON.parse(await readFile(paths.pointsPath, "utf8")));
  const pixelPoints = points.map(pixelFor);

  const assetEntries = await Promise.all(Object.entries(ASSET_KEYS).map(async ([rawKey, [productKey, assetKey]]) => {
    const product = manifest[productKey];
    const asset = product?.assets?.[assetKey];
    if (!asset) throw new Error(`Manifest is missing the ${rawKey} asset`);
    const image = await openVerifiedAsset(paths.assetDirectory, asset, rawKey);
    return [rawKey as AssetKey, image] as const;
  }));
  const images = Object.fromEntries(assetEntries) as Record<AssetKey, GeoTIFFImage>;
  const referenceGrid = validateReferenceGrid(images.ssmDn);
  for (const [key, image] of assetEntries) validateAlignedGrid(image, referenceGrid, key);

  const minColumn = Math.min(...pixelPoints.map((point) => point.column));
  const maxColumn = Math.max(...pixelPoints.map((point) => point.column));
  const minRow = Math.min(...pixelPoints.map((point) => point.row));
  const maxRow = Math.max(...pixelPoints.map((point) => point.row));
  const window = [minColumn, minRow, maxColumn + 1, maxRow + 1];
  const windowWidth = maxColumn - minColumn + 1;
  const rasters = Object.fromEntries(await Promise.all(assetEntries.map(async ([key, image]) => [
    key,
    await image.readRasters({ window, samples: [0], interleave: true }),
  ]))) as Record<AssetKey, ArrayLike<number>>;

  const rawByLocation = pixelPoints.map((point) => Object.fromEntries(
    (Object.keys(ASSET_KEYS) as AssetKey[]).map((key) => {
      const index = (point.row - minRow) * windowWidth + (point.column - minColumn);
      const value = Number(rasters[key][index]);
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        throw new Error(`${key} returned an invalid raw DN`);
      }
      return [key, value];
    }),
  ) as RawBands);
  const uniqueSourcePixels = new Set(pixelPoints.map((point) => `${point.row}:${point.column}`)).size;
  const report = buildPrivacySafeClmsReport({ manifest, points: pixelPoints, rawByLocation, uniqueSourcePixels });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
