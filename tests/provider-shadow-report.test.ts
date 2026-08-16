import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { calculateSuitability } from "@/src/lib/scoring";
import {
  compareTerrainThermalSuitability,
  TERRAIN_THERMAL_PROVIDER_MODEL,
  TERRAIN_THERMAL_SOURCE_RESOLUTION_M,
  TERRAIN_THERMAL_WEATHER_MODEL,
  type TerrainThermalObservation,
} from "@/src/lib/terrain-thermal";
import type { ConditionSnapshot } from "@/src/lib/types";
import {
  assertClmsEvidenceMatchesCell,
  buildProviderShadowLocationReport,
  canonicalAtmospherePointIdForCell,
  CLMS_COMPARISON_EVIDENCE_VERSION,
  clmsComparisonEvidenceSha256,
  comparisonAppUrl,
  parseClmsComparisonEvidence,
  parsePrivateComparisonPoints,
} from "@/tests/helpers/provider-shadow-report";

const observedAt = "2026-08-15T01:00:00.000Z";

const values: ConditionSnapshot["values"] = {
  weatherObservedAt: observedAt,
  weatherModel: TERRAIN_THERMAL_WEATHER_MODEL,
  atmosphericResolutionM: TERRAIN_THERMAL_SOURCE_RESOLUTION_M,
  soilMoistureResolutionM: 9000,
  weatherGridLatitude: 41,
  weatherGridLongitude: 1,
  weatherElevationM: 900,
  altitudeM: 1200,
  habitatCoveragePercent: 80,
  habitatAltitudeSuitability: 100,
  soilTexture: "Franca",
  soilMoistureAvg7d: 0.24,
  soilMoistureMin7d: 0.22,
  temperatureAvg7dC: 21,
  relativeHumidityAvg7d: 74,
  drySpellDays: 2,
  rainfall21dMm: 42,
  rainfallDays21d: 6,
  evapotranspiration21dMm: 38,
  temperatureAvg14dC: 23,
  temperatureAvg20dC: 23,
  frostHours14d: 0,
  frostHours20d: 0,
  heatHours14d: 90,
  heatHours20d: 120,
};

const terrainValues: TerrainThermalObservation["values"] = {
  temperatureAvg14dC: 20,
  temperatureAvg20dC: 20,
  frostHours14d: 0,
  frostHours20d: 0,
  heatHours14d: 20,
  heatHours20d: 30,
};

function snapshot(): ConditionSnapshot {
  return {
    regionId: "pirineus",
    observedAt,
    source: ["Météo-France AROME", "Open-Meteo soil moisture"],
    confidence: "moderate",
    stale: false,
    unavailableFields: [],
    values,
  };
}

function observation(
  elevationM: number,
  thermal: TerrainThermalObservation["values"],
): TerrainThermalObservation {
  return {
    observedAt,
    providerModel: TERRAIN_THERMAL_PROVIDER_MODEL,
    weatherGridLatitude: 41,
    weatherGridLongitude: 1,
    requestedElevationM: elevationM,
    returnedElevationM: elevationM,
    sourceResolutionM: TERRAIN_THERMAL_SOURCE_RESOLUTION_M,
    values: thermal,
  };
}

function clmsSample(overrides: Record<string, unknown> = {}) {
  return {
    atmospherePointId: "open-meteo:arome-2500:100:100",
    sourcePixelLatitude: 41,
    sourcePixelLongitude: 1,
    ssmDn: 100,
    ssmNoiseDn: 20,
    swi002Dn: 110,
    qflag002Dn: 160,
    swi005Dn: 120,
    qflag005Dn: 150,
    swi010Dn: 130,
    qflag010Dn: 140,
    ssfDn: 0,
    ...overrides,
  };
}

function clmsAssets(
  kind: "ssm" | "swi",
  nominalToken: string,
  version: string,
  bands: Record<string, string>,
) {
  const productId = kind === "ssm"
    ? `c_gls_SSM1km_${nominalToken}_CEURO_S1CSAR_${version}_cog`
    : `c_gls_SWI1km_${nominalToken}_CEURO_SCATSAR_${version}_cog`;
  const root = kind === "ssm"
    ? "surface_soil_moisture/ssm_europe_1km_daily_v1"
    : "soil_water_index/swi_europe_1km_daily_v2";
  const family = kind === "ssm" ? "SSM" : "SWI";
  const sensor = kind === "ssm" ? "S1CSAR" : "SCATSAR";
  const datePath = `${nominalToken.slice(0, 4)}/${nominalToken.slice(4, 6)}/${nominalToken.slice(6, 8)}`;
  return Object.fromEntries(Object.entries(bands).map(([key, band], index) => [key, {
    href: `s3://eodata/CLMS/bio-geophysical/${root}/${datePath}/${productId}/` +
      `c_gls_${family}1km-${band}_${nominalToken}_CEURO_${sensor}_${version}.tiff`,
    checksum: String(index + 1).padStart(32, "0"),
    checksumAlgorithm: "MD5",
  }]));
}

