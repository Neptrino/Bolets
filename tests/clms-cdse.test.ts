import { describe, expect, it, vi } from "vitest";
import {
  CLMS_COLLECTIONS,
  discoverClmsSnapshot,
  normalizeClmsStacSnapshot,
  requestCdseAccessToken,
  validateClmsCollectionMetadata,
} from "../scripts/lib/clms-cdse.mjs";

const flagClasses = [
  { name: "exceeding_min", value: 241 },
  { name: "exceeding_max", value: 242 },
  { name: "water_mask", value: 251 },
  { name: "sensitivity_mask", value: 252 },
  { name: "slope_mask", value: 253 },
  { name: "low_qflag", value: 254 },
];

const ssfCodebook = [
  { name: "nominal", value: 0, description: "Unfrozen soil, nominal conditions" },
  { name: "frozen", value: 1, description: "Frozen soil" },
  { name: "thawing", value: 2, description: "Thawing soil" },
  { name: "frozen_snow", value: 3, description: "Frozen soil with snow cover" },
  { name: "wet_snow", value: 4, description: "Wet snow" },
];

type EncodedAsset = {
  data_type: string;
  nodata: number;
  "raster:scale": number;
  bands: Record<string, unknown>[];
  [key: string]: unknown;
};

function encodedAsset(bands: Record<string, unknown>[]): EncodedAsset {
  return { data_type: "uint8", nodata: 255, "raster:scale": 0.5, bands: structuredClone(bands) };
}

function collectionFixtures() {
  const summaries = { gsd: [1000], "proj:code": ["EPSG:4326"], "proj:shape": [4144, 6832] };
  const swiAssets: Record<string, EncodedAsset> = Object.fromEntries([
    "swi1km_swi002", "swi1km_qflag002", "swi1km_swi005", "swi1km_qflag005",
    "swi1km_swi010", "swi1km_qflag010",
  ].map((key) => [key, encodedAsset([{ name: key, "classification:classes": flagClasses }])]));
  const swiItemAssets: Record<string, EncodedAsset> = {
    ...swiAssets,
    // CDSE currently publishes a generic 0.5 raster scale here. The
    // product-specific bitfields, not that generic field, define SSF.
    swi1km_ssf: encodedAsset([{ name: "ssf", "classification:bitfields": ssfCodebook }]),
  };
  return {
    ssm: {
      id: CLMS_COLLECTIONS.ssm,
      summaries,
      item_assets: {
        ssm1km_ssm: encodedAsset([{ name: "ssm" }]),
        ssm1km_noise: encodedAsset([{ name: "noise" }]),
      },
    },
    swi: {
      id: CLMS_COLLECTIONS.swi,
      summaries,
      item_assets: swiItemAssets,
    },
  };
}

function compactDate(date: string) {
  return date.replaceAll("-", "");
}

