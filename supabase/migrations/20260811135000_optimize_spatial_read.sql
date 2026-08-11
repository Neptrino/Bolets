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
    order by cells.cell_id
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
  from visible_cells cells
  join lateral (
    select current_snapshot.*
    from public.weather_grid_snapshots current_snapshot
    where current_snapshot.point_id = cells.weather_point_id
    order by current_snapshot.snapshot_date desc
    limit 1
  ) snapshot on true
  order by cells.cell_id;
$$;

revoke all on function public.read_latest_cell_environment(double precision, double precision, double precision, double precision, integer) from public, anon, authenticated;
grant execute on function public.read_latest_cell_environment(double precision, double precision, double precision, double precision, integer) to service_role;
