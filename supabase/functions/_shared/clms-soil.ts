export const CLMS_NATIVE_RESOLUTION_M = 1000;
export const CLMS_SAMPLE_SPACING_M = 2500;
export const CLMS_PERCENT_SCALE = 0.5;

export type ClmsQualityStatus = "usable" | "limited" | "unavailable";

type ClmsAsset = {
  href?: unknown;
  checksum?: unknown;
  checksumAlgorithm?: unknown;
};

type ClmsProductInput = {
  productId?: unknown;
  version?: unknown;
  nominalAt?: unknown;
  contentStart?: unknown;
  contentEnd?: unknown;
  publishedAt?: unknown;
  assets?: unknown;
};

export type ClmsManifestInput = {
  snapshotDate?: unknown;
  nativeResolutionM?: unknown;
  ssm?: unknown;
  swi?: unknown;
};

export type ClmsSampleInput = {
  atmospherePointId?: unknown;
  sourcePixelLatitude?: unknown;
  sourcePixelLongitude?: unknown;
  ssmDn?: unknown;
  ssmNoiseDn?: unknown;
  swi002Dn?: unknown;
  qflag002Dn?: unknown;
  swi005Dn?: unknown;
  qflag005Dn?: unknown;
  swi010Dn?: unknown;
  qflag010Dn?: unknown;
  ssfDn?: unknown;
};

export type ClmsImportInput = {
  manifest?: unknown;
  samples?: unknown;
  batchIndex?: unknown;
  batchCount?: unknown;
  expectedSamples?: unknown;
};

const SSM_PRODUCT_PATTERN = /^c_gls_SSM1km_(\d{12})_CEURO_S1CSAR_(V\d+\.\d+\.\d+)_cog$/;
const SWI_PRODUCT_PATTERN = /^c_gls_SWI1km_(\d{12})_CEURO_SCATSAR_(V\d+\.\d+\.\d+)_cog$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SSM_FLAGS = new Map<number, string>([
  [241, "exceeding-minimum"],
  [242, "exceeding-maximum"],
  [251, "water-mask"],
  [252, "sensitivity-mask"],
  [253, "slope-mask"],
  [255, "no-data"],
]);

const SWI_FLAGS = new Map<number, string>([
  ...SSM_FLAGS,
  [254, "low-quality-flag"],
]);

const NO_DATA_FLAG = new Map<number, string>([[255, "no-data"]]);

const SURFACE_STATES = new Map<number, string>([
  // Product-specific CDSE collection metadata is authoritative here. The
  // generic H SAF ASCAT SSF uses a different codebook, and must not be reused.
  [0, "unfrozen-nominal"],
  [1, "frozen"],
  [2, "thawing"],
  [3, "frozen-with-snow-cover"],
  [4, "wet-snow"],
]);

const SSM_BANDS = {
  ssm: "SSM",
  noise: "NOISE",
} as const;

const SWI_BANDS = {
  swi002: "SWI002",
  qflag002: "QFLAG002",
  swi005: "SWI005",
  qflag005: "QFLAG005",
  swi010: "SWI010",
  qflag010: "QFLAG010",
  ssf: "SSF",
} as const;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function integer(value: unknown, label: string) {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer`);
  return Number(value);
}

function timestamp(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be an ISO timestamp`);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be an ISO timestamp`);
  return new Date(parsed).toISOString();
}

function versionParts(value: string, label: string) {
  const match = /^V(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) throw new Error(`${label} has an invalid product version`);
  return match.slice(1).map(Number);
}

function embeddedTimestamp(value: string, label: string) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute
  ) {
    throw new Error(`${label} contains an invalid nominal timestamp`);
  }
  return date.toISOString();
}

function expectedAssetHrefs(
  kind: "ssm" | "swi",
  productId: string,
  nominalToken: string,
  version: string,
) {
  const datePath = `${nominalToken.slice(0, 4)}/${nominalToken.slice(4, 6)}/${nominalToken.slice(6, 8)}`;
  const productRoot = kind === "ssm"
    ? "surface_soil_moisture/ssm_europe_1km_daily_v1"
    : "soil_water_index/swi_europe_1km_daily_v2";
  const family = kind === "ssm" ? "SSM" : "SWI";
  const sensor = kind === "ssm" ? "S1CSAR" : "SCATSAR";
  const bands = kind === "ssm" ? SSM_BANDS : SWI_BANDS;
  return Object.fromEntries(Object.entries(bands).map(([key, band]) => [
    key,
    `s3://eodata/CLMS/bio-geophysical/${productRoot}/${datePath}/${productId}/` +
    `c_gls_${family}1km-${band}_${nominalToken}_CEURO_${sensor}_${version}.tiff`,
  ]));
}

