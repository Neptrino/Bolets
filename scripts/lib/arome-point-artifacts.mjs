import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fromArrayBuffer } from "geotiff";

import {
  AROME_DIRECT_NATIVE_RESOLUTION_DEGREES,
  AROME_DIRECT_PROVENANCE,
  buildAromeGetCoverageRequest,
  parseAromeCapabilities,
  parseAromeCoverageDescription,
} from "../../supabase/functions/_shared/arome-direct.ts";

export const AROME_POINT_ARTIFACT_SCHEMA = "arome-point-artifacts-v1";
export const AROME_POINT_COMPARISON_SCHEMA = "arome-point-comparison-v1";

const VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "wind_speed_10m",
];
const VARIABLE_SET = new Set(VARIABLES);
const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_POINTS_BYTES = 64 * 1024;
const MAX_XML_BYTES = 8 * 1024 * 1024;
const MAX_TIFF_BYTES = 32 * 1024 * 1024;
const MAX_POINTS = 20;
const GRID_TOLERANCE = 1e-9;

const TOP_LEVEL_KEYS = new Set([
  "schema",
  "runAt",
  "validAt",
  "capabilities",
  "coverages",
]);
const FILE_KEYS = new Set(["file", "sha256"]);
const COVERAGE_KEYS = new Set(["description", "geotiff"]);
const TIFF_KEYS = new Set(["file", "sha256", "contentType", "request"]);
const REQUEST_KEYS = new Set([
  "variable",
  "coverageId",
  "runAt",
  "validAt",
  "leadSeconds",
  "level",
  "valueUnit",
  "transport",
]);
const LEVEL_KEYS = new Set(["axis", "value", "unit"]);
const TRANSPORT_KEYS = new Set([
  "format",
  "valueUnit",
  "scaleToDeclaredUnit",
  "offsetToDeclaredUnit",
]);
const POINT_KEYS = new Set(["label", "latitude", "longitude"]);

const VALUE_RANGES = Object.freeze({
  temperature_2m: { minimum: 180, maximum: 340 },
  relative_humidity_2m: { minimum: 0, maximum: 100 },
  wind_speed_10m: { minimum: 0, maximum: 100 },
});
const TIFF_FIELD_METADATA = Object.freeze({
  temperature_2m: { element: "TMP", shortName: "2-HTGL", unit: "[C]" },
  relative_humidity_2m: { element: "RH", shortName: "2-HTGL", unit: "[%]" },
  wind_speed_10m: { element: "WIND", shortName: "10-HTGL", unit: "[m/s]" },
});
const AROME_GRIB_SPHERE_RADIUS_METRES = 6_371_229;

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, allowed, label) {
  const unsupported = Object.keys(value).filter((key) => !allowed.has(key));
  if (unsupported.length) throw new TypeError(`${label} contains unsupported fields`);
}

function exactObjectKeys(value, expected, label) {
  exactKeys(value, new Set(expected), label);
  if (expected.some((key) => !(key in value))) {
    throw new TypeError(`${label} is missing required fields`);
  }
}

function text(value, label, maximumLength = 512) {
  if (typeof value !== "string" || !value || value.length > maximumLength || /[\r\n\0]/.test(value)) {
    throw new TypeError(`${label} is invalid`);
  }
  return value;
}

