create or replace function public.habitat_altitude_weight(
  p_altitude_m double precision,
  p_core_min_m double precision,
  p_core_max_m double precision
)
returns double precision
language sql
immutable
strict
parallel safe
security invoker
set search_path = ''
as $$
  select case
    when p_core_max_m <= p_core_min_m then 0::double precision
    when p_altitude_m <= p_core_min_m - 100 or p_altitude_m >= p_core_max_m + 100 then 0::double precision
    when p_altitude_m < p_core_min_m then
      0.75 * ((p_altitude_m - (p_core_min_m - 100)) / 100)
    when p_altitude_m < p_core_min_m + least(100::double precision, (p_core_max_m - p_core_min_m) / 2) then
      0.75 + 0.25 * (
        (p_altitude_m - p_core_min_m) /
        least(100::double precision, (p_core_max_m - p_core_min_m) / 2)
      )
    when p_altitude_m <= p_core_max_m - least(100::double precision, (p_core_max_m - p_core_min_m) / 2) then
      1::double precision
    when p_altitude_m <= p_core_max_m then
      0.75 + 0.25 * (
        (p_core_max_m - p_altitude_m) /
        least(100::double precision, (p_core_max_m - p_core_min_m) / 2)
      )
    else
      0.75 * (((p_core_max_m + 100) - p_altitude_m) / 100)
  end;
$$;

create or replace function public.read_weighted_potential_habitat_cells(
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
  altitude_weighted_coverage double precision,
  eligible_cell_count integer,
  source_resolution_m integer,
  confidence text,
  sources text[]
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_grid_size_m = 250 then
    return query
    select
      cells.cell_id,
      cells.region_id,
      cells.west,
      cells.south,
      cells.east,
      cells.north,
      cells.grid_size_m,
      1::double precision as coverage,
      altitude.score as altitude_weighted_coverage,
      1 as eligible_cell_count,
      cells.source_resolution_m,
      cells.confidence,
      cells.static_sources as sources
    from public.spatial_cells cells
    cross join lateral (
      select public.habitat_altitude_weight(
        cells.habitat_altitude_m,
        p_altitude_min,
        p_altitude_max
      ) as score
    ) altitude
    where cells.static_verified
      and cells.geom operator(extensions.&&) extensions.st_makeenvelope(
        p_west,
        p_south,
        p_east,
        p_north,
        4326
      )
      and cells.habitat_forest_types ?| p_forest_terms
      and cells.habitat_altitude_m > p_altitude_min - 100
      and cells.habitat_altitude_m < p_altitude_max + 100
      and altitude.score > 0
      and (p_ph_min is null or cells.habitat_soil_ph >= p_ph_min)
      and (p_ph_max is null or cells.habitat_soil_ph <= p_ph_max)
    order by cells.cell_id
    limit least(greatest(p_limit, 1), 1000);

    return;
  end if;

  return query
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
    where levels.grid_size_m = p_grid_size_m
      and levels.geom operator(extensions.&&) extensions.st_makeenvelope(
        p_west,
        p_south,
        p_east,
        p_north,
        4326
      )
  ),
  coarse_grouped as materialized (
    select
      split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) as bucket_x,
      split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250) as bucket_y,
      count(*)::integer as eligible_cell_count,
      sum(altitude.score) as altitude_weighted_cell_count
    from public.spatial_cells cells
    join visible_levels levels
      on levels.cell_id =
        'epsg25831:' || p_grid_size_m || ':' ||
        split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) || ':' ||
        split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250)
    cross join lateral (
      select public.habitat_altitude_weight(
        cells.habitat_altitude_m,
        p_altitude_min,
        p_altitude_max
      ) as score
    ) altitude
    where cells.static_verified
      and cells.habitat_forest_types ?| p_forest_terms
      and cells.habitat_altitude_m > p_altitude_min - 100
      and cells.habitat_altitude_m < p_altitude_max + 100
      and altitude.score > 0
      and (p_ph_min is null or cells.habitat_soil_ph >= p_ph_min)
      and (p_ph_max is null or cells.habitat_soil_ph <= p_ph_max)
    group by 1, 2
  )
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
    least(
      1::double precision,
      grouped.altitude_weighted_cell_count / power(p_grid_size_m / 250, 2)
    ) as altitude_weighted_coverage,
    grouped.eligible_cell_count,
    levels.source_resolution_m,
    levels.confidence,
    levels.static_sources as sources
  from coarse_grouped grouped
  join visible_levels levels
    on levels.cell_id =
      'epsg25831:' || p_grid_size_m || ':' || grouped.bucket_x || ':' || grouped.bucket_y
  order by altitude_weighted_coverage desc, levels.cell_id
  limit least(greatest(p_limit, 1), 1000);
end;
$$;

revoke all on function public.habitat_altitude_weight(
  double precision, double precision, double precision
) from public, anon, authenticated;

grant execute on function public.habitat_altitude_weight(
  double precision, double precision, double precision
) to service_role;

revoke all on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) from public, anon, authenticated;

grant execute on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) to service_role;

comment on function public.habitat_altitude_weight(
  double precision, double precision, double precision
) is 'Returns the shared static altitude weight: 100 through the core interior, 75 at each documented edge, and zero after the 100 m outer margin.';

comment on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) is 'Returns exact verified compatible-cover percentage plus altitude-edge-weighted habitat intensity for distribution maps; dynamic fruiting conditions remain separate.';
