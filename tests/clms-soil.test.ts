import { describe, expect, it } from "vitest";
import {
  clmsFlagMeaning,
  clmsShadowValues,
  decodeClmsPercent,
  decodeClmsSurfaceState,
  normalizeClmsImport,
  normalizeClmsManifest,
  normalizeClmsSample,
} from "@/supabase/functions/_shared/clms-soil";

function assets(kind: "ssm" | "swi", nominalToken: string, version: string, keys: string[]) {
  const bandNames: Record<string, string> = {
    ssm: "SSM",
    noise: "NOISE",
    swi002: "SWI002",
    qflag002: "QFLAG002",
    swi005: "SWI005",
    qflag005: "QFLAG005",
    swi010: "SWI010",
    qflag010: "QFLAG010",
    ssf: "SSF",
  };
  const datePath = `${nominalToken.slice(0, 4)}/${nominalToken.slice(4, 6)}/${nominalToken.slice(6, 8)}`;
  const productId = kind === "ssm"
    ? `c_gls_SSM1km_${nominalToken}_CEURO_S1CSAR_${version}_cog`
    : `c_gls_SWI1km_${nominalToken}_CEURO_SCATSAR_${version}_cog`;
  const root = kind === "ssm"
    ? "surface_soil_moisture/ssm_europe_1km_daily_v1"
    : "soil_water_index/swi_europe_1km_daily_v2";
  const family = kind === "ssm" ? "SSM" : "SWI";
  const sensor = kind === "ssm" ? "S1CSAR" : "SCATSAR";
  return Object.fromEntries(keys.map((key) => [key, {
    href: `s3://eodata/CLMS/bio-geophysical/${root}/${datePath}/${productId}/` +
      `c_gls_${family}1km-${bandNames[key]}_${nominalToken}_CEURO_${sensor}_${version}.tiff`,
    checksum: "0123456789abcdef0123456789abcdef",
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
      assets: assets("ssm", "202608130000", "V1.2.1", ["ssm", "noise"]),
    },
    swi: {
      productId: "c_gls_SWI1km_202608131200_CEURO_SCATSAR_V2.1.1_cog",
      version: "V2.1.1",
      nominalAt: "2026-08-13T12:00:00Z",
      contentStart: "2026-08-12T12:00:01Z",
      contentEnd: "2026-08-13T12:00:00Z",
      publishedAt: "2026-08-14T02:00:00Z",
      assets: assets("swi", "202608131200", "V2.1.1", [
        "swi002",
        "qflag002",
        "swi005",
        "qflag005",
        "swi010",
        "qflag010",
        "ssf",
      ]),
    },
  };
}

function sampleFixture() {
  return {
    atmospherePointId: "open-meteo:arome-2500:173:1886",
    sourcePixelLatitude: 42.3,
    sourcePixelLongitude: 2.3,
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
}

describe("Copernicus CLMS soil shadow normalization", () => {
  it("uses nominal product IDs instead of STAC content-start dates", () => {
    const normalized = normalizeClmsManifest(manifestFixture());

    expect(normalized.snapshot_date).toBe("2026-08-13");
    expect(normalized.swi_content_start).toBe("2026-08-12T12:00:01.000Z");
    expect(normalized.swi_nominal_at).toBe("2026-08-13T12:00:00.000Z");
    expect(normalized.native_resolution_m).toBe(1000);
  });

  it("rejects a STAC datetime substituted for the nominal SWI timestamp", () => {
    const fixture = manifestFixture();
    fixture.swi.nominalAt = fixture.swi.contentStart;
    expect(() => normalizeClmsManifest(fixture)).toThrow(/nominalAt does not match its product ID/);
  });

  it("rejects product content windows copied from the wrong daily schedule", () => {
    const fixture = manifestFixture();
    fixture.ssm.contentStart = "2026-08-12T00:00:01Z";
    fixture.ssm.contentEnd = "2026-08-13T00:00:00Z";
    expect(() => normalizeClmsManifest(fixture)).toThrow(/content window does not match the product schedule/);
  });

  it("requires the spatial-shift-corrected product versions", () => {
    const fixture = manifestFixture();
    fixture.swi.productId = "c_gls_SWI1km_202608131200_CEURO_SCATSAR_V2.1.0_cog";
    fixture.swi.version = "V2.1.0";
    expect(() => normalizeClmsManifest(fixture)).toThrow(/V2\.1\.1\+ patch releases/);
  });

  it("rejects unreviewed future minor product lines", () => {
    const swi = manifestFixture();
    swi.swi.productId = "c_gls_SWI1km_202608131200_CEURO_SCATSAR_V2.2.0_cog";
    swi.swi.version = "V2.2.0";
    expect(() => normalizeClmsManifest(swi)).toThrow(/reviewed, spatial-shift-corrected/);

    const ssm = manifestFixture();
    ssm.ssm.productId = "c_gls_SSM1km_202608130000_CEURO_S1CSAR_V1.3.0_cog";
    ssm.ssm.version = "V1.3.0";
    expect(() => normalizeClmsManifest(ssm)).toThrow(/reviewed V1\.2\.1\+ patch releases/);
  });

  it("rejects future major versions until their encoding has a new adapter", () => {
    const fixture = manifestFixture();
    fixture.swi.productId = "c_gls_SWI1km_202608131200_CEURO_SCATSAR_V3.0.0_cog";
    fixture.swi.version = "V3.0.0";
    expect(() => normalizeClmsManifest(fixture)).toThrow(/V2\.1\.1\+ patch releases/);
  });

  it("does not accept SWI v2 dates before the authoritative availability window", () => {
    const fixture = manifestFixture();
    fixture.snapshotDate = "2025-07-13";
    expect(() => normalizeClmsManifest(fixture)).toThrow(/V2\.1\.1 is unavailable before 2025-07-14/);
  });

  it("does not persist signed asset URLs or credentials", () => {
    const fixture = manifestFixture();
    fixture.swi.assets.swi005.href = "https://example.test/swi005.tiff?token=secret";
    expect(() => normalizeClmsManifest(fixture)).toThrow(/official product band path/);
  });

  it("rejects swapped same-grid bands and wrong product dates", () => {
    const fixture = manifestFixture();
    fixture.swi.assets.swi005.href = fixture.swi.assets.qflag005.href;
    expect(() => normalizeClmsManifest(fixture)).toThrow(/official product band path/);
  });

  it("requires checksum provenance for every staged asset", () => {
    const fixture = manifestFixture();
    delete (fixture.ssm.assets.ssm as { checksum?: string }).checksum;
    expect(() => normalizeClmsManifest(fixture)).toThrow(/checksum provenance/);
  });

  it("decodes the MD5 multihash published by CDSE STAC", () => {
    const fixture = manifestFixture();
    fixture.swi.assets.swi005.checksum = "d501100123456789abcdef0123456789abcdef";
    delete (fixture.swi.assets.swi005 as { checksumAlgorithm?: string }).checksumAlgorithm;
    const normalized = normalizeClmsManifest(fixture);
    expect(normalized.source_assets.swi.swi005).toMatchObject({
      checksum: "0123456789abcdef0123456789abcdef",
      checksumAlgorithm: "MD5",
    });
  });

  it("decodes percent bands without ever scaling embedded flags", () => {
    expect(decodeClmsPercent(120)).toBe(60);
    expect(decodeClmsPercent(241)).toBeUndefined();
    expect(clmsFlagMeaning(253, "ssm")).toBe("slope-mask");
    expect(clmsFlagMeaning(254, "swi")).toBe("low-quality-flag");
  });

  it("keeps SSF as an unscaled categorical integer", () => {
    expect(decodeClmsSurfaceState(0)).toBe("unfrozen-nominal");
    expect(decodeClmsSurfaceState(1)).toBe("frozen");
    expect(decodeClmsSurfaceState(2)).toBe("thawing");
    expect(decodeClmsSurfaceState(3)).toBe("frozen-with-snow-cover");
    expect(decodeClmsSurfaceState(4)).toBe("wet-snow");
    expect(decodeClmsSurfaceState(255)).toBeUndefined();
  });

  it("exposes explicitly named relative shadow values, not volumetric moisture fields", () => {
    const sample = normalizeClmsSample(sampleFixture());
    const values = clmsShadowValues(sample);

    expect(values.surfaceSoilMoisturePercent).toBe(50);
    expect(values.soilWaterIndexT5Percent).toBe(60);
    expect(values.soilWaterIndexT5QualityPercent).toBe(75);
    expect(values.surfaceState).toBe("unfrozen-nominal");
    expect(values.soilWaterIndexT5Status).toBe("usable");
    expect(values.nativeResolutionM).toBe(1000);
    expect(values.samplingSpacingM).toBe(2500);
    expect(values).not.toHaveProperty("soilMoisture");
    expect(values).not.toHaveProperty("soilMoistureAvg7d");
  });

  it("withholds masked measurements and limits non-unfrozen SWI", () => {
    const masked = normalizeClmsSample({
      ...sampleFixture(),
      ssmDn: 253,
      swi005Dn: 254,
    });
    expect(masked.ssm_status).toBe("unavailable");
    expect(masked.swi_t5_status).toBe("unavailable");

    const frozen = normalizeClmsSample({ ...sampleFixture(), ssfDn: 1 });
    expect(frozen.swi_t5_status).toBe("limited");
    expect(clmsShadowValues(frozen).surfaceState).toBe("frozen");
  });

  it("preserves embedded QFLAG masks without scaling or failing the batch", () => {
    const masked = normalizeClmsSample({ ...sampleFixture(), qflag005Dn: 253 });
    expect(masked.qflag_005_dn).toBe(253);
    expect(masked.swi_t5_status).toBe("unavailable");
    expect(clmsShadowValues(masked).soilWaterIndexT5QualityPercent).toBeUndefined();
  });

  it("rejects undocumented raw codes rather than clamping them", () => {
    expect(() => normalizeClmsSample({ ...sampleFixture(), swi005Dn: 243 })).toThrow(/unsupported DN/);
  });

  it("normalizes bounded resumable batches", () => {
    const normalized = normalizeClmsImport({
      manifest: manifestFixture(),
      samples: [sampleFixture()],
      batchIndex: 0,
      batchCount: 1,
      expectedSamples: 1,
    });
    expect(normalized.samples).toHaveLength(1);
    expect(normalized.samples[0].swi_t5_status).toBe("usable");
  });
});