function clmsManifest() {
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
      assets: clmsAssets("ssm", "202608130000", "V1.2.1", {
        ssm: "SSM",
        noise: "NOISE",
      }),
    },
    swi: {
      productId: "c_gls_SWI1km_202608131200_CEURO_SCATSAR_V2.1.1_cog",
      version: "V2.1.1",
      nominalAt: "2026-08-13T12:00:00Z",
      contentStart: "2026-08-12T12:00:01Z",
      contentEnd: "2026-08-13T12:00:00Z",
      publishedAt: "2026-08-14T02:00:00Z",
      assets: clmsAssets("swi", "202608131200", "V2.1.1", {
        swi002: "SWI002",
        qflag002: "QFLAG002",
        swi005: "SWI005",
        qflag005: "QFLAG005",
        swi010: "SWI010",
        qflag010: "QFLAG010",
        ssf: "SSF",
      }),
    },
  };
}

function clmsEnvelope(samples = [clmsSample()]) {
  const payload = {
    evidenceVersion: CLMS_COMPARISON_EVIDENCE_VERSION,
    manifest: clmsManifest(),
    completion: {
      complete: true,
      completedAt: "2026-08-14T03:00:00Z",
      expectedSampleCount: 1000,
      importedSampleCount: 1000,
      canonicalSampleCount: 1000,
    },
    samples,
  };
  return {
    ...payload,
    evidenceSha256: clmsComparisonEvidenceSha256(payload),
  };
}

function parsedClms(sample = clmsSample()) {
  return parseClmsComparisonEvidence(JSON.stringify(clmsEnvelope([sample])))[0];
}

function report(publishedOpportunityDelta = 0, clms = clmsSample()) {
  const species = getSpecies("suillus-luteus")!;
  const conditionSnapshot = snapshot();
  const productionReplay = calculateSuitability(species, conditionSnapshot);
  const terrainComparison = compareTerrainThermalSuitability(
    species,
    conditionSnapshot,
    {
      representative: observation(900, values),
      local: observation(1200, terrainValues),
    },
  );
  return buildProviderShadowLocationReport({
    location: 1,
    species,
    published: {
      opportunityIndex: productionReplay.opportunityIndex === null
        ? null
        : productionReplay.opportunityIndex + publishedOpportunityDelta,
      fruitingConditionsScore: productionReplay.fruitingConditionsScore,
      components: productionReplay.components,
    },
    productionReplay,
    terrainComparison,
    clms: clms ? parsedClms(clms) : undefined,
  });
}

