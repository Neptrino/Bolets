create table if not exists public.weather_grid_points (
  point_id text primary key,
  provider text not null check (provider in ('open-meteo')),
  requested_lat real not null check (requested_lat between -90 and 90),
  requested_lon real not null check (requested_lon between -180 and 180),
  native_resolution_m integer not null check (native_resolution_m > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists weather_grid_provider_coordinate_uidx
  on public.weather_grid_points (provider, requested_lat, requested_lon);

create table if not exists public.weather_grid_snapshots (
  id uuid primary key default gen_random_uuid(),
  point_id text not null references public.weather_grid_points(point_id) on delete cascade,
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
  unique (point_id, snapshot_date)
);

create index if not exists weather_grid_snapshots_point_date_idx
  on public.weather_grid_snapshots (point_id, snapshot_date desc);

create index if not exists weather_grid_snapshots_date_idx
  on public.weather_grid_snapshots (snapshot_date desc);

alter table public.spatial_cells
  add column if not exists weather_point_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'spatial_cells_weather_point_id_fkey'
      and conrelid = 'public.spatial_cells'::regclass
  ) then
    alter table public.spatial_cells
      add constraint spatial_cells_weather_point_id_fkey
      foreign key (weather_point_id) references public.weather_grid_points(point_id) on delete restrict;
  end if;
end $$;

create index if not exists spatial_cells_weather_point_idx
  on public.spatial_cells (weather_point_id)
  where weather_point_id is not null;

alter table public.weather_grid_points enable row level security;
alter table public.weather_grid_snapshots enable row level security;

revoke all on table public.weather_grid_points from anon, authenticated;
revoke all on table public.weather_grid_snapshots from anon, authenticated;
grant select, insert, update, delete on table public.weather_grid_points to service_role;
grant select, insert, update, delete on table public.weather_grid_snapshots to service_role;

insert into public.pipeline_sources (
  source_id, title, source_url, source_kind, native_resolution_m,
  refresh_cadence, license, enabled, status, status_detail
) values
  ('icgc-terrain', 'ICGC Model d’Elevacions del Terreny', 'https://geoserveis.icgc.cat/icc_mdt/wcs/service', 'terrain', 5, 'static', 'CC BY 4.0', true, 'active', 'The reviewed offline worker samples the official 5/15 m WCS for each 250 m model cell.'),
  ('soilgrids', 'ISRIC SoilGrids 2.0 WCS', 'https://maps.isric.org/mapserv', 'soil', 250, 'static', 'CC BY 4.0', true, 'active', 'The reviewed offline worker reads pH and texture fractions from WCS subsets.'),
  ('icgc-land-cover', 'ICGC Cobertes del sòl 2024', 'https://geoserveis.icgc.cat/servei/catalunya/cobertes-sol/wms', 'land-cover', 1, 'annual', 'CC BY 4.0', true, 'active', 'The reviewed offline worker aggregates the categorical raster into 250 m model cells.')
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
    cells.static_sources || snapshot.sources,
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
    from public.weather_grid_snapshots current_snapshot
    where current_snapshot.point_id = cells.weather_point_id
    order by current_snapshot.snapshot_date desc
    limit 1
  ) snapshot on true
  where cells.static_verified
    and cells.weather_point_id is not null
    and cells.geom operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
  order by cells.cell_id
  limit least(greatest(p_limit, 1), 1000);
$$;

revoke all on function public.read_latest_cell_environment(double precision, double precision, double precision, double precision, integer) from public, anon, authenticated;
grant execute on function public.read_latest_cell_environment(double precision, double precision, double precision, double precision, integer) to service_role;

delete from public.pipeline_cursors where pipeline = 'spatial-environment';

select cron.unschedule(jobid)
from cron.job
where jobname = 'bolets-pipeline-retention';

select cron.schedule(
  'bolets-pipeline-retention',
  '30 6 * * *',
  $schedule$
    delete from public.environment_snapshots where snapshot_date < current_date - 45;
    delete from public.cell_environment_snapshots where snapshot_date < current_date - 7;
    delete from public.weather_grid_snapshots where snapshot_date < current_date - 7;
    delete from public.ingestion_runs where started_at < now() - interval '90 days';
  $schedule$
);

comment on table public.weather_grid_points is
  'Provider-scale weather locations shared by many 250 m model cells; they prevent false meteorological precision and duplicate storage.';

comment on table public.weather_grid_snapshots is
  'Daily normalized weather at the provider grid scale with provenance, unavailable fields, and explicit source resolution.';