function sha256(value, label) {
  const normalized = text(value, label, 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new TypeError(`${label} must be a SHA-256 digest`);
  return normalized;
}

function canonicalInstant(value, label) {
  if (typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    throw new TypeError(`${label} must be an ISO 8601 UTC instant`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${label} must be an ISO 8601 UTC instant`);
  return new Date(milliseconds).toISOString();
}

function finiteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number`);
  }
  return value;
}

function equalNumber(left, right, tolerance = GRID_TOLERANCE) {
  return Math.abs(left - right) <= tolerance;
}

function sameNumbers(left, right, tolerance = GRID_TOLERANCE) {
  return left.length === right.length && left.every((value, index) =>
    equalNumber(value, right[index], tolerance)
  );
}

async function externalRegularFile(inputPath, repositoryRoot, label) {
  if (typeof inputPath !== "string" || !isAbsolute(inputPath)) {
    throw new TypeError(`${label} must be an absolute path outside the repository`);
  }
  let actualPath;
  let rootPath;
  try {
    [actualPath, rootPath] = await Promise.all([realpath(inputPath), realpath(repositoryRoot)]);
  } catch {
    throw new Error(`${label} could not be resolved`);
  }
  const repositoryRelative = relative(rootPath, actualPath);
  if (repositoryRelative === "" || (!repositoryRelative.startsWith("..") && !isAbsolute(repositoryRelative))) {
    throw new Error(`${label} must stay outside the repository`);
  }
  let details;
  try {
    details = await stat(actualPath);
  } catch {
    throw new Error(`${label} could not be inspected`);
  }
  if (!details.isFile()) throw new Error(`${label} must be a regular file`);
  return { path: actualPath, size: details.size };
}

async function boundedRead(path, maximumBytes, label) {
  let details;
  try {
    details = await stat(path);
  } catch {
    throw new Error(`${label} could not be inspected`);
  }
  if (!details.isFile() || details.size < 1 || details.size > maximumBytes) {
    throw new Error(`${label} is empty or exceeds its size limit`);
  }
  try {
    return await readFile(path);
  } catch {
    throw new Error(`${label} could not be read`);
  }
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`${label} must be valid UTF-8 JSON`);
  }
}

function artifactReference(value, label) {
  const input = object(value, label);
  exactObjectKeys(input, [...FILE_KEYS], label);
  const file = text(input.file, `${label} file`, 512);
  if (isAbsolute(file) || file.split(/[\\/]/).some((part) => !part || part === "." || part === "..")) {
    throw new TypeError(`${label} file must be a safe relative path beside the external manifest`);
  }
  return { file, sha256: sha256(input.sha256, `${label} sha256`) };
}

function requestMetadata(value, variable) {
  const label = `${variable} request metadata`;
  const input = object(value, label);
  exactObjectKeys(input, [...REQUEST_KEYS], label);
  const level = object(input.level, `${label} level`);
  exactObjectKeys(level, [...LEVEL_KEYS], `${label} level`);
  const transport = object(input.transport, `${label} transport`);
  exactObjectKeys(transport, [...TRANSPORT_KEYS], `${label} transport`);
  if (input.variable !== variable || !VARIABLE_SET.has(input.variable)) {
    throw new TypeError(`${label} variable is invalid`);
  }
  return {
    variable,
    coverageId: text(input.coverageId, `${label} coverageId`, 256),
    runAt: canonicalInstant(input.runAt, `${label} runAt`),
    validAt: canonicalInstant(input.validAt, `${label} validAt`),
    leadSeconds: finiteNumber(input.leadSeconds, `${label} leadSeconds`),
    level: {
      axis: text(level.axis, `${label} level axis`, 32),
      value: finiteNumber(level.value, `${label} level value`),
      unit: text(level.unit, `${label} level unit`, 32),
    },
    valueUnit: text(input.valueUnit, `${label} valueUnit`, 32),
    transport: {
      format: text(transport.format, `${label} transport format`, 64),
      valueUnit: text(transport.valueUnit, `${label} transport valueUnit`, 32),
      scaleToDeclaredUnit: finiteNumber(
        transport.scaleToDeclaredUnit,
        `${label} transport scale`,
      ),
      offsetToDeclaredUnit: finiteNumber(
        transport.offsetToDeclaredUnit,
        `${label} transport offset`,
      ),
    },
  };
}

function coverageArtifacts(value, variable) {
  const label = `${variable} artifacts`;
  const input = object(value, label);
  exactObjectKeys(input, [...COVERAGE_KEYS], label);
  const description = artifactReference(input.description, `${variable} description`);
  const tiff = object(input.geotiff, `${variable} GeoTIFF`);
  exactObjectKeys(tiff, [...TIFF_KEYS], `${variable} GeoTIFF`);
  const base = artifactReference({ file: tiff.file, sha256: tiff.sha256 }, `${variable} GeoTIFF`);
  if (tiff.contentType !== "image/tiff") {
    throw new TypeError(`${variable} GeoTIFF content type must be image/tiff`);
  }
  return {
    description,
    geotiff: {
      ...base,
      contentType: "image/tiff",
      request: requestMetadata(tiff.request, variable),
    },
  };
}

