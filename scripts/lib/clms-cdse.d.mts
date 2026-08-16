export const CDSE_TOKEN_ENDPOINT: string;

export const CLMS_GRID: Readonly<{
  crs: "EPSG:4326";
  width: 6832;
  height: 4144;
  west: -11;
  south: 35;
  east: 50;
  north: 72;
  pixelDegrees: number;
  nativeResolutionM: 1000;
}>;

export const CLMS_COLLECTIONS: Readonly<{
  ssm: "clms_ssm_europe_1km_daily_v1_cog";
  swi: "clms_swi_europe_1km_daily_v2_cog";
}>;

export type ClmsManifestProduct = {
  productId: string;
  version: string;
  nominalAt: string;
  contentStart: string;
  contentEnd: string;
  publishedAt: string;
  assets: Record<string, {
    href: string;
    checksum: string;
    checksumAlgorithm: "MD5" | "SHA-256";
  }>;
};

export type ClmsCdseSnapshot = {
  manifest: {
    snapshotDate: string;
    nativeResolutionM: 1000;
    ssm: ClmsManifestProduct;
    swi: ClmsManifestProduct;
  };
  downloads: Array<{
    key: string;
    filename: string;
    url: string;
    expectedBytes: number;
    checksumAlgorithm: "md5" | "sha256";
    checksumDigest: string;
  }>;
  diagnostics: {
    sourceGrid: {
      crs: "EPSG:4326";
      width: 6832;
      height: 4144;
      pixelDegrees: number;
      nativeResolutionM: 1000;
    };
    semantics: {
      percentScale: 0.5;
      ssfScale: 1;
      ssfCodebook: Array<{ name: string; value: number; description: string }>;
    };
    scoringEnabled: false;
  };
};

export function validateClmsCollectionMetadata(
  ssmCollection: unknown,
  swiCollection: unknown,
): ClmsCdseSnapshot["diagnostics"]["semantics"];

export function normalizeClmsStacSnapshot(input: {
  ssmCollection: unknown;
  swiCollection: unknown;
  ssmItem: unknown;
  swiItem: unknown;
}): ClmsCdseSnapshot;

export function discoverClmsSnapshot(options?: {
  snapshotDate?: string;
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<ClmsCdseSnapshot>;

export function requestCdseAccessToken(options: {
  clientId: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
}): Promise<{ accessToken: string; expiresIn: number }>;
