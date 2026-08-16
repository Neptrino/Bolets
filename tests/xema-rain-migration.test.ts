import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260816083000_add_xema_station_rain_shadow.sql"),
  "utf8",
);
const importer = readFileSync(
  join(process.cwd(), "supabase", "functions", "import-xema-rain", "index.ts"),
  "utf8",
);
const config = readFileSync(join(process.cwd(), "supabase", "config.toml"), "utf8");

describe("XEMA station rain shadow migration", () => {
  it("keeps gauge evidence in private side tables", () => {
    expect(migration).toContain("create table public.xema_stations");
    expect(migration).toContain("create table public.xema_station_rain_hours");
    expect(migration).toContain("alter table public.xema_station_rain_hours enable row level security");
    expect(migration).toContain("revoke all on table public.xema_station_rain_hours from public, anon, authenticated");
    expect(migration).toContain("grant select, insert, update, delete on table public.xema_station_rain_hours to service_role");
  });

  it("records hour completeness instead of reading outages as dry hours", () => {
    expect(migration).toContain("sample_count smallint not null check (sample_count between 1 and 2)");
    expect(migration).toContain("precipitation_mm real not null check (precipitation_mm >= 0 and precipitation_mm <= 240)");
  });

  it("registers the source with its attribution licence and a shadow-only status", () => {
    expect(migration).toContain("'meteocat-xema-rain'");
    expect(migration).toContain("CC BY 4.0 (Meteocat / Dades Obertes de Catalunya)");
    expect(migration).toContain("'station-rain',");
    expect(migration).toContain("production rain windows remain on the model provider");
  });

  it("schedules the hourly import behind the provider latency with the ingestion token", () => {
    expect(migration).toContain("'import-xema-rain-hourly'");
    expect(migration).toContain("'50 * * * *'");
    expect(migration).toContain("/functions/v1/import-xema-rain");
    expect(migration).toContain("'x-ingestion-token', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')");
  });

  it("relaxes the cadence to three-hourly with a self-healing twelve-hour window", () => {
    const cadence = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260816200000_relax_xema_rain_cadence.sql"),
      "utf8",
    );
    expect(cadence).toContain("'import-xema-rain-3h'");
    expect(cadence).toContain("'50 2-23/3 * * *'");
    expect(cadence).toContain('"hours":12');
    expect(cadence).toContain("jobname = 'import-xema-rain-hourly'");
  });

  it("keeps the importer authenticated, bounded and outside production scoring", () => {
    expect(importer).toContain("verifyIngestionRequest");
    expect(importer).toContain('"station-rain"');
    expect(importer).toContain("XEMA_RETENTION_DAYS");
    expect(importer).toContain("scoringEnabled: false");
    expect(config).toContain("[functions.import-xema-rain]");
  });
});

describe("station-rain-v1 promotion", () => {
  const promotion = readFileSync(
    join(process.cwd(), "supabase", "migrations", "20260816180000_promote_station_rain_correction.sql"),
    "utf8",
  );
  const refresh = readFileSync(
    join(process.cwd(), "supabase", "functions", "refresh-spatial-environment", "index.ts"),
    "utf8",
  );

  it("serves the gauge matrix only to the service role, in provider-local hours", () => {
    expect(promotion).toContain("create or replace function public.get_xema_rain_matrix");
    expect(promotion).toContain("revoke all on function public.get_xema_rain_matrix(integer) from public, anon, authenticated");
    expect(promotion).toContain("grant execute on function public.get_xema_rain_matrix(integer) to service_role");
    expect(promotion).toContain("at time zone 'Europe/Madrid'");
    expect(promotion).toContain("h.sample_count = 2");
  });

  it("corrects past precipitation in the refresh while keeping AROME thermal fields", () => {
    expect(refresh).toContain("buildStationCorrectedPrecipitation");
    expect(refresh).toContain("get_xema_rain_matrix");
    expect(refresh).toContain('"models", "arome_france"');
    expect(refresh).toContain("meteofrance_seamless");
    expect(refresh).toContain("precipitationSource: STATION_RAIN_SOURCE_VERSION");
    expect(refresh).toContain("precipitationGaugeCoverage");
  });

  it("registers the seamless fallback source with attribution", () => {
    expect(promotion).toContain("'meteofrance-seamless-precipitation'");
    expect(promotion).toContain("station-rain-v1");
  });
});
