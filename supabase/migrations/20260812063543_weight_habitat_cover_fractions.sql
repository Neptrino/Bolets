alter table public.spatial_cells
  add column if not exists habitat_land_cover_fractions jsonb
    generated always as (
      case
        when jsonb_typeof(static_values -> 'landCoverFractions') = 'array'
          then static_values -> 'landCoverFractions'
        else '[]'::jsonb
      end
    ) stored;

create or replace function public.habitat_cover_weight(
  p_cover_fractions jsonb,
  p_legacy_forest_types jsonb,
  p_forest_terms text[]
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
    when jsonb_typeof(p_cover_fractions) = 'array' and jsonb_array_length(p_cover_fractions) > 0 then
      least(
        1::double precision,
        coalesce((
          select sum((cover ->> 'share')::double precision)
          from jsonb_array_elements(p_cover_fractions) cover
          where jsonb_typeof(cover -> 'share') = 'number'
            and jsonb_typeof(cover -> 'habitat') = 'array'
            and (cover -> 'habitat') ?| p_forest_terms
        ), 0::double precision)
      )
    when p_legacy_forest_types ?| p_forest_terms then 1::double precision
    else 0::double precision
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
      cover.score as coverage,
      cover.score * altitude.score as altitude_weighted_coverage,
      1 as eligible_cell_count,
      cells.source_resolution_m,
      cells.confidence,
      cells.static_sources as sources
    from public.spatial_cells cells
    cross join lateral (
      select public.habitat_cover_weight(
        cells.habitat_land_cover_fractions,
        cells.habitat_forest_types,
        p_forest_terms
      ) as score
    ) cover
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
      and cover.score > 0
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
      sum(cover.score) as compatible_cover_cell_count,
      sum(cover.score * altitude.score) as altitude_weighted_cell_count
    from public.spatial_cells cells
    join visible_levels levels
      on levels.cell_id =
        'epsg25831:' || p_grid_size_m || ':' ||
        split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) || ':' ||
        split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250)
    cross join lateral (
      select public.habitat_cover_weight(
        cells.habitat_land_cover_fractions,
        cells.habitat_forest_types,
        p_forest_terms
      ) as score
    ) cover
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
      and cover.score > 0
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
      grouped.compatible_cover_cell_count / power(p_grid_size_m / 250, 2)
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

revoke all on function public.habitat_cover_weight(
  jsonb, jsonb, text[]
) from public, anon, authenticated;

grant execute on function public.habitat_cover_weight(
  jsonb, jsonb, text[]
) to service_role;

revoke all on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) from public, anon, authenticated;

grant execute on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) to service_role;

comment on function public.habitat_cover_weight(
  jsonb, jsonb, text[]
) is 'Sums sampled land-cover fractions compatible with the species terms; legacy dominant-cover cells retain a binary fallback until rebuilt.';

comment on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) is 'Returns linear compatible-cover percentage and altitude-edge-weighted distribution intensity from exact 250 m samples.';