function normalizeChecksum(asset: ClmsAsset, label: string) {
  const rawChecksum = typeof asset.checksum === "string" ? asset.checksum.toLowerCase() : "";
  // CDSE STAC publishes MD5 as a multihash: d5 01 (MD5 code), 10 (16-byte
  // length), followed by the 32 hexadecimal digest characters.
  const cdseMd5 = /^d50110([0-9a-f]{32})$/.exec(rawChecksum);
  if (cdseMd5) return { checksum: cdseMd5[1], checksumAlgorithm: "MD5" };

  const algorithm = typeof asset.checksumAlgorithm === "string"
    ? asset.checksumAlgorithm.toUpperCase().replace("SHA256", "SHA-256")
    : "";
  const checksumLength = algorithm === "MD5" ? 32 : algorithm === "SHA-256" ? 64 : undefined;
  if (!checksumLength || rawChecksum.length !== checksumLength || !/^[0-9a-f]+$/.test(rawChecksum)) {
    throw new Error(`${label} must provide MD5 or SHA-256 checksum provenance`);
  }
  return { checksum: rawChecksum, checksumAlgorithm: algorithm };
}

function normalizeAssets(value: unknown, expected: Record<string, string>, label: string) {
  const assets = record(value, `${label} assets`);
  const normalized: Record<string, Record<string, string>> = {};
  for (const [key, expectedHref] of Object.entries(expected)) {
    const asset = record(assets[key], `${label} asset ${key}`) as ClmsAsset;
    if (asset.href !== expectedHref) {
      throw new Error(`${label} asset ${key} does not match the official product band path`);
    }
    const { checksum, checksumAlgorithm } = normalizeChecksum(asset, `${label} asset ${key}`);
    normalized[key] = {
      href: expectedHref,
      checksum,
      checksumAlgorithm,
    };
  }
  return normalized;
}

function normalizeProduct(
  value: unknown,
  kind: "ssm" | "swi",
  snapshotDate: string,
) {
  const product = record(value, `CLMS ${kind.toUpperCase()} product`) as ClmsProductInput;
  const productId = typeof product.productId === "string" ? product.productId : "";
  const pattern = kind === "ssm" ? SSM_PRODUCT_PATTERN : SWI_PRODUCT_PATTERN;
  const match = pattern.exec(productId);
  if (!match) throw new Error(`CLMS ${kind.toUpperCase()} productId is invalid`);
  const version = typeof product.version === "string" ? product.version : "";
  const parts = versionParts(version, `CLMS ${kind.toUpperCase()}`);
  if (version !== match[2]) throw new Error(`CLMS ${kind.toUpperCase()} product version does not match its ID`);
  if (kind === "ssm" && (parts[0] !== 1 || parts[1] !== 2 || parts[2] < 1)) {
    throw new Error("CLMS SSM imports require reviewed V1.2.1+ patch releases");
  }
  if (kind === "swi" && (parts[0] !== 2 || parts[1] !== 1 || parts[2] < 1)) {
    throw new Error("CLMS SWI imports require reviewed, spatial-shift-corrected V2.1.1+ patch releases");
  }
  const nominalAt = timestamp(product.nominalAt, `CLMS ${kind.toUpperCase()} nominalAt`);
  const embeddedNominalAt = embeddedTimestamp(match[1], `CLMS ${kind.toUpperCase()} productId`);
  if (nominalAt !== embeddedNominalAt) {
    throw new Error(`CLMS ${kind.toUpperCase()} nominalAt does not match its product ID`);
  }
  if (nominalAt.slice(0, 10) !== snapshotDate) {
    throw new Error(`CLMS ${kind.toUpperCase()} nominal product date does not match snapshotDate`);
  }
  if ((kind === "ssm" && nominalAt.slice(11, 16) !== "00:00") ||
      (kind === "swi" && nominalAt.slice(11, 16) !== "12:00")) {
    throw new Error(`CLMS ${kind.toUpperCase()} nominal hour is invalid`);
  }
  const contentStart = timestamp(product.contentStart, `CLMS ${kind.toUpperCase()} contentStart`);
  const contentEnd = timestamp(product.contentEnd, `CLMS ${kind.toUpperCase()} contentEnd`);
  const publishedAt = timestamp(product.publishedAt, `CLMS ${kind.toUpperCase()} publishedAt`);
  if (contentStart > contentEnd) throw new Error(`CLMS ${kind.toUpperCase()} content window is inverted`);
  const nominalMilliseconds = Date.parse(nominalAt);
  const expectedContentStart = new Date(
    kind === "ssm" ? nominalMilliseconds : nominalMilliseconds - 86_399_000,
  ).toISOString();
  const expectedContentEnd = new Date(
    kind === "ssm" ? nominalMilliseconds + 86_399_000 : nominalMilliseconds,
  ).toISOString();
  if (contentStart !== expectedContentStart || contentEnd !== expectedContentEnd) {
    throw new Error(`CLMS ${kind.toUpperCase()} content window does not match the product schedule`);
  }
  if (publishedAt < contentEnd) throw new Error(`CLMS ${kind.toUpperCase()} publication predates its content window`);
  return {
    productId,
    version,
    nominalAt,
    contentStart,
    contentEnd,
    publishedAt,
    assets: normalizeAssets(
      product.assets,
      expectedAssetHrefs(kind, productId, match[1], version),
      kind.toUpperCase(),
    ),
  };
}