export function parseAromePointArtifactManifest(value) {
  const input = object(value, "AROME artifact manifest");
  exactObjectKeys(input, [...TOP_LEVEL_KEYS], "AROME artifact manifest");
  if (input.schema !== AROME_POINT_ARTIFACT_SCHEMA) {
    throw new TypeError("AROME artifact manifest schema is unsupported");
  }
  const capabilities = artifactReference(input.capabilities, "AROME capabilities");
  const coverages = object(input.coverages, "AROME coverage artifacts");
  exactObjectKeys(coverages, VARIABLES, "AROME coverage artifacts");
  return {
    schema: AROME_POINT_ARTIFACT_SCHEMA,
    runAt: canonicalInstant(input.runAt, "AROME manifest runAt"),
    validAt: canonicalInstant(input.validAt, "AROME manifest validAt"),
    capabilities,
    coverages: Object.fromEntries(VARIABLES.map((variable) => [
      variable,
      coverageArtifacts(coverages[variable], variable),
    ])),
  };
}

export function parsePrivateAromePoints(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_POINTS) {
    throw new TypeError(`Private points must contain between 1 and ${MAX_POINTS} locations`);
  }
  return value.map((entry, index) => {
    const label = `Location ${index + 1}`;
    const point = object(entry, label);
    exactKeys(point, POINT_KEYS, label);
    if (!("latitude" in point) || !("longitude" in point)) {
      throw new TypeError(`${label} is missing required fields`);
    }
    if (point.label !== undefined) text(point.label, `${label} private source label`, 160);
    const latitude = finiteNumber(point.latitude, `${label} latitude`);
    const longitude = finiteNumber(point.longitude, `${label} longitude`);
    if (latitude < 40.5 || latitude > 42.9 || longitude < 0.1 || longitude > 3.35) {
      throw new RangeError(`${label} must remain inside the fixed Catalonia diagnostic scope`);
    }
    return { label, latitude, longitude };
  });
}

async function resolveArtifact(manifestPath, reference, repositoryRoot, maximumBytes, label) {
  const requestedPath = resolve(dirname(manifestPath), reference.file);
  const external = await externalRegularFile(requestedPath, repositoryRoot, label);
  if (external.size < 1 || external.size > maximumBytes) {
    throw new Error(`${label} is empty or exceeds its size limit`);
  }
  const bytes = await boundedRead(external.path, maximumBytes, label);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== reference.sha256) throw new Error(`${label} failed SHA-256 verification`);
  return { path: external.path, bytes };
}

function validateRequestMetadata(actual, expected, variable) {
  if (actual.variable !== expected.variable || actual.variable !== variable ||
    actual.coverageId !== expected.coverageId || actual.runAt !== expected.runAt ||
    actual.validAt !== expected.validAt || actual.leadSeconds !== expected.leadSeconds ||
    actual.level.axis !== expected.level.axis || actual.level.value !== expected.level.value ||
    actual.level.unit !== expected.level.unit || actual.valueUnit !== expected.valueUnit ||
    actual.transport.format !== expected.transport.format ||
    actual.transport.valueUnit !== expected.transport.valueUnit ||
    actual.transport.scaleToDeclaredUnit !== expected.transport.scaleToDeclaredUnit ||
    actual.transport.offsetToDeclaredUnit !== expected.transport.offsetToDeclaredUnit) {
    throw new Error(`${variable} saved request metadata does not match the validated WCS contract`);
  }
}

function scalarTag(value) {
  if (Array.isArray(value) || ArrayBuffer.isView(value)) return Number(value[0]);
  return Number(value);
}

function metadataNumber(metadata, name, fallback) {
  const entries = Object.entries(metadata ?? {}).filter(([key]) => key.toUpperCase() === name);
  if (!entries.length) return fallback;
  const parsed = entries.map(([, value]) => Number(value));
  if (parsed.some((value) => !Number.isFinite(value)) ||
    parsed.some((value) => !equalNumber(value, parsed[0], 1e-12))) {
    throw new Error(`AROME GeoTIFF ${name.toLowerCase()} metadata is invalid`);
  }
  return parsed[0];
}

