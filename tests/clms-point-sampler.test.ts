import { describe, expect, it } from "vitest";
import {
  buildPrivacySafeClmsReport,
  normalizePrivateComparisonPoints,
} from "../scripts/sample-clms-points.mts";

function productAssets(kind: "ssm" | "swi", token: string, version: string) {
  const bands = kind === "ssm"
    ? { ssm: "SSM", noise: "NOISE" }
    : {
        swi002: "SWI002",
        qflag002: "QFLAG002",
        swi005: "SWI005",
        qflag005: "QFLAG005",
        swi010: "SWI010",
        qflag010: "QFLAG010",
        ssf: "SSF",
      };
  const family = kind === "ssm" ? "SSM" : "SWI";
  const sensor = kind === "ssm" ? "S1CSAR" : "SCATSAR";
  const productId = `c_gls_${family}1km_${token}_CEURO_${sensor}_${version}_cog`;
  const root = kind === "ssm"
    ? "surface_soil_moisture/ssm_europe_1km_daily_v1"
    : "soil_water_index/swi_europe_1km_daily_v2";
  const datePath = `${token.slice(0, 4)}/${token.slice(4, 6)}/${token.slice(6, 8)}`;
  return Object.fromEntries(Object.entries(bands).map(([key, band]) => [key, {
    href: `s3://eodata/CLMS/bio-geophysical/${root}/${datePath}/${productId}/` +
      `c_gls_${family}1km-${band}_${token}_CEURO_${sensor}_${version}.tiff`,
    checksum: "a".repeat(32),
    checksumAlgorithm: "MD5",
  }]));
}

function manifestFixture() {
  return {
    snapshotDate: "2026-08-13",
    nativeResolutionM: 1000,
    ssm: {
      productId: "c_gls_SSM1km_202608130000_CEURO_S1CSAR_V1.2.1_cog",
      version: "V1.2.1",
      nominalAt: "2026-08-13T00:00:00Z",
      contentStart: "2026-08-13T00:00:00Z",
      contentEnd: "2026-08-13T23:59:59Z",
      publishedAt: "2026-08-14T01:00:00Z",
      assets: productAssets("ssm", "202608130000", "V1.2.1"),
    },
    swi: {
      productId: "c_gls_SWI1km_202608131200_CEURO_SCATSAR_V2.1.1_cog",
      version: "V2.1.1",
      nominalAt: "2026-08-13T12:00:00Z",
      contentStart: "2026-08-12T12:00:01Z",
      contentEnd: "2026-08-13T12:00:00Z",
      publishedAt: "2026-08-14T02:00:00Z",
      assets: productAssets("swi", "202608131200", "V2.1.1"),
    },
  };
}

const rawBands = {
  ssmDn: 100,
  ssmNoiseDn: 20,
  swi002Dn: 110,
  qflag002Dn: 160,
  swi005Dn: 120,
  qflag005Dn: 150,
  swi010Dn: 130,
  qflag010Dn: 140,
  ssfDn: 0,
};

describe("privacy-safe CLMS point sampler", () => {
  it("only accepts sequential non-identifying labels inside the source grid", () => {
    expect(normalizePrivateComparisonPoints([
      { label: "Location 1", latitude: 42.25, longitude: 2.25 },
      { label: "Location 2", latitude: 42.5, longitude: 2.5 },
    ])).toHaveLength(2);
    expect(() => normalizePrivateComparisonPoints([
      { label: "Named mushroom place", latitude: 42.25, longitude: 2.25 },
    ])).toThrow(/labels must be sequential/);
    expect(() => normalizePrivateComparisonPoints([
      { label: "Location 1", latitude: 90, longitude: 2.25 },
    ])).toThrow(/outside the CLMS CEURO grid/);
  });

  it("decodes the shared CLMS contract without leaking input or source-pixel coordinates", () => {
    const report = buildPrivacySafeClmsReport({
      manifest: manifestFixture(),
      points: [
        { label: "Location 1", latitude: 42.251234, longitude: 2.251234, row: 3332, column: 1484 },
        { label: "Location 2", latitude: 42.501234, longitude: 2.501234, row: 3303, column: 1512 },
      ],
      rawByLocation: [rawBands, { ...rawBands, ssmDn: 253, ssfDn: 2 }],
      uniqueSourcePixels: 2,
    });

    expect(report.locations[0]).toMatchObject({
      label: "Location 1",
      surfaceSoilMoisture: {
        measurement: { rawDn: 100, relativePercent: 50, flag: null },
        status: "usable",
      },
      soilWaterIndex: {
        t5: { rawDn: 120, relativePercent: 60, flag: null },
        t5Quality: { rawDn: 150, relativePercent: 75, flag: null },
        surfaceState: {
          rawDn: 0,
          interpretation: "nominal",
          catalogLabel: "nominal",
          catalogDescription: "unfrozen-nominal",
          semanticStatus: "catalog-label",
          caveat: null,
        },
        t5Status: "usable",
      },
    });
    expect(report.locations[1]).toMatchObject({
      label: "Location 2",
      surfaceSoilMoisture: {
        measurement: { rawDn: 253, relativePercent: null, flag: "slope-mask" },
        status: "unavailable",
      },
      soilWaterIndex: {
        surfaceState: {
          rawDn: 2,
          interpretation: "non-nominal",
          catalogLabel: "thawing",
          catalogDescription: "thawing",
          semanticStatus: "official-documentation-conflict",
        },
        t5Status: "limited",
      },
    });
    expect(report.locations[1].soilWaterIndex.surfaceState.caveat).toMatch(
      /catalog labels raw SSF DN 2 as thawing.*validation report.*SSF=2 as frozen/i,
    );
    expect(report).toMatchObject({
      provenance: {
        surfaceStateSemantics: {
          policy: expect.stringMatching(/Preserve the raw code.*DN 0 as nominal.*DN 1-4 quality-limited/i),
        },
      },
      sourceGrid: { nativeResolutionM: 1000, samplingMethod: "nearest-native-pixel" },
      privacy: { coordinatesIncluded: false, sourcePixelCoordinatesIncluded: false },
      scoringEnabled: false,
    });

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("42.251234");
    expect(serialized).not.toContain("2.251234");
    expect(serialized).not.toContain("42.501234");
    expect(serialized).not.toContain("2.501234");
    expect(serialized).not.toContain("atmospherePointId");
    expect(serialized).not.toContain("sourcePixelLatitude");
    expect(serialized).not.toContain("sourcePixelLongitude");
  });
});