export function normalizeClmsManifest(input: ClmsManifestInput) {
  const snapshotDate = typeof input.snapshotDate === "string" ? input.snapshotDate : "";
  const parsedSnapshotDate = new Date(`${snapshotDate}T00:00:00Z`);
  if (!ISO_DATE_PATTERN.test(snapshotDate) || Number.isNaN(parsedSnapshotDate.valueOf()) ||
      parsedSnapshotDate.toISOString().slice(0, 10) !== snapshotDate) {
    throw new Error("CLMS snapshotDate must be an ISO date");
  }
  if (snapshotDate < "2025-07-14") {
    throw new Error("Spatial-shift-corrected CLMS SWI V2.1.1 is unavailable before 2025-07-14");
  }
  const nativeResolutionM = input.nativeResolutionM === undefined
    ? CLMS_NATIVE_RESOLUTION_M
    : integer(input.nativeResolutionM, "CLMS nativeResolutionM");
  if (nativeResolutionM !== CLMS_NATIVE_RESOLUTION_M) {
    throw new Error("CLMS nativeResolutionM must remain 1000");
  }
  const ssm = normalizeProduct(input.ssm, "ssm", snapshotDate);
  const swi = normalizeProduct(input.swi, "swi", snapshotDate);
  const sourceAssets = { ssm: ssm.assets, swi: swi.assets };
  if (JSON.stringify(sourceAssets).length > 50_000) throw new Error("CLMS source asset manifest is too large");
  return {
    snapshot_date: snapshotDate,
    ssm_product_id: ssm.productId,
    ssm_product_version: ssm.version,
    ssm_nominal_at: ssm.nominalAt,
    ssm_content_start: ssm.contentStart,
    ssm_content_end: ssm.contentEnd,
    ssm_published_at: ssm.publishedAt,
    swi_product_id: swi.productId,
    swi_product_version: swi.version,
    swi_nominal_at: swi.nominalAt,
    swi_content_start: swi.contentStart,
    swi_content_end: swi.contentEnd,
    swi_published_at: swi.publishedAt,
    source_assets: sourceAssets,
    native_resolution_m: nativeResolutionM,
  };
}

function rawDn(value: unknown, label: string, flags: ReadonlyMap<number, string>) {
  const raw = integer(value, label);
  if ((raw < 0 || raw > 200) && !flags.has(raw)) throw new Error(`${label} has an unsupported DN`);
  return raw;
}

function surfaceStateDn(value: unknown) {
  const raw = integer(value, "CLMS SSF");
  if (!SURFACE_STATES.has(raw) && raw !== 255) throw new Error("CLMS SSF has an unsupported DN");
  return raw;
}

function isMeasurement(raw: number) {
  return raw >= 0 && raw <= 200;
}

export function decodeClmsPercent(raw: number) {
  return isMeasurement(raw) ? raw * CLMS_PERCENT_SCALE : undefined;
}

export function decodeClmsSurfaceState(raw: number) {
  return SURFACE_STATES.get(raw);
}

export function clmsFlagMeaning(raw: number, kind: "ssm" | "swi") {
  return (kind === "ssm" ? SSM_FLAGS : SWI_FLAGS).get(raw);
}