async function openValidatedTiff(bytes, variable) {
  let tiff;
  let image;
  try {
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    tiff = await fromArrayBuffer(arrayBuffer);
    if (await tiff.getImageCount() !== 1) throw new Error("must contain exactly one image");
    image = await tiff.getImage();
  } catch {
    throw new Error(`${variable} GeoTIFF could not be decoded as one image`);
  }
  if (image.getSamplesPerPixel() !== 1) {
    throw new Error(`${variable} GeoTIFF must contain exactly one sample per pixel`);
  }
  const directory = image.getFileDirectory();
  const orientation = directory.Orientation === undefined ? 1 : scalarTag(directory.Orientation);
  if (orientation !== 1 || directory.ModelTransformation !== undefined) {
    throw new Error(`${variable} GeoTIFF must use an unrotated north-up transform`);
  }
  const geoKeys = image.getGeoKeys();
  if (geoKeys?.GTModelTypeGeoKey !== 2 || geoKeys?.GTRasterTypeGeoKey !== 2 ||
    geoKeys?.GeographicTypeGeoKey !== 32767 || geoKeys?.ProjectedCSTypeGeoKey !== undefined ||
    geoKeys?.GeogAngularUnitsGeoKey !== 9102 ||
    !equalNumber(Number(geoKeys?.GeogSemiMajorAxisGeoKey), AROME_GRIB_SPHERE_RADIUS_METRES) ||
    (geoKeys?.GeogSemiMinorAxisGeoKey !== undefined &&
      !equalNumber(Number(geoKeys.GeogSemiMinorAxisGeoKey), AROME_GRIB_SPHERE_RADIUS_METRES)) ||
    (geoKeys?.GeogPrimeMeridianLongGeoKey !== undefined &&
      !equalNumber(Number(geoKeys.GeogPrimeMeridianLongGeoKey), 0)) ||
    typeof geoKeys?.GeogCitationGeoKey !== "string" ||
    !geoKeys.GeogCitationGeoKey.includes("Ellipsoid = Sphere")) {
    throw new Error(`${variable} GeoTIFF must use the live AROME pixel-point GRIB sphere`);
  }
  let origin;
  let resolution;
  let bounds;
  let tiePoints;
  try {
    origin = image.getOrigin();
    resolution = image.getResolution();
    bounds = image.getBoundingBox();
    tiePoints = await image.getTiePoints();
  } catch {
    throw new Error(`${variable} GeoTIFF has no usable affine grid`);
  }
  if (tiePoints.length !== 1 || !equalNumber(tiePoints[0].i, 0) || !equalNumber(tiePoints[0].j, 0) ||
    !equalNumber(resolution[0], AROME_DIRECT_NATIVE_RESOLUTION_DEGREES) ||
    !equalNumber(resolution[1], -AROME_DIRECT_NATIVE_RESOLUTION_DEGREES) ||
    image.getWidth() < 2 || image.getHeight() < 2 ||
    !bounds.every(Number.isFinite) || !origin.every(Number.isFinite)) {
    throw new Error(`${variable} GeoTIFF is not on the required 0.01-degree north-up point grid`);
  }
  let datasetMetadata;
  let sampleMetadata;
  try {
    // GeoTIFF.js lazily loads the same ASCII tag for both calls. Keep these
    // sequential so concurrent tag reads cannot race on one image directory.
    datasetMetadata = await image.getGDALMetadata();
    sampleMetadata = await image.getGDALMetadata(0);
  } catch {
    throw new Error(`${variable} GeoTIFF has invalid GDAL metadata`);
  }
  const mergedMetadata = { ...(datasetMetadata ?? {}), ...(sampleMetadata ?? {}) };
  const scale = metadataNumber(mergedMetadata, "SCALE", 1);
  const offset = metadataNumber(mergedMetadata, "OFFSET", 0);
  const noData = image.getGDALNoData();
  if (noData !== null && !Number.isFinite(noData)) {
    throw new Error(`${variable} GeoTIFF has invalid no-data metadata`);
  }
  return {
    image,
    origin: origin.slice(0, 2),
    resolution: resolution.slice(0, 2),
    bounds: [
      Math.min(origin[0], origin[0] + resolution[0] * (image.getWidth() - 1)),
      Math.min(origin[1], origin[1] + resolution[1] * (image.getHeight() - 1)),
      Math.max(origin[0], origin[0] + resolution[0] * (image.getWidth() - 1)),
      Math.max(origin[1], origin[1] + resolution[1] * (image.getHeight() - 1)),
    ],
    width: image.getWidth(),
    height: image.getHeight(),
    noData,
    scale,
    offset,
    fieldMetadata: mergedMetadata,
  };
}

