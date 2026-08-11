alter table public.spatial_cells
  add column if not exists habitat_forest_types jsonb
    generated always as (
      case
        when jsonb_typeof(static_values -> 'forestTypes') = 'array'
          then static_values -> 'forestTypes'
        else '[]'::jsonb
      end
    ) stored,
  add column if not exists habitat_altitude_m double precision
    generated always as (
      case
        when jsonb_typeof(static_values -> 'altitudeM') = 'number'
          then (static_values ->> 'altitudeM')::double precision
        else null
      end
    ) stored,
  add column if not exists habitat_soil_ph double precision
    generated always as (
      case
        when jsonb_typeof(static_values -> 'soilPh') = 'number'
          then (static_values ->> 'soilPh')::double precision
        else null
      end
    ) stored;

create index if not exists spatial_cells_habitat_forest_idx
  on public.spatial_cells using gin (habitat_forest_types)
  where static_verified;

create index if not exists spatial_cells_habitat_ranges_v2_idx
  on public.spatial_cells (habitat_altitude_m, habitat_soil_ph)
  where static_verified;

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
    where cells.static_verified
      and cells.geom operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
      and cells.habitat_forest_types ?| p_forest_terms
      and cells.habitat_altitude_m between p_altitude_min and p_altitude_max
      and (p_ph_min is null or cells.habitat_soil_ph >= p_ph_min)
      and (p_ph_max is null or cells.habitat_soil_ph <= p_ph_max)
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
      least(
        1::double precision,
        grouped.eligible_cell_count::double precision / power(p_grid_size_m / 250, 2)
      ) as coverage,
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

comment on function public.read_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) is 'Returns exact verified 250 m potential-habitat matches and coverage-weighted coarse cells using indexed ecology columns generated from the canonical static evidence.';