function itemFixture(kind: "ssm" | "swi", date = "2026-08-13") {
  const compact = compactDate(date);
  const nominalToken = `${compact}${kind === "ssm" ? "0000" : "1200"}`;
  const version = kind === "ssm" ? "V1.2.1" : "V2.1.1";
  const family = kind === "ssm" ? "SSM" : "SWI";
  const sensor = kind === "ssm" ? "S1CSAR" : "SCATSAR";
  const id = `c_gls_${family}1km_${nominalToken}_CEURO_${sensor}_${version}_cog`;
  const nominal = new Date(`${date}T${kind === "ssm" ? "00:00:00" : "12:00:00"}Z`);
  const start = new Date(kind === "ssm" ? nominal.valueOf() : nominal.valueOf() - 86_399_000).toISOString();
  const end = new Date(kind === "ssm" ? nominal.valueOf() + 86_399_000 : nominal.valueOf()).toISOString();
  const productRoot = kind === "ssm"
    ? "surface_soil_moisture/ssm_europe_1km_daily_v1"
    : "soil_water_index/swi_europe_1km_daily_v2";
  const specs = kind === "ssm" ? [
    ["ssm1km_ssm", "SSM"],
    ["ssm1km_noise", "NOISE"],
  ] : [
    ["swi1km_swi002", "SWI002"],
    ["swi1km_qflag002", "QFLAG002"],
    ["swi1km_swi005", "SWI005"],
    ["swi1km_qflag005", "QFLAG005"],
    ["swi1km_swi010", "SWI010"],
    ["swi1km_qflag010", "QFLAG010"],
    ["swi1km_ssf", "SSF"],
  ];
  const assets = Object.fromEntries(specs.map(([key, band], index) => {
    const filename = `c_gls_${family}1km-${band}_${nominalToken}_CEURO_${sensor}_${version}.tiff`;
    return [key, {
      href: `s3://eodata/CLMS/bio-geophysical/${productRoot}/${date.replaceAll("-", "/")}/${id}/${filename}`,
      type: "image/tiff; application=geotiff; profile=cloud-optimized",
      roles: ["data"],
      data_type: "uint8",
      nodata: 255,
      "raster:scale": 0.5,
      "file:size": 1_000_000 + index,
      "file:checksum": `d50110${String(index + 1).padStart(32, "0")}`,
      "proj:code": "EPSG:4326",
      "proj:shape": [4144, 6832],
      "proj:bbox": [-11, 35, 50, 72],
      "proj:transform": [1 / 112, 0, -11, 0, -1 / 112, 72],
      alternate: {
        https: {
          href: `https://download.dataspace.copernicus.eu/odata/v1/Products(00000000-0000-4000-8000-000000000000)/Nodes(${id})/Nodes(${filename})/$value`,
        },
      },
    }];
  }));
  return {
    id,
    collection: kind === "ssm" ? CLMS_COLLECTIONS.ssm : CLMS_COLLECTIONS.swi,
    bbox: [-11, 35, 50, 72],
    properties: {
      gsd: 1000,
      "proj:code": "EPSG:4326",
      "processing:version": version,
      datetime: start,
      start_datetime: start,
      end_datetime: end,
      published: new Date(Date.parse(end) + 86_400_000).toISOString(),
    },
    assets,
  };
}

