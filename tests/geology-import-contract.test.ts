import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const importer = readFileSync(
  join(process.cwd(), "supabase/functions/import-spatial-cells/index.ts"),
  "utf8",
);

describe("display-only geology import contract", () => {
  it("uses dedicated service-only RPCs and never treats geology as soil readiness", () => {
    expect(importer).toContain('supabase.rpc("upsert_geology_units"');
    expect(importer).toContain('supabase.rpc("backfill_spatial_geology_evidence"');
    expect(importer).toContain('supabase.rpc("refresh_spatial_geology_level"');
    expect(importer).toContain('dataset: "icgc-geology-50k-v3"');

    const soilReadiness = importer
      .split("const soilReady =")[1]
      .split(";", 1)[0];
    expect(soilReadiness).toContain("soilPh");
    expect(soilReadiness).toContain("soilTexture");
    expect(soilReadiness).not.toContain("soilSubstrate");
    expect(soilReadiness).not.toContain("geolog");
  });

  it("validates all compact percentage lanes before reaching PostgreSQL", () => {
    expect(importer).toContain("classCoveragesPacked");
    expect(importer).toContain("mappedCoveragePercent");
    expect(importer).toContain("dominantUnitCoveragePercent");
    expect(importer).toContain("lanes.reduce");
    expect(importer).toContain("Incomplete dominant geology unit");
  });
});