function requiredTiffMetadata(metadata, key, variable) {
  const value = metadata?.[key];
  if (typeof value !== "string" || !value || value.length > 2_000 || /[\r\n\0]/.test(value)) {
    throw new Error(`${variable} GeoTIFF is missing required ${key} metadata`);
  }
  return value;
}

function validateTiffFieldMetadata(grid, request, variable) {
  const expected = TIFF_FIELD_METADATA[variable];
  const metadata = grid.fieldMetadata;
  const referenceSeconds = String(Date.parse(request.runAt) / 1000);
  const validSeconds = String(Date.parse(request.validAt) / 1000);
  if (request.transport.format !== "image/tiff" ||
    requiredTiffMetadata(metadata, "GRIB_ELEMENT", variable) !== expected.element ||
    requiredTiffMetadata(metadata, "GRIB_SHORT_NAME", variable) !== expected.shortName ||
    requiredTiffMetadata(metadata, "GRIB_UNIT", variable) !== expected.unit ||
    requiredTiffMetadata(metadata, "GRIB_REF_TIME", variable) !== referenceSeconds ||
    requiredTiffMetadata(metadata, "GRIB_VALID_TIME", variable) !== validSeconds ||
    requiredTiffMetadata(metadata, "GRIB_FORECAST_SECONDS", variable) !== String(request.leadSeconds) ||
    request.transport.valueUnit !== expected.unit.slice(1, -1) ||
    !requiredTiffMetadata(metadata, "DESCRIPTION", variable).startsWith(`${request.level.value}[m]`)) {
    throw new Error(`${variable} GeoTIFF field, level, unit, run, or valid-time metadata has drifted`);
  }
}

function validateAlignedGrid(reference, candidate, variable) {
  if (reference.width !== candidate.width || reference.height !== candidate.height ||
    !sameNumbers(reference.origin, candidate.origin) ||
    !sameNumbers(reference.resolution, candidate.resolution) ||
    !sameNumbers(reference.bounds, candidate.bounds)) {
    throw new Error(`${variable} GeoTIFF is not aligned with the common AROME point grid`);
  }
}

function pixelForPoint(grid, point) {
  const fractionalColumn = (point.longitude - grid.origin[0]) / grid.resolution[0];
  const fractionalRow = (point.latitude - grid.origin[1]) / grid.resolution[1];
  const column = Math.round(fractionalColumn);
  const row = Math.round(fractionalRow);
  if (fractionalColumn < -0.5 - GRID_TOLERANCE ||
    fractionalColumn > grid.width - 0.5 + GRID_TOLERANCE ||
    fractionalRow < -0.5 - GRID_TOLERANCE ||
    fractionalRow > grid.height - 0.5 + GRID_TOLERANCE ||
    column < 0 || column >= grid.width || row < 0 || row >= grid.height) {
    throw new Error(`${point.label} lies outside the saved AROME GeoTIFF coverage`);
  }
  return { ...point, column, row };
}

