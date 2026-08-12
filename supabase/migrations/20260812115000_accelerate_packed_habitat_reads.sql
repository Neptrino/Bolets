create or replace function public.habitat_cover_weight_packed(
  p_cover_counts bigint,
  p_cover_codes smallint[],
  p_cover_shares real[],
  p_legacy_forest_types jsonb,
  p_forest_terms text[]
)
returns double precision
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select case
    when p_cover_counts is not null then least(1::double precision, (
      case when array['pinedes', 'boscos de coniferes'] && p_forest_terms
        then ((p_cover_counts >> 0) & 31::bigint) else 0 end
      + case when array['fagedes', 'rouredes', 'boscos de planifolis'] && p_forest_terms
        then ((p_cover_counts >> 5) & 31::bigint) else 0 end
      + case when array['alzinars', 'suredes', 'boscos d esclerofil les'] && p_forest_terms
        then ((p_cover_counts >> 10) & 31::bigint) else 0 end
      + case when array['matollars', 'clarianes', 'vores de bosc'] && p_forest_terms
        then ((p_cover_counts >> 15) & 31::bigint) else 0 end
      + case when array['pinedes', 'pinedes obertes', 'boscos de coniferes'] && p_forest_terms
        then ((p_cover_counts >> 20) & 31::bigint) else 0 end
      + case when array['fagedes', 'rouredes', 'boscos de planifolis'] && p_forest_terms
        then ((p_cover_counts >> 25) & 31::bigint) else 0 end
      + case when array['alzinars', 'suredes', 'boscos d esclerofil les'] && p_forest_terms
        then ((p_cover_counts >> 30) & 31::bigint) else 0 end
      + case when array['prats', 'pastures', 'gespes', 'vores de cami', 'clarianes', 'vores de bosc'] && p_forest_terms
        then ((p_cover_counts >> 35) & 31::bigint) else 0 end
      + case when array['bosc de ribera', 'boscos humits'] && p_forest_terms
        then ((p_cover_counts >> 40) & 31::bigint) else 0 end
    )::double precision / 25)
    when cardinality(p_cover_codes) > 0
      and cardinality(p_cover_codes) = cardinality(p_cover_shares) then
      least(1::double precision, coalesce((
        select sum(cover.share::double precision)
        from unnest(p_cover_codes, p_cover_shares) cover(code, share)
        where case cover.code
          when 221 then array['pinedes', 'boscos de coniferes']
          when 222 then array['fagedes', 'rouredes', 'boscos de planifolis']
          when 223 then array['alzinars', 'suredes', 'boscos d esclerofil les']
          when 224 then array['matollars', 'clarianes', 'vores de bosc']
          when 225 then array['pinedes', 'pinedes obertes', 'boscos de coniferes']
          when 226 then array['fagedes', 'rouredes', 'boscos de planifolis']
          when 227 then array['alzinars', 'suredes', 'boscos d esclerofil les']
          when 228 then array['prats', 'pastures', 'gespes', 'vores de cami', 'clarianes', 'vores de bosc']
          when 229 then array['bosc de ribera', 'boscos humits']
          else '{}'::text[]
        end && p_forest_terms
      ), 0::double precision))
    when p_legacy_forest_types ?| p_forest_terms then 1::double precision
    else 0::double precision
  end;
$$;

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
      levels.confidence, levels.static_sources,
      pg_catalog.split_part(levels.cell_id, ':', 3)::integer as bucket_x,
      pg_catalog.split_part(levels.cell_id, ':', 4)::integer as bucket_y
    from public.spatial_cell_levels levels
    where levels.grid_size_m = p_grid_size_m
      and levels.east >= p_west and levels.west <= p_east
      and levels.north >= p_south and levels.south <= p_north
  ),
  visible_base as materialized (
    select
      levels.cell_id as level_cell_id,
      cells.habitat_cover_counts,
      cells.habitat_cover_codes,
      cells.habitat_cover_shares,
      cells.habitat_forest_types,
      cells.habitat_altitude_m,
      cells.habitat_soil_ph
    from visible_levels levels
    cross join pg_catalog.generate_series(0, p_grid_size_m / 250 - 1) offset_x
    cross join pg_catalog.generate_series(0, p_grid_size_m / 250 - 1) offset_y
    join public.spatial_cells cells on cells.cell_id =
      'epsg25831:250:' || (levels.bucket_x * (p_grid_size_m / 250) + offset_x) || ':' ||
      (levels.bucket_y * (p_grid_size_m / 250) + offset_y)
    where cells.static_verified
  ),
  coarse_grouped as materialized (
    select
      cells.level_cell_id,
      count(*)::integer as eligible_cell_count,
      sum(cover.score) as compatible_cover_cell_count,
      sum(cover.score * altitude.score) as altitude_weighted_cell_count
    from visible_base cells
    cross join lateral (
      select public.habitat_cover_weight_packed(
        cells.habitat_cover_counts,
        cells.habitat_cover_codes,
        cells.habitat_cover_shares,
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
    where cells.habitat_altitude_m > p_altitude_min - 100
      and cells.habitat_altitude_m < p_altitude_max + 100
      and cover.score > 0
      and altitude.score > 0
      and (p_ph_min is null or cells.habitat_soil_ph >= p_ph_min)
      and (p_ph_max is null or cells.habitat_soil_ph <= p_ph_max)
    group by cells.level_cell_id
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
  join visible_levels levels on levels.cell_id = grouped.level_cell_id
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

analyze public.spatial_cells;
analyze public.spatial_cell_levels;
