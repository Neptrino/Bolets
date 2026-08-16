const CDSE_STAC_ROOT = "https://stac.dataspace.copernicus.eu/v1";
const CDSE_DOWNLOAD_ORIGIN = "https://download.dataspace.copernicus.eu";
// CDSE serves the product archive from an S3-compatible endpoint using
// path-style addressing, and its download service rejects OAuth
// client-credentials tokens ("token audience not allowed"), so rasters are
// fetched as signed S3 objects instead.
export const CDSE_S3_HOST = "eodata.dataspace.copernicus.eu";
export const CDSE_S3_BUCKET = "eodata";
export const CDSE_S3_REGION = "default";
export const CDSE_TOKEN_ENDPOINT =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

export const CLMS_GRID = Object.freeze({
  crs: "EPSG:4326",
  width: 6832,
  height: 4144,
  west: -11,
  south: 35,
  east: 50,
  north: 72,
  pixelDegrees: 1 / 112,
  nativeResolutionM: 1000,
});

export const CLMS_COLLECTIONS = Object.freeze({
  ssm: "clms_ssm_europe_1km_daily_v1_cog",
  swi: "clms_swi_europe_1km_daily_v2_cog",
});

const SSF_CODEBOOK = Object.freeze([
  { name: "nominal", value: 0, description: "Unfrozen soil, nominal conditions" },
  { name: "frozen", value: 1, description: "Frozen soil" },
  { name: "thawing", value: 2, description: "Thawing soil" },
  { name: "frozen_snow", value: 3, description: "Frozen soil with snow cover" },
  { name: "wet_snow", value: 4, description: "Wet snow" },
]);

const EMBEDDED_FLAG_CODES = Object.freeze([
  { name: "exceeding_min", value: 241 },
  { name: "exceeding_max", value: 242 },
  { name: "water_mask", value: 251 },
  { name: "sensitivity_mask", value: 252 },
  { name: "slope_mask", value: 253 },
  { name: "low_qflag", value: 254 },
]);

const PRODUCT_SPECS = Object.freeze({
  ssm: {
    collection: CLMS_COLLECTIONS.ssm,
    pattern: /^c_gls_SSM1km_(\d{12})_CEURO_S1CSAR_(V\d+\.\d+\.\d+)_cog$/,
    family: "SSM",
    sensor: "S1CSAR",
    productRoot: "surface_soil_moisture/ssm_europe_1km_daily_v1",
    assetSpecs: [
      { manifestKey: "ssm", stacKey: "ssm1km_ssm", band: "SSM", scale: 0.5 },
      { manifestKey: "noise", stacKey: "ssm1km_noise", band: "NOISE", scale: 0.5 },
    ],
  },
  swi: {
    collection: CLMS_COLLECTIONS.swi,
    pattern: /^c_gls_SWI1km_(\d{12})_CEURO_SCATSAR_(V\d+\.\d+\.\d+)_cog$/,
    family: "SWI",
    sensor: "SCATSAR",
    productRoot: "soil_water_index/swi_europe_1km_daily_v2",
    assetSpecs: [
      { manifestKey: "swi002", stacKey: "swi1km_swi002", band: "SWI002", scale: 0.5 },
      { manifestKey: "qflag002", stacKey: "swi1km_qflag002", band: "QFLAG002", scale: 0.5 },
      { manifestKey: "swi005", stacKey: "swi1km_swi005", band: "SWI005", scale: 0.5 },
      { manifestKey: "qflag005", stacKey: "swi1km_qflag005", band: "QFLAG005", scale: 0.5 },
      { manifestKey: "swi010", stacKey: "swi1km_swi010", band: "SWI010", scale: 0.5 },
      { manifestKey: "qflag010", stacKey: "swi1km_qflag010", band: "QFLAG010", scale: 0.5 },
      // SSF is categorical. CDSE collection metadata currently carries a generic
      // raster scale on this asset, but the product-specific bitfield codebook and
      // CLMS PUM define unscaled integer values 0..4. Never apply 0.5 to SSF.
      { manifestKey: "ssf", stacKey: "swi1km_ssf", band: "SSF", scale: 1, categorical: true },
    ],
  },
});

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function array(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function string(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a string`);
  return value;
}

function isoTimestamp(value, label) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be an ISO timestamp`);
  return new Date(parsed).toISOString();
}