export function normalizeClmsSample(input: ClmsSampleInput) {
  const atmospherePointId = typeof input.atmospherePointId === "string" ? input.atmospherePointId : "";
  if (!/^open-meteo:arome-2500:-?\d+:-?\d+$/.test(atmospherePointId)) {
    throw new Error("CLMS atmospherePointId must identify a canonical AROME point");
  }
  const sourcePixelLatitude = typeof input.sourcePixelLatitude === "number" && Number.isFinite(input.sourcePixelLatitude)
    ? input.sourcePixelLatitude
    : undefined;
  const sourcePixelLongitude = typeof input.sourcePixelLongitude === "number" && Number.isFinite(input.sourcePixelLongitude)
    ? input.sourcePixelLongitude
    : undefined;
  if (sourcePixelLatitude === undefined || sourcePixelLatitude < 35 || sourcePixelLatitude > 72 ||
      sourcePixelLongitude === undefined || sourcePixelLongitude < -11 || sourcePixelLongitude > 50) {
    throw new Error("CLMS source pixel coordinates are outside the CEURO grid");
  }
  const ssmDn = rawDn(input.ssmDn, "CLMS SSM", SSM_FLAGS);
  const ssmNoiseDn = rawDn(input.ssmNoiseDn, "CLMS SSM noise", NO_DATA_FLAG);
  const swi002Dn = rawDn(input.swi002Dn, "CLMS SWI002", SWI_FLAGS);
  const qflag002Dn = rawDn(input.qflag002Dn, "CLMS QFLAG002", SWI_FLAGS);
  const swi005Dn = rawDn(input.swi005Dn, "CLMS SWI005", SWI_FLAGS);
  const qflag005Dn = rawDn(input.qflag005Dn, "CLMS QFLAG005", SWI_FLAGS);
  const swi010Dn = rawDn(input.swi010Dn, "CLMS SWI010", SWI_FLAGS);
  const qflag010Dn = rawDn(input.qflag010Dn, "CLMS QFLAG010", SWI_FLAGS);
  const ssfDn = surfaceStateDn(input.ssfDn);
  const ssmStatus: ClmsQualityStatus = !isMeasurement(ssmDn)
    ? "unavailable"
    : !isMeasurement(ssmNoiseDn) ? "limited" : "usable";
  const swiStatus: ClmsQualityStatus = !isMeasurement(swi005Dn) || !isMeasurement(qflag005Dn)
    ? "unavailable"
    : ssfDn === 255 ? "unavailable" : ssfDn !== 0 ? "limited" : "usable";
  return {
    atmosphere_point_id: atmospherePointId,
    source_pixel_lat: sourcePixelLatitude,
    source_pixel_lon: sourcePixelLongitude,
    ssm_dn: ssmDn,
    ssm_noise_dn: ssmNoiseDn,
    swi_002_dn: swi002Dn,
    qflag_002_dn: qflag002Dn,
    swi_005_dn: swi005Dn,
    qflag_005_dn: qflag005Dn,
    swi_010_dn: swi010Dn,
    qflag_010_dn: qflag010Dn,
    ssf_dn: ssfDn,
    ssm_status: ssmStatus,
    swi_t5_status: swiStatus,
  };
}

export function clmsShadowValues(sample: ReturnType<typeof normalizeClmsSample>) {
  return {
    surfaceSoilMoisturePercent: decodeClmsPercent(sample.ssm_dn),
    surfaceSoilMoistureNoisePercent: decodeClmsPercent(sample.ssm_noise_dn),
    soilWaterIndexT2Percent: decodeClmsPercent(sample.swi_002_dn),
    soilWaterIndexT2QualityPercent: decodeClmsPercent(sample.qflag_002_dn),
    soilWaterIndexT5Percent: decodeClmsPercent(sample.swi_005_dn),
    soilWaterIndexT5QualityPercent: decodeClmsPercent(sample.qflag_005_dn),
    soilWaterIndexT10Percent: decodeClmsPercent(sample.swi_010_dn),
    soilWaterIndexT10QualityPercent: decodeClmsPercent(sample.qflag_010_dn),
    surfaceState: decodeClmsSurfaceState(sample.ssf_dn),
    surfaceSoilMoistureStatus: sample.ssm_status,
    soilWaterIndexT5Status: sample.swi_t5_status,
    nativeResolutionM: CLMS_NATIVE_RESOLUTION_M,
    samplingSpacingM: CLMS_SAMPLE_SPACING_M,
  };
}

export function normalizeClmsImport(input: ClmsImportInput) {
  const manifest = normalizeClmsManifest(record(input.manifest, "CLMS manifest") as ClmsManifestInput);
  if (!Array.isArray(input.samples) || input.samples.length < 1 || input.samples.length > 500) {
    throw new Error("CLMS imports require between 1 and 500 samples per batch");
  }
  const samples = input.samples.map((sample) => normalizeClmsSample(record(sample, "CLMS sample") as ClmsSampleInput));
  const batchIndex = integer(input.batchIndex, "CLMS batchIndex");
  const batchCount = integer(input.batchCount, "CLMS batchCount");
  const expectedSamples = integer(input.expectedSamples, "CLMS expectedSamples");
  if (batchCount < 1 || batchCount > 1000 || batchIndex < 0 || batchIndex >= batchCount) {
    throw new Error("CLMS batch coordinates are invalid");
  }
  if (expectedSamples < samples.length || expectedSamples > 100_000) {
    throw new Error("CLMS expectedSamples is invalid");
  }
  return { manifest, samples, batchIndex, batchCount, expectedSamples };
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