describe("private provider shadow comparison report", () => {
  it("parses bounded private point input without adding identifiers", () => {
    expect(parsePrivateComparisonPoints(JSON.stringify([
      { latitude: 41, longitude: 1 },
      { latitude: 42, longitude: 2 },
    ]))).toEqual([
      { latitude: 41, longitude: 1 },
      { latitude: 42, longitude: 2 },
    ]);
    expect(() => parsePrivateComparisonPoints("[]")).toThrow(/1-20 points/);
    expect(() => parsePrivateComparisonPoints('[{"latitude":91,"longitude":1}]'))
      .toThrow(/coordinates are invalid/);
  });

  it("replays production, exposes only the validated terrain candidate, and leaves production unchanged", () => {
    const result = report();

    expect(result.production.status).toBe("reproduced");
    expect(result.production.published).toMatchObject({
      opportunityIndex: result.production.replayed.opportunityIndex,
      fruitingConditionsScore: result.production.replayed.fruitingConditionsScore,
    });
    expect(result.shadows.terrainThermal).toMatchObject({
      status: "diagnostic-candidate",
      revisedScore: null,
      productionScoreChanged: false,
      confidence: "limited",
    });
    expect(result.shadows.terrainThermal).toHaveProperty("diagnosticCandidate");
    expect(result.productionChanged).toBe(false);
  });

  it("withholds direct AROME and CLMS scores despite usable raw shadow evidence", () => {
    const result = report();

    expect(result.shadows.directArome).toMatchObject({
      status: "withheld",
      revisedScore: null,
      evidence: {
        nativeGridDegrees: 0.01,
        operationalArchiveDays: 5,
        requiredThermalHistoryDays: 20,
      },
    });
    expect(result.shadows.directArome.withholdingReasons).toContain(
      "insufficient-thermal-history",
    );
    expect(result.shadows.copernicusClms).toMatchObject({
      status: "withheld",
      revisedScore: null,
      evidence: {
        evidenceVersion: CLMS_COMPARISON_EVIDENCE_VERSION,
        snapshotDate: "2026-08-13",
        completion: {
          complete: true,
          expectedSampleCount: 1000,
          importedSampleCount: 1000,
          canonicalSampleCount: 1000,
        },
        provenance: {
          ssmProductVersion: "V1.2.1",
          swiProductVersion: "V2.1.1",
        },
        units: "relative-percent",
        surfaceSoilMoisturePercent: 50,
        soilWaterIndexT5Percent: 60,
        nativeResolutionM: 1000,
        samplingSpacingM: 2500,
      },
    });
    expect(result.shadows.copernicusClms.withholdingReasons).toContain(
      "relative-percent-units-not-production-volumetric-moisture",
    );
    expect(result.shadows.copernicusClms.withholdingReasons).toContain(
      "single-water-source-bridge-not-calibrated",
    );
    expect(JSON.stringify(result)).not.toContain("atmospherePointId");
    expect(JSON.stringify(result)).not.toContain("atmosphere_point_id");
    expect(JSON.stringify(result)).not.toContain("sourcePixelLatitude");
    expect(JSON.stringify(result)).not.toContain("source_pixel_lat");
  });

  it("withholds the terrain candidate when the local scorer does not reproduce publication", () => {
    const result = report(1);

    expect(result.production.status).toBe("mismatch");
    expect(result.shadows.terrainThermal).toEqual({
      provider: "Open-Meteo Météo-France AROME terrain sensitivity",
      status: "withheld",
      revisedScore: null,
      withholdingReasons: ["local-production-replay-mismatch"],
    });
  });

  it("preserves CLMS quality failures as additional withholding reasons", () => {
    const result = report(0, clmsSample({ ssmDn: 253, qflag005Dn: 254 }));

    expect(result.shadows.copernicusClms.withholdingReasons).toContain(
      "surface-soil-moisture-quality-unavailable",
    );
    expect(result.shadows.copernicusClms.withholdingReasons).toContain(
      "soil-water-index-quality-unavailable",
    );
  });

  it("cryptographically binds samples to a normalized complete CLMS manifest", () => {
    const envelope = clmsEnvelope();
    const evidence = parseClmsComparisonEvidence(JSON.stringify(envelope));
    expect(evidence).toHaveLength(1);
    expect(evidence[0].snapshotDate).toBe("2026-08-13");
    expect(evidence[0].manifestSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(evidence[0].evidenceSha256).toBe(envelope.evidenceSha256);

    const tampered = structuredClone(envelope);
    tampered.samples[0].ssmDn = 101;
    expect(() => parseClmsComparisonEvidence(JSON.stringify(tampered)))
      .toThrow(/SHA-256 does not match/);

    const partial = clmsEnvelope();
    partial.completion.importedSampleCount = 999;
    expect(() => parseClmsComparisonEvidence(JSON.stringify(partial)))
      .toThrow(/complete canonical atmosphere lattice/);
  });

  it("spatially binds CLMS evidence to the selected canonical weather point and pixel", () => {
    const evidence = parsedClms();
    const cell = {
      cellId: "epsg25831:250:1000:1000",
      gridSizeM: 250 as const,
      values,
    };
    expect(canonicalAtmospherePointIdForCell(cell.cellId, cell.gridSizeM))
      .toBe("open-meteo:arome-2500:100:100");
    expect(() => assertClmsEvidenceMatchesCell(evidence, cell)).not.toThrow();
    expect(() => assertClmsEvidenceMatchesCell(parsedClms(clmsSample({
      atmospherePointId: "open-meteo:arome-2500:101:100",
    })), cell)).toThrow(/canonical atmosphere point/);
    expect(() => assertClmsEvidenceMatchesCell(parsedClms(clmsSample({
      sourcePixelLatitude: 41.01,
    })), cell)).toThrow(/sample pixel/);
  });

  it("uses localhost by default and requires explicit remote comparison opt-in", () => {
    expect(comparisonAppUrl(undefined, false)).toBe("http://localhost:3101");
    expect(() => comparisonAppUrl("https://bolets.app", false)).toThrow(/explicit/);
    expect(comparisonAppUrl("https://bolets.app", true)).toBe("https://bolets.app");
  });
});
