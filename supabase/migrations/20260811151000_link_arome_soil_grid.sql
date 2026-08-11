alter table public.weather_grid_points
  add column if not exists soil_point_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'weather_grid_points_soil_point_id_fkey'
      and conrelid = 'public.weather_grid_points'::regclass
  ) then
    alter table public.weather_grid_points
      add constraint weather_grid_points_soil_point_id_fkey
      foreign key (soil_point_id)
      references public.weather_grid_points(point_id)
      on delete restrict;
  end if;
end $$;

create index if not exists weather_grid_points_soil_point_idx
  on public.weather_grid_points (soil_point_id)
  where soil_point_id is not null;

update public.weather_grid_points as atmospheric
set
  soil_point_id = (
    select soil.point_id
    from public.weather_grid_points as soil
    where soil.model = 'best_match'
    order by
      power(soil.requested_lat - atmospheric.requested_lat, 2) +
      power((soil.requested_lon - atmospheric.requested_lon) * cos(radians(atmospheric.requested_lat)), 2)
    limit 1
  ),
  updated_at = now()
where atmospheric.model = 'arome_france';

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
  with visible_cells as materialized (
    select cells.*
    from public.spatial_cells cells
    where cells.static_verified
      and cells.weather_point_id is not null
      and cells.geom operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
    order by cells.geom operator(extensions.<->) extensions.st_setsrid(
      extensions.st_makepoint((p_west + p_east) / 2, (p_south + p_north) / 2),
      4326
    )
    limit least(greatest(p_limit, 1), 1000)
  )
  select
    cells.cell_id,
    cells.region_id,
    cells.west,
    cells.south,
    cells.east,
    cells.north,
    cells.grid_size_m,
    greatest(atmosphere_snapshot.observed_at, soil_snapshot.observed_at),
    cells.static_sources || coalesce(soil_snapshot.sources, '{}'::text[]) || atmosphere_snapshot.sources,
    greatest(cells.source_resolution_m, atmosphere_snapshot.source_resolution_m),
    case
      when cells.confidence in ('limited', 'unknown') then cells.confidence
      when atmosphere_snapshot.confidence in ('limited', 'unknown') then atmosphere_snapshot.confidence
      when soil_snapshot.confidence in ('limited', 'unknown') then soil_snapshot.confidence
      else atmosphere_snapshot.confidence
    end,
    atmosphere_snapshot.stale
      or atmosphere_snapshot.observed_at < now() - interval '36 hours'
      or coalesce(soil_snapshot.stale or soil_snapshot.observed_at < now() - interval '36 hours', false),
    atmosphere_snapshot.unavailable_fields || coalesce(soil_snapshot.unavailable_fields, '{}'::text[]),
    cells.static_values || coalesce(soil_snapshot.values, '{}'::jsonb) || atmosphere_snapshot.values
  from visible_cells cells
  join public.weather_grid_points atmosphere_point
    on atmosphere_point.point_id = cells.weather_point_id
  join lateral (
    select current_snapshot.*
    from public.weather_grid_snapshots current_snapshot
    where current_snapshot.point_id = atmosphere_point.point_id
    order by current_snapshot.snapshot_date desc
    limit 1
  ) atmosphere_snapshot on true
  left join lateral (
    select current_snapshot.*
    from public.weather_grid_snapshots current_snapshot
    where current_snapshot.point_id = atmosphere_point.soil_point_id
    order by current_snapshot.snapshot_date desc
    limit 1
  ) soil_snapshot on true
  order by cells.cell_id;
$$;

revoke all on function public.read_latest_cell_environment(double precision, double precision, double precision, double precision, integer) from public, anon, authenticated;
grant execute on function public.read_latest_cell_environment(double precision, double precision, double precision, double precision, integer) to service_role;

delete from public.pipeline_cursors where pipeline = 'spatial-environment';

comment on column public.weather_grid_points.soil_point_id is
  'Optional link from a high-resolution atmospheric point to the coarser shared soil-moisture point used by the scoring model.';
