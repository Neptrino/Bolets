-- Restrict coarse habitat work to the exact 250 m cells belonging to visible
-- coarse cells before applying species filters. This lets the existing GiST
-- index read a few thousand local cells instead of scanning every matching
-- habitat cell in Catalonia.
create or replace function public.read_weighted_coarse_potential_habitat_cells(
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
  cell_id text, region_id text, west double precision, south double precision,
  east double precision, north double precision, grid_size_m integer,
  coverage double precision, altitude_weighted_coverage double precision,
  eligible_cell_count integer, source_resolution_m integer,
  confidence text, sources text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  with visible_levels as materialized (
    select
      levels.cell_id, levels.region_id, levels.west, levels.south, levels.east,
      levels.north, levels.grid_size_m, levels.source_resolution_m,
      levels.confidence, levels.static_sources
    from public.spatial_cell_levels levels
    where levels.grid_size_m = p_grid_size_m
      and levels.east >= p_west and levels.west <= p_east
      and levels.north >= p_south and levels.south <= p_north
  ),
  visible_extent as materialized (
    select
      min(levels.west) as west,
      min(levels.south) as south,
      max(levels.east) as east,
      max(levels.north) as north
    from visible_levels levels
  ),
  visible_base as materialized (
    select
      cells.cell_id,
      cells.habitat_cover_codes,
      cells.habitat_cover_shares,
      cells.habitat_forest_types,
      cells.habitat_altitude_m,
      cells.habitat_soil_ph
    from public.spatial_cells cells
    cross join visible_extent extent
    where cells.static_verified
      and extent.west is not null
      and cells.geom operator(extensions.&&) extensions.st_makeenvelope(
        extent.west, extent.south, extent.east, extent.north, 4326
      )
  ),
  coarse_grouped as materialized (
    select
      pg_catalog.split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) as bucket_x,
      pg_catalog.split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250) as bucket_y,
      count(*)::integer as eligible_cell_count,
      sum(cover.score) as compatible_cover_cell_count,
      sum(cover.score * altitude.score) as altitude_weighted_cell_count
    from visible_base cells
    join visible_levels levels on levels.cell_id =
      'epsg25831:' || p_grid_size_m || ':' ||
      pg_catalog.split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) || ':' ||
      pg_catalog.split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250)
    cross join lateral (
      select public.habitat_cover_weight_compact(
        cells.habitat_cover_codes,
        cells.habitat_cover_shares,
        cells.habitat_forest_types,
        p_forest_terms
      ) as score
    ) cover
    cross join lateral (
      select case
        when cells.habitat_altitude_m <= p_altitude_min - 100
          or cells.habitat_altitude_m >= p_altitude_max + 100 then 0::double precision
        when cells.habitat_altitude_m < p_altitude_min then
          0.75 * ((cells.habitat_altitude_m - (p_altitude_min - 100)) / 100)
        when cells.habitat_altitude_m < p_altitude_min
          + least(100::double precision, (p_altitude_max - p_altitude_min) / 2) then
          0.75 + 0.25 * ((cells.habitat_altitude_m - p_altitude_min)
            / least(100::double precision, (p_altitude_max - p_altitude_min) / 2))
        when cells.habitat_altitude_m <= p_altitude_max
          - least(100::double precision, (p_altitude_max - p_altitude_min) / 2) then 1::double precision
        when cells.habitat_altitude_m <= p_altitude_max then
          0.75 + 0.25 * ((p_altitude_max - cells.habitat_altitude_m)
            / least(100::double precision, (p_altitude_max - p_altitude_min) / 2))
        else 0.75 * (((p_altitude_max + 100) - cells.habitat_altitude_m) / 100)
      end as score
    ) altitude
    where cells.habitat_forest_types ?| p_forest_terms
      and cells.habitat_altitude_m > p_altitude_min - 100
      and cells.habitat_altitude_m < p_altitude_max + 100
      and cover.score > 0
      and (p_ph_min is null or cells.habitat_soil_ph >= p_ph_min)
      and (p_ph_max is null or cells.habitat_soil_ph <= p_ph_max)
    group by 1, 2
  )
  select
    levels.cell_id, levels.region_id, levels.west, levels.south, levels.east,
    levels.north, levels.grid_size_m,
    least(1::double precision,
      grouped.compatible_cover_cell_count / power(p_grid_size_m / 250, 2)),
    least(1::double precision,
      grouped.altitude_weighted_cell_count / power(p_grid_size_m / 250, 2)),
    grouped.eligible_cell_count, levels.source_resolution_m, levels.confidence,
    levels.static_sources
  from coarse_grouped grouped
  join visible_levels levels on levels.cell_id =
    'epsg25831:' || p_grid_size_m || ':' || grouped.bucket_x || ':' || grouped.bucket_y
  order by 9 desc, levels.cell_id
  limit least(greatest(p_limit, 1), 1000);
$$;

revoke all on function public.read_weighted_coarse_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision,
  double precision, double precision, integer
) from public, anon, authenticated;

grant execute on function public.read_weighted_coarse_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision,
  double precision, double precision, integer
) to service_role;
