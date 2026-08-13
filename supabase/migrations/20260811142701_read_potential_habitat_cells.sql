-- The first habitat reader below uses the materialized level table. Define it
-- here so a clean migration replay does not depend on a table that was only
-- introduced by the later level-population migration.
create table if not exists public.spatial_cell_levels (
  cell_id text primary key,
  region_id text not null check (region_id in (
    'pirineus', 'prepirineus', 'catalunya-central', 'serralades-costeres',
    'serralades-prelitorals', 'emporda', 'montseny', 'ports',
    'muntanyes-interiors', 'altres'
  )),
  grid_size_m integer not null check (grid_size_m in (500, 1000, 2500, 5000, 10000)),
  west double precision not null,
  south double precision not null,
  east double precision not null,
  north double precision not null,
  geom extensions.geometry(Polygon, 4326)
    generated always as (extensions.st_makeenvelope(west, south, east, north, 4326)) stored,
  static_values jsonb not null default '{}'::jsonb,
  static_sources text[] not null default '{}',
  source_resolution_m integer not null check (source_resolution_m > 0),
  confidence text not null check (confidence in ('high', 'moderate', 'limited', 'unknown')),
  weather_point_ids text[] not null,
  soil_point_ids text[] not null,
  base_cell_count integer not null check (base_cell_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spatial_cell_levels_geom_idx
  on public.spatial_cell_levels using gist (geom);

create index if not exists spatial_cell_levels_size_cell_idx
  on public.spatial_cell_levels (grid_size_m, cell_id);

alter table public.spatial_cell_levels enable row level security;
revoke all on table public.spatial_cell_levels from anon, authenticated;
grant select, insert, update, delete on table public.spatial_cell_levels to service_role;

create index if not exists spatial_cells_forest_types_gin_idx
  on public.spatial_cells using gin ((static_values -> 'forestTypes'))
  where static_verified;

create index if not exists spatial_cells_habitat_ranges_idx
  on public.spatial_cells (
    ((static_values ->> 'altitudeM')::double precision),
    ((static_values ->> 'soilPh')::double precision)
  )
  where static_verified;

create index if not exists spatial_cell_levels_500_forest_types_gin_idx
  on public.spatial_cell_levels using gin ((static_values -> 'forestTypes'))
  where grid_size_m = 500;

create index if not exists spatial_cell_levels_500_habitat_ranges_idx
  on public.spatial_cell_levels (
    ((static_values ->> 'altitudeM')::double precision),
    ((static_values ->> 'soilPh')::double precision)
  )
  where grid_size_m = 500;

create or replace function public.read_potential_habitat_cells(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_grid_size_m integer,
  p_forest_terms text[],
  p_altitude_min double precision,
  p_altitude_max double precision,
  p_ph_min double precision default null,
  p_ph_max double precision default null,
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
  coverage double precision,
  eligible_cell_count integer,
  source_resolution_m integer,
  confidence text,
  sources text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  with eligible_base as materialized (
    select
      cells.cell_id,
      cells.region_id,
      cells.grid_size_m,
      cells.west,
      cells.south,
      cells.east,
      cells.north,
      cells.source_resolution_m,
      cells.confidence,
      cells.static_sources,
      split_part(cells.cell_id, ':', 3)::integer / greatest(p_grid_size_m / 250, 1) as bucket_x,
      split_part(cells.cell_id, ':', 4)::integer / greatest(p_grid_size_m / 250, 1) as bucket_y
    from public.spatial_cells cells
    where p_grid_size_m = 250
      and cells.static_verified
      and cells.geom operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
      and (cells.static_values -> 'forestTypes') ?| p_forest_terms
      and nullif(cells.static_values ->> 'altitudeM', '')::double precision between p_altitude_min and p_altitude_max
      and (p_ph_min is null or nullif(cells.static_values ->> 'soilPh', '')::double precision >= p_ph_min)
      and (p_ph_max is null or nullif(cells.static_values ->> 'soilPh', '')::double precision <= p_ph_max)

    union all

    select
      levels.cell_id,
      levels.region_id,
      levels.grid_size_m,
      levels.west,
      levels.south,
      levels.east,
      levels.north,
      levels.source_resolution_m,
      levels.confidence,
      levels.static_sources,
      split_part(levels.cell_id, ':', 3)::integer / greatest(p_grid_size_m / 500, 1) as bucket_x,
      split_part(levels.cell_id, ':', 4)::integer / greatest(p_grid_size_m / 500, 1) as bucket_y
    from public.spatial_cell_levels levels
    where p_grid_size_m in (500, 1000, 2500, 5000, 10000)
      and levels.grid_size_m = 500
      and levels.geom operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
      and (levels.static_values -> 'forestTypes') ?| p_forest_terms
      and nullif(levels.static_values ->> 'altitudeM', '')::double precision between p_altitude_min and p_altitude_max
      and (p_ph_min is null or nullif(levels.static_values ->> 'soilPh', '')::double precision >= p_ph_min)
      and (p_ph_max is null or nullif(levels.static_values ->> 'soilPh', '')::double precision <= p_ph_max)
  ),
  grouped as materialized (
    select
      base.bucket_x,
      base.bucket_y,
      count(*)::integer as eligible_cell_count
    from eligible_base base
    group by base.bucket_x, base.bucket_y
  ),
  results as (
    select
      base.cell_id,
      base.region_id,
      base.west,
      base.south,
      base.east,
      base.north,
      base.grid_size_m,
      1::double precision as coverage,
      1 as eligible_cell_count,
      base.source_resolution_m,
      base.confidence,
      base.static_sources as sources
    from eligible_base base
    where p_grid_size_m = 250

    union all

    select
      levels.cell_id,
      levels.region_id,
      levels.west,
      levels.south,
      levels.east,
      levels.north,
      levels.grid_size_m,
      least(1::double precision, grouped.eligible_cell_count::double precision / power(p_grid_size_m / 500, 2)) as coverage,
      grouped.eligible_cell_count,
      levels.source_resolution_m,
      levels.confidence,
      levels.static_sources
    from grouped
    join public.spatial_cell_levels levels
      on levels.cell_id = 'epsg25831:' || p_grid_size_m || ':' || grouped.bucket_x || ':' || grouped.bucket_y
    where p_grid_size_m > 250
  )
  select *
  from results
  order by coverage desc, cell_id
  limit least(greatest(p_limit, 1), 1000);
$$;

revoke all on function public.read_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) from public, anon, authenticated;

grant execute on function public.read_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) to service_role;

comment on function public.read_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) is 'Returns zoom-adaptive potential habitat derived only from verified 250 m forest, elevation, and soil evidence. Cells are model habitat units, never mushroom observations.';
