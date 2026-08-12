-- Coarse habitat requests only need the base-cell id and ecological gates while
-- counting compatible 250 m cells. Keeping those values in the range index lets
-- stable static grids use an index-only scan instead of fetching wide rows.
create index if not exists spatial_cells_habitat_ranges_covering_idx
  on public.spatial_cells (habitat_altitude_m, habitat_soil_ph)
  include (cell_id, habitat_forest_types)
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
  with visible_levels as materialized (
    select
      levels.cell_id,
      levels.region_id,
      levels.west,
      levels.south,
      levels.east,
      levels.north,
      levels.grid_size_m,
      levels.source_resolution_m,
      levels.confidence,
      levels.static_sources
    from public.spatial_cell_levels levels
    where p_grid_size_m > 250
      and levels.grid_size_m = p_grid_size_m
      and levels.geom operator(extensions.&&) extensions.st_makeenvelope(
        p_west,
        p_south,
        p_east,
        p_north,
        4326
      )
  ),
  exact_cells as materialized (
    select
      cells.cell_id,
      cells.region_id,
      cells.west,
      cells.south,
      cells.east,
      cells.north,
      cells.grid_size_m,
      1::double precision as coverage,
      1 as eligible_cell_count,
      cells.source_resolution_m,
      cells.confidence,
      cells.static_sources as sources
    from public.spatial_cells cells
    where p_grid_size_m = 250
      and cells.static_verified
      and cells.geom operator(extensions.&&) extensions.st_makeenvelope(
        p_west,
        p_south,
        p_east,
        p_north,
        4326
      )
      and cells.habitat_forest_types ?| p_forest_terms
      and cells.habitat_altitude_m between p_altitude_min and p_altitude_max
      and (p_ph_min is null or cells.habitat_soil_ph >= p_ph_min)
      and (p_ph_max is null or cells.habitat_soil_ph <= p_ph_max)
  ),
  coarse_grouped as materialized (
    select
      split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) as bucket_x,
      split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250) as bucket_y,
      count(*)::integer as eligible_cell_count
    from public.spatial_cells cells
    join visible_levels levels
      on levels.cell_id =
        'epsg25831:' || p_grid_size_m || ':' ||
        split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) || ':' ||
        split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250)
    where p_grid_size_m > 250
      and cells.static_verified
      and cells.habitat_forest_types ?| p_forest_terms
      and cells.habitat_altitude_m between p_altitude_min and p_altitude_max
      and (p_ph_min is null or cells.habitat_soil_ph >= p_ph_min)
      and (p_ph_max is null or cells.habitat_soil_ph <= p_ph_max)
    group by 1, 2
  ),
  results as (
    select *
    from exact_cells

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
      levels.static_sources as sources
    from coarse_grouped grouped
    join visible_levels levels
      on levels.cell_id =
        'epsg25831:' || p_grid_size_m || ':' || grouped.bucket_x || ':' || grouped.bucket_y
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
) is 'Returns exact verified 250 m habitat cells and viewport-stable coarse coverage without materializing wide base-cell rows for large areas.';