async function sampledValues(grid, pixelPoints, variable) {
  const minColumn = Math.min(...pixelPoints.map((point) => point.column));
  const maxColumn = Math.max(...pixelPoints.map((point) => point.column));
  const minRow = Math.min(...pixelPoints.map((point) => point.row));
  const maxRow = Math.max(...pixelPoints.map((point) => point.row));
  let raster;
  try {
    raster = await grid.image.readRasters({
      window: [minColumn, minRow, maxColumn + 1, maxRow + 1],
      samples: [0],
      interleave: true,
    });
  } catch {
    throw new Error(`${variable} GeoTIFF point window could not be decoded`);
  }
  const windowWidth = maxColumn - minColumn + 1;
  return pixelPoints.map((point) => {
    const index = (point.row - minRow) * windowWidth + (point.column - minColumn);
    const raw = Number(raster[index]);
    if (!Number.isFinite(raw) || (grid.noData !== null && equalNumber(raw, grid.noData, 1e-12))) {
      throw new Error(`${variable} has no valid value for ${point.label}`);
    }
    const transportedValue = raw * grid.scale + grid.offset;
    const value = transportedValue * grid.transport.scaleToDeclaredUnit +
      grid.transport.offsetToDeclaredUnit;
    const range = VALUE_RANGES[variable];
    if (!Number.isFinite(value) || value < range.minimum || value > range.maximum) {
      throw new Error(`${variable} returned an implausible value for ${point.label}`);
    }
    return value;
  });
}

