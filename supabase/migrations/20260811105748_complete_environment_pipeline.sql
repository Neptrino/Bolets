create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.pipeline_sources (
  source_id text primary key,
  title text not null,
  source_url text not null,
  source_kind text not null check (source_kind in ('weather', 'terrain', 'soil', 'land-cover')),
  native_resolution_m integer check (native_resolution_m > 0),
  refresh_cadence text not null,
  license text not null,
  enabled boolean not null default false,
  status text not null check (status in ('active', 'degraded', 'blocked', 'disabled')),
  status_detail text,
  checked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.pipeline_sources (
  source_id, title, source_url, source_kind, native_resolution_m,
  refresh_cadence, license, enabled, status, status_detail
) values
  ('open-meteo', 'Open-Meteo Forecast API', 'https://open-meteo.com/en/docs', 'weather', 9000, 'daily', 'CC BY 4.0', true, 'active', 'Batched regional and verified-cell weather ingestion.'),
  ('copernicus-dem', 'Copernicus DEM via Open-Meteo', 'https://open-meteo.com/en/docs/elevation-api', 'terrain', 90, 'static', 'Copernicus attribution required', true, 'active', 'Elevation is accepted through the verified spatial import pipeline.'),
  ('soilgrids', 'ISRIC SoilGrids 2.0', 'https://docs.isric.org/globaldata/soilgrids/', 'soil', 250, 'static', 'CC BY 4.0', false, 'blocked', 'The beta REST API is paused. Use a reviewed WCS/WebDAV bulk extract before enabling.'),
  ('icgc-land-cover', 'ICGC Cobertes del sòl 2024', 'https://geoserveis.icgc.cat/servei/catalunya/cobertes-sol/wms', 'land-cover', null, 'annual', 'CC BY 4.0', false, 'degraded', 'Bulk classification import is supported; automatic raster extraction still requires a reviewed GIS worker.')
on conflict (source_id) do update set
  title = excluded.title,
  source_url = excluded.source_url,
  native_resolution_m = excluded.native_resolution_m,
  refresh_cadence = excluded.refresh_cadence,
  license = excluded.license,
  enabled = excluded.enabled,
  status = excluded.status,
  status_detail = excluded.status_detail,
  checked_at = now(),
  updated_at = now();

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  pipeline text not null check (pipeline in ('regional-environment', 'spatial-environment', 'spatial-static-import', 'retention')),
  trigger_type text not null check (trigger_type in ('cron', 'manual', 'import')),
  status text not null check (status in ('running', 'succeeded', 'partial', 'failed', 'skipped')),
  snapshot_date date,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  rows_read integer not null default 0 check (rows_read >= 0),
  rows_written integer not null default 0 check (rows_written >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists ingestion_runs_pipeline_started_idx
  on public.ingestion_runs (pipeline, started_at desc);

create table if not exists public.pipeline_secrets (
  name text primary key,
  secret_hash text not null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now()
);

alter table public.environment_snapshots
  add column if not exists snapshot_date date;

update public.environment_snapshots
set snapshot_date = (observed_at at time zone 'UTC')::date
where snapshot_date is null;

delete from public.environment_snapshots existing
using (
  select id,
    row_number() over (partition by region_id, snapshot_date order by observed_at desc, created_at desc) as row_number
  from public.environment_snapshots
) duplicates
where existing.id = duplicates.id
  and duplicates.row_number > 1;

alter table public.environment_snapshots
  alter column snapshot_date set not null;

create unique index if not exists environment_snapshots_region_date_uidx
  on public.environment_snapshots (region_id, snapshot_date);

create table if not exists public.spatial_cells (
  cell_id text primary key,
  region_id text not null check (region_id in (
    'pirineus', 'prepirineus', 'catalunya-central', 'serralades-costeres',
    'serralades-prelitorals', 'emporda', 'montseny', 'ports',
    'muntanyes-interiors', 'altres'
  )),
  grid_size_m integer not null default 250 check (grid_size_m = 250),
  west double precision not null check (west between -180 and 180),
  south double precision not null check (south between -90 and 90),
  east double precision not null check (east between -180 and 180 and east > west),
  north double precision not null check (north between -90 and 90 and north > south),
  geom extensions.geometry(Polygon, 4326)
    generated always as (extensions.st_makeenvelope(west, south, east, north, 4326)) stored,
  static_values jsonb not null default '{}'::jsonb,
  static_sources text[] not null default '{}',
  source_resolution_m integer not null check (source_resolution_m > 0),
  confidence text not null check (confidence in ('high', 'moderate', 'limited', 'unknown')),
  static_verified boolean not null default false,
  source_observed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spatial_cells_geom_idx
  on public.spatial_cells using gist (geom);

create index if not exists spatial_cells_verified_cell_idx
  on public.spatial_cells (static_verified, cell_id)
  where static_verified;

create table if not exists public.cell_environment_snapshots (
  id uuid primary key default gen_random_uuid(),
  cell_id text not null references public.spatial_cells(cell_id) on delete cascade,
  snapshot_date date not null,
  observed_at timestamptz not null,
  sources text[] not null default '{}',
  source_resolution_m integer not null check (source_resolution_m > 0),
  confidence text not null check (confidence in ('high', 'moderate', 'limited', 'unknown')),
  stale boolean not null default false,
  unavailable_fields text[] not null default '{}',
  values jsonb not null default '{}'::jsonb,
  run_id uuid references public.ingestion_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (cell_id, snapshot_date)
);

create index if not exists cell_environment_cell_date_idx
  on public.cell_environment_snapshots (cell_id, snapshot_date desc);

create index if not exists cell_environment_date_cell_idx
  on public.cell_environment_snapshots (snapshot_date desc, cell_id);

create table if not exists public.pipeline_cursors (
  pipeline text primary key,
  snapshot_date date not null,
  last_cell_id text,
  updated_at timestamptz not null default now()
);

alter table public.prediction_cells
  add column if not exists model_version text not null default 'unknown',
  add column if not exists run_id uuid references public.ingestion_runs(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'prediction_cells_cell_id_fkey'
      and conrelid = 'public.prediction_cells'::regclass
  ) then
    alter table public.prediction_cells
      add constraint prediction_cells_cell_id_fkey
      foreign key (cell_id) references public.spatial_cells(cell_id) on delete cascade;
  end if;
end $$;

create index if not exists prediction_cells_cell_id_idx
  on public.prediction_cells (cell_id);

alter table public.pipeline_sources enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.pipeline_secrets enable row level security;
alter table public.spatial_cells enable row level security;
alter table public.cell_environment_snapshots enable row level security;
alter table public.pipeline_cursors enable row level security;

revoke all on table public.pipeline_sources from anon, authenticated;
revoke all on table public.ingestion_runs from anon, authenticated;
revoke all on table public.pipeline_secrets from anon, authenticated;
revoke all on table public.spatial_cells from anon, authenticated;
revoke all on table public.cell_environment_snapshots from anon, authenticated;
revoke all on table public.pipeline_cursors from anon, authenticated;

grant select, insert, update, delete on table public.pipeline_sources to service_role;
grant select, insert, update, delete on table public.ingestion_runs to service_role;
grant select, insert, update, delete on table public.pipeline_secrets to service_role;
grant select, insert, update, delete on table public.spatial_cells to service_role;
grant select, insert, update, delete on table public.cell_environment_snapshots to service_role;
grant select, insert, update, delete on table public.pipeline_cursors to service_role;

create or replace function public.read_latest_cell_environment(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_limit integer default 1000
)
returns table (
  cell_id text,
  region_id text,
  west double precision,
  south double precision,
  east double precision,
  north double precision,
  grid_size_m integer,
  observed_at timestamptz,
  sources text[],
  source_resolution_m integer,
  confidence text,
  stale boolean,
  unavailable_fields text[],
  "values" jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    cells.cell_id,
    cells.region_id,
    cells.west,
    cells.south,
    cells.east,
    cells.north,
    cells.grid_size_m,
    snapshot.observed_at,
    snapshot.sources,
    greatest(cells.source_resolution_m, snapshot.source_resolution_m) as source_resolution_m,
    case
      when cells.confidence in ('limited', 'unknown') then cells.confidence
      else snapshot.confidence
    end as confidence,
    snapshot.stale or snapshot.observed_at < now() - interval '36 hours' as stale,
    snapshot.unavailable_fields,
    cells.static_values || snapshot.values as "values"
  from public.spatial_cells cells
  join lateral (
    select current_snapshot.*
    from public.cell_environment_snapshots current_snapshot
    where current_snapshot.cell_id = cells.cell_id
    order by current_snapshot.snapshot_date desc
    limit 1
  ) snapshot on true
  where cells.static_verified
    and cells.geom operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
  order by cells.cell_id
  limit least(greatest(p_limit, 1), 1000);
$$;

revoke all on function public.read_latest_cell_environment(double precision, double precision, double precision, double precision, integer) from public, anon, authenticated;
grant execute on function public.read_latest_cell_environment(double precision, double precision, double precision, double precision, integer) to service_role;

do $$
declare
  ingestion_token text;
begin
  select decrypted_secret
  into ingestion_token
  from vault.decrypted_secrets
  where name = 'bolets_ingestion_token';

  if ingestion_token is null then
    ingestion_token := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(ingestion_token, 'bolets_ingestion_token', 'Authorizes scheduled Bolets ingestion functions');
  end if;

  insert into public.pipeline_secrets (name, secret_hash)
  values ('ingestion', encode(extensions.digest(ingestion_token, 'sha256'), 'hex'))
  on conflict (name) do update set
    secret_hash = excluded.secret_hash,
    rotated_at = now();
end $$;

select cron.unschedule(jobid)
from cron.job
where jobname in ('refresh-environment-daily', 'refresh-spatial-environment', 'bolets-pipeline-retention');

select cron.schedule(
  'refresh-environment-daily',
  '15 5 * * *',
  $schedule$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/refresh-environment',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'x-ingestion-token', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')
      ),
      body := '{"trigger":"cron"}'::jsonb,
      timeout_milliseconds := 30000
    );
  $schedule$
);

select cron.schedule(
  'refresh-spatial-environment',
  '*/2 * * * *',
  $schedule$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/refresh-spatial-environment',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'x-ingestion-token', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')
      ),
      body := '{"trigger":"cron"}'::jsonb,
      timeout_milliseconds := 120000
    );
  $schedule$
);

select cron.schedule(
  'bolets-pipeline-retention',
  '30 6 * * *',
  $schedule$
    delete from public.environment_snapshots where snapshot_date < current_date - 45;
    delete from public.cell_environment_snapshots where snapshot_date < current_date - 7;
    delete from public.ingestion_runs where started_at < now() - interval '90 days';
  $schedule$
);

comment on table public.spatial_cells is
  'Verified 250 m model cells. These are environmental model units and never mushroom observation locations.';

comment on table public.cell_environment_snapshots is
  'Daily normalized weather joined to verified static cell evidence with provenance and explicit unavailable fields.';