describe("CDSE CLMS catalogue adapter", () => {
  it("builds the existing importer manifest from official STAC provenance", () => {
    const collections = collectionFixtures();
    const snapshot = normalizeClmsStacSnapshot({
      ssmCollection: collections.ssm,
      swiCollection: collections.swi,
      ssmItem: itemFixture("ssm"),
      swiItem: itemFixture("swi"),
    });

    expect(snapshot.manifest.snapshotDate).toBe("2026-08-13");
    expect(snapshot.manifest.nativeResolutionM).toBe(1000);
    expect(snapshot.manifest.swi.nominalAt).toBe("2026-08-13T12:00:00.000Z");
    expect(snapshot.manifest.swi.contentStart).toBe("2026-08-12T12:00:01.000Z");
    expect(snapshot.manifest.swi.assets.swi005).toMatchObject({
      checksum: "d5011000000000000000000000000000000003",
      checksumAlgorithm: "MD5",
    });
    expect(Object.values(snapshot.manifest.ssm.assets).every(
      (asset) => asset.checksumAlgorithm === "MD5",
    )).toBe(true);
    expect(Object.values(snapshot.manifest.swi.assets).every(
      (asset) => asset.checksumAlgorithm === "MD5",
    )).toBe(true);
    expect(snapshot.downloads).toHaveLength(9);
    expect(snapshot.diagnostics.sourceGrid).toMatchObject({
      crs: "EPSG:4326",
      width: 6832,
      height: 4144,
      pixelDegrees: 1 / 112,
    });
    expect(snapshot.diagnostics.semantics).toMatchObject({ percentScale: 0.5, ssfScale: 1 });
    expect(JSON.stringify(snapshot.manifest)).not.toContain("download.dataspace.copernicus.eu");
  });

  it("labels SHA-256 provenance consistently in generated manifests", () => {
    const collections = collectionFixtures();
    const ssm = itemFixture("ssm");
    ssm.assets.ssm1km_ssm["file:checksum"] = "a".repeat(64);
    const snapshot = normalizeClmsStacSnapshot({
      ssmCollection: collections.ssm,
      swiCollection: collections.swi,
      ssmItem: ssm,
      swiItem: itemFixture("swi"),
    });
    expect(snapshot.manifest.ssm.assets.ssm).toMatchObject({
      checksum: "a".repeat(64),
      checksumAlgorithm: "SHA-256",
    });
    expect(snapshot.downloads.find((asset) => asset.key === "ssm.ssm")).toMatchObject({
      checksumAlgorithm: "sha256",
      checksumDigest: "a".repeat(64),
    });
  });

  it("validates the product-specific SSF codebook without applying generic raster scale metadata", () => {
    const collections = collectionFixtures();
    expect(validateClmsCollectionMetadata(collections.ssm, collections.swi).ssfCodebook).toEqual(ssfCodebook);

    const bands = collections.swi.item_assets.swi1km_ssf.bands as Array<{
      "classification:bitfields": Array<{ description: string }>;
    }>;
    bands[0]["classification:bitfields"][0].description = "Unknown";
    expect(() => validateClmsCollectionMetadata(collections.ssm, collections.swi)).toThrow(/SSF codebook changed/);
  });

  it("fails closed when the percent scale or 1/112-degree grid drifts", () => {
    const collections = collectionFixtures();
    collections.swi.item_assets.swi1km_qflag005["raster:scale"] = 1;
    expect(() => normalizeClmsStacSnapshot({
      ssmCollection: collections.ssm,
      swiCollection: collections.swi,
      ssmItem: itemFixture("ssm"),
      swiItem: itemFixture("swi"),
    })).toThrow(/encoding changed/);

    const freshCollections = collectionFixtures();
    const swi = itemFixture("swi");
    swi.assets.swi1km_swi005["proj:transform"][0] = 0.01;
    expect(() => normalizeClmsStacSnapshot({
      ssmCollection: freshCollections.ssm,
      swiCollection: freshCollections.swi,
      ssmItem: itemFixture("ssm"),
      swiItem: swi,
    })).toThrow(/1\/112-degree grid/);
  });

  it("selects the newest date present in both reviewed product streams", async () => {
    const collections = collectionFixtures();
    const responses = new Map<string, ReturnType<typeof itemFixture>[]>([
      [CLMS_COLLECTIONS.ssm, [itemFixture("ssm", "2026-08-12"), itemFixture("ssm", "2026-08-13")]],
      [CLMS_COLLECTIONS.swi, [itemFixture("swi", "2026-08-11"), itemFixture("swi", "2026-08-12")]],
    ]);
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      if (url.pathname.includes("/collections/") && !url.pathname.endsWith("/search")) {
        const collection = url.pathname.split("/").at(-1);
        const body = collection === CLMS_COLLECTIONS.ssm ? collections.ssm : collections.swi;
        return { ok: true, status: 200, json: async () => body } as Response;
      }
      const collection = url.searchParams.get("collections") ?? "";
      return { ok: true, status: 200, json: async () => ({ features: responses.get(collection) ?? [] }) } as Response;
    });

    const snapshot = await discoverClmsSnapshot({ now: new Date("2026-08-15T12:00:00Z"), fetchImpl });
    expect(snapshot.manifest.snapshotDate).toBe("2026-08-12");
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });
});

describe("CDSE OAuth client credentials", () => {
  it("uses form-encoded client credentials and returns only the short-lived token", async () => {
    const fetchImpl = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      const body = init?.body as URLSearchParams;
      expect(body.get("grant_type")).toBe("client_credentials");
      expect(body.get("client_id")).toBe("client-id");
      expect(body.get("client_secret")).toBe("client-secret");
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "short-lived-access-token", expires_in: 1800 }),
      } as Response;
    });
    await expect(requestCdseAccessToken({
      clientId: "client-id",
      clientSecret: "client-secret",
      fetchImpl,
    })).resolves.toEqual({ accessToken: "short-lived-access-token", expiresIn: 1800 });
  });

  it("does not echo provider bodies or credentials in authentication failures", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: "client-secret" }),
    } as Response));
    await expect(requestCdseAccessToken({
      clientId: "client-id",
      clientSecret: "client-secret",
      fetchImpl,
    })).rejects.toThrow("CDSE OAuth client-credentials request failed with HTTP 401");
    await requestCdseAccessToken({ clientId: "client-id", clientSecret: "client-secret", fetchImpl })
      .catch((error: Error) => expect(error.message).not.toContain("client-secret"));
  });
});