function isoDate(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be an ISO date`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be an ISO date`);
  }
  return value;
}

function addDays(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function approximately(actual, expected, tolerance = 1e-8) {
  return typeof actual === "number" && Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

function versionParts(version, label) {
  const match = /^V(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`${label} has an invalid processing version`);
  return match.slice(1).map(Number);
}

function supportedVersion(kind, version) {
  const [major, minor, patch] = versionParts(version, `CLMS ${kind.toUpperCase()}`);
  return kind === "ssm"
    ? major === 1 && minor === 2 && patch >= 1
    : major === 2 && minor === 1 && patch >= 1;
}

function nominalTimestamp(token, label) {
  const year = Number(token.slice(0, 4));
  const month = Number(token.slice(4, 6));
  const day = Number(token.slice(6, 8));
  const hour = Number(token.slice(8, 10));
  const minute = Number(token.slice(10, 12));
  const result = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    result.getUTCFullYear() !== year || result.getUTCMonth() !== month - 1 ||
    result.getUTCDate() !== day || result.getUTCHours() !== hour || result.getUTCMinutes() !== minute
  ) {
    throw new Error(`${label} contains an invalid nominal timestamp`);
  }
  return result.toISOString();
}

function parseIdentity(item, kind) {
  const spec = PRODUCT_SPECS[kind];
  const record = object(item, `CLMS ${kind.toUpperCase()} STAC item`);
  const id = string(record.id, `CLMS ${kind.toUpperCase()} item id`);
  const match = spec.pattern.exec(id);
  if (!match) throw new Error(`CLMS ${kind.toUpperCase()} item id is invalid`);
  const version = match[2];
  if (!supportedVersion(kind, version)) {
    throw new Error(`CLMS ${kind.toUpperCase()} item uses an unreviewed processing version`);
  }
  const nominalAt = nominalTimestamp(match[1], `CLMS ${kind.toUpperCase()} item id`);
  const snapshotDate = nominalAt.slice(0, 10);
  if (snapshotDate < "2025-07-14" && kind === "swi") {
    throw new Error("Spatial-shift-corrected CLMS SWI V2.1.1 is unavailable before 2025-07-14");
  }
  if (nominalAt.slice(11, 16) !== (kind === "ssm" ? "00:00" : "12:00")) {
    throw new Error(`CLMS ${kind.toUpperCase()} item has an invalid nominal hour`);
  }
  return { id, version, nominalAt, snapshotDate, token: match[1] };
}

function validateGridMetadata(record, label, itemProperties = {}) {
  // CDSE moved proj:code onto the asset partway through the archive; older
  // items still declare it on the item. Either location is accepted, but the
  // CRS itself is still required to match.
  const declaredCrs = record["proj:code"] ?? itemProperties["proj:code"];
  if (declaredCrs !== CLMS_GRID.crs || record.data_type !== "uint8" || record.nodata !== 255) {
    throw new Error(`${label} does not preserve the documented UINT8 EPSG:4326 grid`);
  }
  const shape = array(record["proj:shape"], `${label} proj:shape`);
  if (shape.length !== 2 || shape[0] !== CLMS_GRID.height || shape[1] !== CLMS_GRID.width) {
    throw new Error(`${label} does not match the documented 6832 by 4144 CLMS grid`);
  }
  const transform = array(record["proj:transform"], `${label} proj:transform`);
  const expectedBbox = [CLMS_GRID.west, CLMS_GRID.south, CLMS_GRID.east, CLMS_GRID.north];
  // Older archive items omit proj:bbox. The affine transform and raster shape
  // determine the same bounds exactly, so derive rather than skip the check.
  const bbox = record["proj:bbox"] === undefined
    ? [
        transform[2],
        transform[5] + transform[4] * shape[0],
        transform[2] + transform[0] * shape[1],
        transform[5],
      ]
    : array(record["proj:bbox"], `${label} proj:bbox`);
  if (bbox.length !== 4 || bbox.some((value, index) => !approximately(value, expectedBbox[index], 1e-6))) {
    throw new Error(`${label} does not match the documented CLMS CEURO bounds`);
  }
  const expectedTransform = [CLMS_GRID.pixelDegrees, 0, CLMS_GRID.west, 0, -CLMS_GRID.pixelDegrees, CLMS_GRID.north];
  if (transform.length !== 6 || transform.some((value, index) => !approximately(value, expectedTransform[index], 1e-10))) {
    throw new Error(`${label} is not aligned to the documented north-up 1/112-degree grid`);
  }
}

function checksumProvenance(value, label) {
  const checksum = string(value, `${label} checksum`).toLowerCase();
  const md5Multihash = /^d50110([0-9a-f]{32})$/.exec(checksum);
  if (md5Multihash) return { checksum, algorithm: "md5", digest: md5Multihash[1] };
  if (/^[0-9a-f]{64}$/.test(checksum)) return { checksum, algorithm: "sha256", digest: checksum };
  throw new Error(`${label} must provide a CDSE MD5 multihash or SHA-256 checksum`);
}

function validateDownloadUrl(value, productId, filename, label) {
  const url = new URL(string(value, `${label} HTTPS download URL`));
  if (url.origin !== CDSE_DOWNLOAD_ORIGIN || url.search || url.hash) {
    throw new Error(`${label} does not use the official authenticated CDSE download origin`);
  }
  const expectedSuffix = `/Nodes(${productId})/Nodes(${filename})/$value`;
  if (!url.pathname.startsWith("/odata/v1/Products(") || !url.pathname.endsWith(expectedSuffix)) {
    throw new Error(`${label} does not identify the expected CDSE product node`);
  }
  return url.toString();
}

/** Turns a validated `s3://eodata/...` href into a path-style request path. */
export function s3ObjectPath(href) {
  const prefix = `s3://${CDSE_S3_BUCKET}/`;
  if (!href.startsWith(prefix)) {
    throw new Error("CLMS asset href does not address the expected CDSE bucket");
  }
  const key = href.slice(prefix.length);
  if (!key || key.includes("..")) throw new Error("CLMS asset object key is invalid");
  return `/${CDSE_S3_BUCKET}/${key}`;
}

function normalizeAsset(item, identity, kind, assetSpec) {
  const assets = object(item.assets, `CLMS ${kind.toUpperCase()} assets`);
  const asset = object(assets[assetSpec.stacKey], `CLMS ${kind.toUpperCase()} ${assetSpec.band} asset`);
  const datePath = `${identity.token.slice(0, 4)}/${identity.token.slice(4, 6)}/${identity.token.slice(6, 8)}`;
  const filename = `c_gls_${PRODUCT_SPECS[kind].family}1km-${assetSpec.band}_${identity.token}_CEURO_` +
    `${PRODUCT_SPECS[kind].sensor}_${identity.version}.tiff`;
  const expectedHref = `s3://eodata/CLMS/bio-geophysical/${PRODUCT_SPECS[kind].productRoot}/${datePath}/` +
    `${identity.id}/${filename}`;
  if (asset.href !== expectedHref) {
    throw new Error(`CLMS ${kind.toUpperCase()} ${assetSpec.band} asset path is inconsistent`);
  }
  if (typeof asset.type !== "string" || !asset.type.startsWith("image/tiff") ||
      !Array.isArray(asset.roles) || !asset.roles.includes("data")) {
    throw new Error(`CLMS ${kind.toUpperCase()} ${assetSpec.band} is not a data COG`);
  }
  validateGridMetadata(
    asset,
    `CLMS ${kind.toUpperCase()} ${assetSpec.band}`,
    object(item.properties, `CLMS ${kind.toUpperCase()} item properties`),
  );
  if (!assetSpec.categorical && asset["raster:scale"] !== assetSpec.scale) {
    throw new Error(`CLMS ${kind.toUpperCase()} ${assetSpec.band} scale metadata changed`);
  }
  const fileSize = Number(asset["file:size"]);
  if (!Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > 200_000_000) {
    throw new Error(`CLMS ${kind.toUpperCase()} ${assetSpec.band} has an invalid file size`);
  }
  const checksum = checksumProvenance(asset["file:checksum"], `CLMS ${kind.toUpperCase()} ${assetSpec.band}`);
  const alternate = object(asset.alternate, `CLMS ${kind.toUpperCase()} ${assetSpec.band} alternate`);
  const https = object(alternate.https, `CLMS ${kind.toUpperCase()} ${assetSpec.band} HTTPS alternate`);
  const downloadUrl = validateDownloadUrl(https.href, identity.id, filename, `CLMS ${kind.toUpperCase()} ${assetSpec.band}`);
  return {
    manifest: {
      href: expectedHref,
      checksum: checksum.checksum,
      checksumAlgorithm: checksum.algorithm === "md5" ? "MD5" : "SHA-256",
    },
    download: {
      key: `${kind}.${assetSpec.manifestKey}`,
      filename,
      url: downloadUrl,
      objectPath: s3ObjectPath(expectedHref),

      expectedBytes: fileSize,
      checksumAlgorithm: checksum.algorithm,
      checksumDigest: checksum.digest,
    },
  };
}

function normalizeProduct(item, kind) {
  const identity = parseIdentity(item, kind);
  if (item.collection !== PRODUCT_SPECS[kind].collection) {
    throw new Error(`CLMS ${kind.toUpperCase()} item belongs to the wrong collection`);
  }
  const properties = object(item.properties, `CLMS ${kind.toUpperCase()} properties`);
  if (properties["processing:version"] !== identity.version || properties["proj:code"] !== CLMS_GRID.crs ||
      properties.gsd !== CLMS_GRID.nativeResolutionM) {
    throw new Error(`CLMS ${kind.toUpperCase()} item metadata does not match its product identity`);
  }
  const itemBbox = array(item.bbox, `CLMS ${kind.toUpperCase()} bbox`);
  const expectedBbox = [CLMS_GRID.west, CLMS_GRID.south, CLMS_GRID.east, CLMS_GRID.north];
  if (itemBbox.length !== 4 || itemBbox.some((value, index) => !approximately(value, expectedBbox[index], 1e-6))) {
    throw new Error(`CLMS ${kind.toUpperCase()} item has unexpected spatial coverage`);
  }
  const nominalMilliseconds = Date.parse(identity.nominalAt);
  const expectedStart = new Date(kind === "ssm" ? nominalMilliseconds : nominalMilliseconds - 86_399_000).toISOString();
  const expectedEnd = new Date(kind === "ssm" ? nominalMilliseconds + 86_399_000 : nominalMilliseconds).toISOString();
  const contentStart = isoTimestamp(properties.start_datetime, `CLMS ${kind.toUpperCase()} start_datetime`);
  const contentEnd = isoTimestamp(properties.end_datetime, `CLMS ${kind.toUpperCase()} end_datetime`);
  const stacDatetime = isoTimestamp(properties.datetime, `CLMS ${kind.toUpperCase()} datetime`);
  if (contentStart !== expectedStart || contentEnd !== expectedEnd || stacDatetime !== expectedStart) {
    throw new Error(`CLMS ${kind.toUpperCase()} content timestamps do not match the daily product schedule`);
  }
  const publishedAt = isoTimestamp(properties.published, `CLMS ${kind.toUpperCase()} published`);
  if (publishedAt < contentEnd) throw new Error(`CLMS ${kind.toUpperCase()} publication predates its content window`);

  const assetEntries = PRODUCT_SPECS[kind].assetSpecs.map((assetSpec) => [
    assetSpec.manifestKey,
    normalizeAsset(item, identity, kind, assetSpec),
  ]);
  return {
    identity,
    manifest: {
      productId: identity.id,
      version: identity.version,
      nominalAt: identity.nominalAt,
      contentStart,
      contentEnd,
      publishedAt,
      assets: Object.fromEntries(assetEntries.map(([key, value]) => [key, value.manifest])),
    },
    downloads: assetEntries.map(([, value]) => value.download),
  };
}

function validateScale(itemAssets, key, expectedScale) {
  const asset = object(itemAssets[key], `CLMS collection asset ${key}`);
  if (asset.data_type !== "uint8" || asset.nodata !== 255 || asset["raster:scale"] !== expectedScale) {
    throw new Error(`CLMS collection asset ${key} encoding changed`);
  }
  return asset;
}

function validateEmbeddedFlagDefinitions(asset, label) {
  const bands = array(asset.bands, `${label} bands`);
  const band = object(bands[0], `${label} band`);
  const classes = array(band["classification:classes"], `${label} flag classes`);
  for (const expected of EMBEDDED_FLAG_CODES) {
    const actual = classes.find((entry) => entry?.value === expected.value);
    if (!actual || actual.name !== expected.name) throw new Error(`${label} flag codebook changed`);
  }
}

export function validateClmsCollectionMetadata(ssmCollection, swiCollection) {
  const ssm = object(ssmCollection, "CLMS SSM collection");
  const swi = object(swiCollection, "CLMS SWI collection");
  if (ssm.id !== CLMS_COLLECTIONS.ssm || swi.id !== CLMS_COLLECTIONS.swi) {
    throw new Error("CLMS collection identity changed");
  }
  for (const [collection, kind] of [[ssm, "ssm"], [swi, "swi"]]) {
    const summaries = object(collection.summaries, `CLMS ${kind.toUpperCase()} summaries`);
    if (!array(summaries.gsd, `CLMS ${kind.toUpperCase()} gsd`).includes(CLMS_GRID.nativeResolutionM) ||
        !array(summaries["proj:code"], `CLMS ${kind.toUpperCase()} CRS`).includes(CLMS_GRID.crs)) {
      throw new Error(`CLMS ${kind.toUpperCase()} collection grid summary changed`);
    }
    const shape = array(summaries["proj:shape"], `CLMS ${kind.toUpperCase()} shape summary`);
    if (shape[0] !== CLMS_GRID.height || shape[1] !== CLMS_GRID.width) {
      throw new Error(`CLMS ${kind.toUpperCase()} collection shape summary changed`);
    }
  }
  const ssmAssets = object(ssm.item_assets, "CLMS SSM item assets");
  validateScale(ssmAssets, "ssm1km_ssm", 0.5);
  validateScale(ssmAssets, "ssm1km_noise", 0.5);

  const swiAssets = object(swi.item_assets, "CLMS SWI item assets");
  for (const key of [
    "swi1km_swi002", "swi1km_qflag002", "swi1km_swi005", "swi1km_qflag005",
    "swi1km_swi010", "swi1km_qflag010",
  ]) {
    const asset = validateScale(swiAssets, key, 0.5);
    validateEmbeddedFlagDefinitions(asset, `CLMS collection asset ${key}`);
  }
  const ssfAsset = object(swiAssets.swi1km_ssf, "CLMS collection SSF asset");
  if (ssfAsset.data_type !== "uint8" || ssfAsset.nodata !== 255) {
    throw new Error("CLMS SSF encoding changed");
  }
  const ssfBand = object(array(ssfAsset.bands, "CLMS SSF bands")[0], "CLMS SSF band");
  const bitfields = array(ssfBand["classification:bitfields"], "CLMS SSF codebook");
  for (const expected of SSF_CODEBOOK) {
    const actual = bitfields.find((entry) => entry?.value === expected.value);
    if (!actual || actual.name !== expected.name || actual.description !== expected.description) {
      throw new Error("CLMS product-specific SSF codebook changed");
    }
  }
  return {
    percentScale: 0.5,
    ssfScale: 1,
    ssfCodebook: SSF_CODEBOOK.map((entry) => ({ ...entry })),
  };
}

export function normalizeClmsStacSnapshot({ ssmCollection, swiCollection, ssmItem, swiItem }) {
  const semantics = validateClmsCollectionMetadata(ssmCollection, swiCollection);
  const ssm = normalizeProduct(ssmItem, "ssm");
  const swi = normalizeProduct(swiItem, "swi");
  if (ssm.identity.snapshotDate !== swi.identity.snapshotDate) {
    throw new Error("CLMS SSM and SWI products do not represent the same snapshot date");
  }
  return {
    manifest: {
      snapshotDate: ssm.identity.snapshotDate,
      nativeResolutionM: CLMS_GRID.nativeResolutionM,
      ssm: ssm.manifest,
      swi: swi.manifest,
    },
    downloads: [...ssm.downloads, ...swi.downloads],
    diagnostics: {
      sourceGrid: {
        crs: CLMS_GRID.crs,
        width: CLMS_GRID.width,
        height: CLMS_GRID.height,
        pixelDegrees: CLMS_GRID.pixelDegrees,
        nativeResolutionM: CLMS_GRID.nativeResolutionM,
      },
      semantics,
      scoringEnabled: false,
    },
  };
}

async function fetchJson(url, fetchImpl, label, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/geo+json, application/json" },
    });
    if (response.ok) return object(await response.json(), label);
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === attempts) {
      throw new Error(`${label} failed with HTTP ${response.status}`);
    }
    const retryAfter = Number(response.headers?.get?.("retry-after"));
    await new Promise((resolve) =>
      setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 20_000)
        : attempt * 2000)
    );
  }
  throw new Error(`${label} failed`);
}

