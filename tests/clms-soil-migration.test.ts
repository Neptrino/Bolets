import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260815133441_add_clms_soil_shadow.sql"),
  "utf8",
);
const importer = readFileSync(
  join(process.cwd(), "supabase", "functions", "import-clms-soil", "index.ts"),
  "utf8",
);
const config = readFileSync(join(process.cwd(), "supabase", "config.toml"), "utf8");

describe("CLMS soil shadow migration", () => {
  it("keeps satellite evidence in private side tables", () => {
    expect(migration).toContain("create table public.clms_soil_manifests");
    expect(migration).toContain("create table public.clms_soil_samples");
    expect(migration).toContain("alter table public.clms_soil_samples enable row level security");
    expect(migration).toContain("revoke all on table public.clms_soil_samples from public, anon, authenticated");
    expect(migration).toContain("grant select, insert, update, delete on table public.clms_soil_samples to service_role");
  });

  it("preserves native resolution separately from bounded sample spacing", () => {
    expect(migration).toContain("native_resolution_m smallint not null default 1000 check (native_resolution_m = 1000)");
    expect(migration).toContain("sampling_resolution_m smallint not null default 2500 check (sampling_resolution_m = 2500)");
    expect(migration).toContain("Raw CLMS uint8 samples at canonical 2.5 km atmosphere points");
  });

  it("stores raw quality bands and prevents generic SSF scaling", () => {
    expect(migration).toContain("swi_005_dn smallint not null");
    expect(migration).toContain("qflag_005_dn smallint not null");
    expect(migration).toContain("ssf_dn smallint not null check (ssf_dn between 0 and 4 or ssf_dn = 255)");
    expect(migration).toContain("SSF is an unscaled integer");
    expect(migration).toContain("qflag_005_dn in (241, 242, 251, 252, 253, 254, 255)");
  });

  it("records partial versus complete manifests explicitly", () => {
    expect(migration).toContain("expected_sample_count integer not null");
    expect(migration).toContain("imported_sample_count integer not null");
    expect(migration).toContain("completed_at timestamptz");
    expect(migration).toContain("create or replace function public.finalize_clms_soil_shadow");
    expect(importer).toContain('supabase.rpc("finalize_clms_soil_shadow"');
  });

  it("registers both products and a non-production ingestion stream", () => {
    expect(migration).toContain("'copernicus-clms-ssm-1km-v1'");
    expect(migration).toContain("'copernicus-clms-swi-1km-v2'");
    expect(migration).toContain("'spatial-soil-satellite'");
    expect(migration).toContain("'species-occurrences'");
    expect(migration).toContain("'retention'");
  });

  it("imports transactionally and bounds only the completed hot preview to four dates", () => {
    expect(migration).toContain("create or replace function public.upsert_clms_soil_shadow");
    expect(migration).toContain("order by older.snapshot_date desc");
    expect(migration).toContain("offset 4");
    expect(migration).toContain("where manifest.completed_at is not null");
    expect(migration).toContain("references public.clms_soil_manifests(snapshot_date) on delete cascade");
    expect(migration).toContain(
      "grant execute on function public.upsert_clms_soil_shadow(jsonb, jsonb, uuid, boolean, integer)",
    );
    expect(migration).toContain("grant execute on function public.finalize_clms_soil_shadow(date, integer)");
    expect(migration).toContain("CLMS product manifest changed after the first batch");
    expect(migration).toContain("CLMS snapshot is older than the four-date hot preview");
    expect(migration).not.toMatch(/as incoming\([\s\S]*?\)\s+incoming\s+join/);
    expect(migration).not.toContain("pg_catalog.coalesce");
  });

  it("binds every source pixel to its canonical atmosphere point", () => {
    expect(migration).toContain("point.requested_lat - incoming.source_pixel_lat");
    expect(migration).toContain("point.requested_lon - incoming.source_pixel_lon");
    expect(migration).toContain("1.0 / 224.0");
  });

  it("uses a JWT-protected, separately tokenized Edge importer", () => {
    expect(config).toMatch(/\[functions\.import-clms-soil\]\s+verify_jwt = true/);
    expect(importer).toContain('"x-clms-import-token"');
    expect(importer).toContain('"clms-soil-import"');
    expect(importer).toContain('"spatial-soil-satellite"');
    expect(importer).toContain("canonicalSampleCount");
    expect(importer).toContain("scoringEnabled: false");
  });

  it("does not connect the shadow stream to production publication", () => {
    expect(migration).not.toContain("refresh_spatial_level_conditions_after_ingestion");
    expect(migration).not.toMatch(/update\s+public\.weather_grid_points[\s\S]*soil_point_id/i);
    expect(importer).not.toContain("refreshSpatialLevelConditionsAfterIngestion");
  });
});