function rounded(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function publicLocationResult(label, values) {
  return {
    location: label,
    temperature2m: {
      value: rounded(values.temperature_2m - 273.15),
      unit: "°C",
    },
    relativeHumidity2m: {
      value: rounded(values.relative_humidity_2m),
      unit: "%",
    },
    windSpeed10m: {
      value: rounded(values.wind_speed_10m),
      unit: "m/s",
    },
  };
}

function differencesFromFirst(location, first) {
  return {
    location: location.location,
    temperature2mDifference: {
      value: rounded(location.temperature2m.value - first.temperature2m.value),
      unit: "°C",
    },
    relativeHumidity2mDifference: {
      value: rounded(location.relativeHumidity2m.value - first.relativeHumidity2m.value),
      unit: "percentage points",
    },
    windSpeed10mDifference: {
      value: rounded(location.windSpeed10m.value - first.windSpeed10m.value),
      unit: "m/s",
    },
  };
}

export async function compareAromePointArtifacts({
  manifestPath,
  pointsPath,
  repositoryRoot = process.cwd(),
}) {
  const [externalManifest, externalPoints] = await Promise.all([
    externalRegularFile(manifestPath, repositoryRoot, "--manifest"),
    externalRegularFile(pointsPath, repositoryRoot, "--points-file"),
  ]);
  if (externalManifest.size > MAX_MANIFEST_BYTES || externalPoints.size > MAX_POINTS_BYTES) {
    throw new Error("Private comparison input exceeds its size limit");
  }
  const [manifestBytes, pointBytes] = await Promise.all([
    boundedRead(externalManifest.path, MAX_MANIFEST_BYTES, "AROME artifact manifest"),
    boundedRead(externalPoints.path, MAX_POINTS_BYTES, "private points file"),
  ]);
  const manifest = parseAromePointArtifactManifest(parseJson(manifestBytes, "AROME artifact manifest"));
  const points = parsePrivateAromePoints(parseJson(pointBytes, "private points file"));

  const resolvedPaths = new Set();
  const capabilitiesArtifact = await resolveArtifact(
    externalManifest.path,
    manifest.capabilities,
    repositoryRoot,
    MAX_XML_BYTES,
    "AROME capabilities artifact",
  );
  resolvedPaths.add(capabilitiesArtifact.path);
  const capabilitiesXml = new TextDecoder("utf-8", { fatal: true }).decode(capabilitiesArtifact.bytes);
  const selection = parseAromeCapabilities(capabilitiesXml, manifest.runAt);
  if (selection.runAt !== manifest.runAt) throw new Error("AROME manifest run does not match GetCapabilities");

  const valuesByVariable = {};
  let referenceGrid;
  let pixelPoints;
  for (const variable of VARIABLES) {
    const artifacts = manifest.coverages[variable];
    const [descriptionArtifact, tiffArtifact] = await Promise.all([
      resolveArtifact(
        externalManifest.path,
        artifacts.description,
        repositoryRoot,
        MAX_XML_BYTES,
        `${variable} description artifact`,
      ),
      resolveArtifact(
        externalManifest.path,
        artifacts.geotiff,
        repositoryRoot,
        MAX_TIFF_BYTES,
        `${variable} GeoTIFF artifact`,
      ),
    ]);
    for (const artifact of [descriptionArtifact, tiffArtifact]) {
      if (resolvedPaths.has(artifact.path)) throw new Error("AROME manifest reuses an artifact file");
      resolvedPaths.add(artifact.path);
    }
    let descriptionXml;
    try {
      descriptionXml = new TextDecoder("utf-8", { fatal: true }).decode(descriptionArtifact.bytes);
    } catch {
      throw new Error(`${variable} description artifact is not UTF-8 XML`);
    }
    const description = parseAromeCoverageDescription(
      descriptionXml,
      selection.coverages[variable],
    );
    const grid = await openValidatedTiff(tiffArtifact.bytes, variable);
    const request = buildAromeGetCoverageRequest(description, {
      validAt: manifest.validAt,
      bounds: {
        minLatitude: grid.bounds[1],
        maxLatitude: grid.bounds[3],
        minLongitude: grid.bounds[0],
        maxLongitude: grid.bounds[2],
      },
      format: "image/tiff",
    });
    validateRequestMetadata(artifacts.geotiff.request, request.metadata, variable);
    validateTiffFieldMetadata(grid, request.metadata, variable);
    grid.transport = request.metadata.transport;
    if (!referenceGrid) {
      referenceGrid = grid;
      pixelPoints = points.map((point) => pixelForPoint(grid, point));
    } else {
      validateAlignedGrid(referenceGrid, grid, variable);
    }
    valuesByVariable[variable] = await sampledValues(grid, pixelPoints, variable);
  }

  const locations = points.map((point, index) => publicLocationResult(point.label, {
    temperature_2m: valuesByVariable.temperature_2m[index],
    relative_humidity_2m: valuesByVariable.relative_humidity_2m[index],
    wind_speed_10m: valuesByVariable.wind_speed_10m[index],
  }));
  const first = locations[0];
  return {
    schema: AROME_POINT_COMPARISON_SCHEMA,
    status: "offline-shadow-diagnostic",
    provider: AROME_DIRECT_PROVENANCE.provider,
    model: AROME_DIRECT_PROVENANCE.model,
    datasetId: AROME_DIRECT_PROVENANCE.datasetId,
    runAt: manifest.runAt,
    validAt: manifest.validAt,
    leadHours: (Date.parse(manifest.validAt) - Date.parse(manifest.runAt)) / 3_600_000,
    nativeGrid: {
      angularResolutionDegrees: AROME_DIRECT_NATIVE_RESOLUTION_DEGREES,
      coordinateReferenceSystem: "Météo-France GRIB geographic sphere",
      sphereRadiusMetres: AROME_GRIB_SPHERE_RADIUS_METRES,
      rasterInterpretation: "pixel-is-point",
    },
    transportContracts: {
      temperature2m: {
        describedUnit: "K",
        tiffUnit: "C",
        offsetToDescribedUnit: 273.15,
      },
      relativeHumidity2m: { describedUnit: "%", tiffUnit: "%" },
      windSpeed10m: { describedUnit: "m s-1", tiffUnit: "m/s" },
    },
    limitations: [
      "Saved operational AROME forecast evidence, not an observation.",
      "Point samples do not replace the production multi-day weather history or prediction score.",
    ],
    locations,
    differencesFromLocation1: locations.slice(1).map((location) =>
      differencesFromFirst(location, first)
    ),
  };
}

export function sanitizeAromePointDiagnosticError(error) {
  const message = error instanceof Error ? error.message : "Unknown comparison failure";
  return message
    .replace(/(?:[A-Za-z]:)?(?:\/[\w.@%+,:=-]+)+/g, "[private-path]")
    .replace(/\b-?\d{1,3}\.\d{4,}\b/g, "[private-number]")
    .replace(/\b(Bearer|token|api[_-]?key|client[_-]?secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 300);
}
