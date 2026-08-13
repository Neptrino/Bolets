import { describe, expect, it } from "vitest";
import { geologicalSubstrateEvidence } from "@/supabase/functions/_shared/geology";

const base = {
  cell_id: "epsg25831:250:1:1",
  silicic_percent: 76,
  calcareous_percent: 20,
  mixed_percent: 0,
  unconsolidated_percent: 0,
  unknown_percent: 4,
  mapped_percent: 100,
  dominant_unit_code: "Ggd",
  dominant_unit_description: "Granodiorites",
  dominant_unit_coverage_percent: 64,
  source_id: "icgc-geology-50k-v3",
  scale_denominator: 50_000,
};

describe("compact ICGC geology materialization", () => {
  it("materializes a dominant exact-cell class and unit", () => {
    expect(geologicalSubstrateEvidence(base, 250)).toEqual({
      class: "silicic",
      dominantCoverage: 0.76,
      mappedCoverage: 1,
      sourceId: "icgc-geology-50k-v3",
      mapScaleDenominator: 50_000,
      dominantUnitCode: "Ggd",
      dominantUnitDescription: "Granodiorites",
      dominantUnitCoverage: 0.64,
    });
  });

  it("reports an area-weighted coarse contact as mixed", () => {
    expect(geologicalSubstrateEvidence({
      ...base,
      silicic_percent: 55,
      calcareous_percent: 45,
      unknown_percent: 0,
      dominant_unit_code: null,
      dominant_unit_coverage_percent: null,
    }, 5_000)).toEqual({
      class: "mixed",
      dominantCoverage: 1,
      mappedCoverage: 1,
      sourceId: "icgc-geology-50k-v3",
      mapScaleDenominator: 50_000,
      aggregationBaseM: 250,
    });
  });

  it("distinguishes mapped-but-unclassified evidence from absence", () => {
    expect(geologicalSubstrateEvidence({
      ...base,
      silicic_percent: 0,
      calcareous_percent: 0,
      unknown_percent: 100,
      dominant_unit_code: "Bv",
      dominant_unit_description: "Basalts amb vacúols",
      dominant_unit_coverage_percent: 100,
    }, 250)?.class).toBe("unknown");
    expect(geologicalSubstrateEvidence(undefined, 250)).toBeUndefined();
    expect(geologicalSubstrateEvidence({ ...base, mapped_percent: 0 }, 250)).toBeUndefined();
  });

  it("rejects inconsistent percentages and provenance", () => {
    expect(geologicalSubstrateEvidence({ ...base, mapped_percent: 80 }, 250)).toBeUndefined();
    expect(geologicalSubstrateEvidence({ ...base, source_id: "other" }, 250)).toBeUndefined();
    expect(geologicalSubstrateEvidence({ ...base, scale_denominator: 250 }, 250)).toBeUndefined();
  });
});