function searchUrl(collection, startDate, endDate) {
  const url = new URL(`${CDSE_STAC_ROOT}/search`);
  url.searchParams.set("collections", collection);
  url.searchParams.set("datetime", `${startDate}T00:00:00Z/${endDate}T23:59:59Z`);
  url.searchParams.set("limit", "100");
  return url;
}

function candidateMap(features, kind) {
  const candidates = new Map();
  for (const item of features) {
    let identity;
    try {
      identity = parseIdentity(item, kind);
    } catch {
      continue;
    }
    const existing = candidates.get(identity.snapshotDate);
    if (!existing || identity.version.localeCompare(existing.identity.version, undefined, { numeric: true }) > 0) {
      candidates.set(identity.snapshotDate, { identity, item });
    }
  }
  return candidates;
}

export async function discoverClmsSnapshot({ snapshotDate, now = new Date(), fetchImpl = fetch } = {}) {
  const requestedDate = snapshotDate === undefined ? undefined : isoDate(snapshotDate, "CLMS snapshot date");
  const endDate = requestedDate ? addDays(requestedDate, 1) : now.toISOString().slice(0, 10);
  const startDate = requestedDate ? addDays(requestedDate, -1) : addDays(endDate, -21);
  const [ssmCollection, swiCollection, ssmSearch, swiSearch] = await Promise.all([
    fetchJson(`${CDSE_STAC_ROOT}/collections/${CLMS_COLLECTIONS.ssm}`, fetchImpl, "CLMS SSM collection discovery"),
    fetchJson(`${CDSE_STAC_ROOT}/collections/${CLMS_COLLECTIONS.swi}`, fetchImpl, "CLMS SWI collection discovery"),
    fetchJson(searchUrl(CLMS_COLLECTIONS.ssm, startDate, endDate), fetchImpl, "CLMS SSM product discovery"),
    fetchJson(searchUrl(CLMS_COLLECTIONS.swi, startDate, endDate), fetchImpl, "CLMS SWI product discovery"),
  ]);
  const ssmCandidates = candidateMap(array(ssmSearch.features, "CLMS SSM search features"), "ssm");
  const swiCandidates = candidateMap(array(swiSearch.features, "CLMS SWI search features"), "swi");
  const commonDates = [...ssmCandidates.keys()]
    .filter((date) => swiCandidates.has(date) && date >= "2025-07-14")
    .sort()
    .reverse();
  const selectedDate = requestedDate ?? commonDates[0];
  if (!selectedDate || !ssmCandidates.has(selectedDate) || !swiCandidates.has(selectedDate)) {
    throw new Error(requestedDate
      ? `No complete reviewed CLMS SSM/SWI pair is available for ${requestedDate}`
      : "No complete reviewed CLMS SSM/SWI pair was found in the 21-day discovery window");
  }
  return normalizeClmsStacSnapshot({
    ssmCollection,
    swiCollection,
    ssmItem: ssmCandidates.get(selectedDate).item,
    swiItem: swiCandidates.get(selectedDate).item,
  });
}

export async function requestCdseAccessToken({ clientId, clientSecret, fetchImpl = fetch }) {
  const normalizedClientId = string(clientId, "CDSE client ID");
  const normalizedClientSecret = string(clientSecret, "CDSE client secret");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: normalizedClientId,
    client_secret: normalizedClientSecret,
  });
  const response = await fetchImpl(CDSE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    // Deliberately do not include the provider body: identity errors can echo
    // client metadata and have no place in CI or Edge Function logs.
    throw new Error(`CDSE OAuth client-credentials request failed with HTTP ${response.status}`);
  }
  const payload = object(await response.json(), "CDSE OAuth response");
  const accessToken = string(payload.access_token, "CDSE access token");
  const expiresIn = Number(payload.expires_in);
  if (!Number.isFinite(expiresIn) || expiresIn < 60) throw new Error("CDSE access token lifetime is invalid");
  return { accessToken, expiresIn };
}
