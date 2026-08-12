-- This SQL reader is called directly for coarse resolutions. It is fully
-- schema-qualified and intentionally has no per-function SET clause, allowing
-- PostgreSQL to inline request parameters and choose the measured covering
-- index instead of a generic bitmap-heap plan.
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
  coarse_grouped as materialized (
    select
      pg_catalog.split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) as bucket_x,
      pg_catalog.split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250) as bucket_y,
      count(*)::integer as eligible_cell_count,
      sum(cover.score) as compatible_cover_cell_count,
      sum(cover.score * altitude.score) as altitude_weighted_cell_count
    from public.spatial_cells cells
    join visible_levels levels on levels.cell_id =
      'epsg25831:' || p_grid_size_m || ':' ||
      pg_catalog.split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) || ':' ||
      pg_catalog.split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250)
    cross join lateral (
      select case
        when pg_catalog.cardinality(cells.habitat_cover_codes) > 0
          and pg_catalog.cardinality(cells.habitat_cover_codes) = pg_catalog.cardinality(cells.habitat_cover_shares) then
          least(1::double precision, coalesce((
            select sum(compact_cover.share::double precision)
            from unnest(cells.habitat_cover_codes, cells.habitat_cover_shares) compact_cover(code, share)
            where case compact_cover.code
              when 221 then array['pinedes', 'boscos de coniferes']
              when 222 then array['fagedes', 'rouredes', 'boscos de planifolis']
              when 223 then array['alzinars', 'suredes', 'boscos d esclerofil les']
              when 224 then array['matollars', 'clarianes', 'vores de bosc']
              when 225 then array['pinedes', 'pinedes obertes', 'boscos de coniferes']
              when 226 then array['fagedes', 'rouredes', 'boscos de planifolis']
              when 227 then array['alzinars', 'suredes', 'boscos d esclerofil les']
              when 228 then array['prats', 'clarianes', 'vores de bosc']
              when 229 then array['bosc de ribera', 'boscos humits']
              else '{}'::text[]
            end && p_forest_terms
          ), 0::double precision))
        when cells.habitat_forest_types ?| p_forest_terms then 1::double precision
        else 0::double precision
      end as score
    ) cover
    cross join lateral (
      select case
        when cells.habitat_altitude_m <= p_altitude_min - 100
          or cells.habitat_altitude_m >= p_altitude_max + 100 then 0::double precision
        when cells.habitat_altitude_m < p_altitude_min then
          0.75 * ((cells.habitat_altitude_m - (p_altitude_min - 100)) / 100)
        when cells.habitat_altitude_m < p_altitude_min + least(100::double precision, (p_altitude_max - p_altitude_min) / 2) then
          0.75 + 0.25 * ((cells.habitat_altitude_m - p_altitude_min) / least(100::double precision, (p_altitude_max - p_altitude_min) / 2))
        when cells.habitat_altitude_m <= p_altitude_max - least(100::double precision, (p_altitude_max - p_altitude_min) / 2) then 1::double precision
        when cells.habitat_altitude_m <= p_altitude_max then
          0.75 + 0.25 * ((p_altitude_max - cells.habitat_altitude_m) / least(100::double precision, (p_altitude_max - p_altitude_min) / 2))
        else 0.75 * (((p_altitude_max + 100) - cells.habitat_altitude_m) / 100)
      end as score
    ) altitude
    where cells.static_verified
      and cells.habitat_forest_types ?| p_forest_terms
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
    least(1::double precision, grouped.compatible_cover_cell_count / power(p_grid_size_m / 250, 2)),
    least(1::double precision, grouped.altitude_weighted_cell_count / power(p_grid_size_m / 250, 2)),
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
  integer, text[], double precision, double precision, double precision, double precision, integer
) from public, anon, authenticated;
grant execute on function public.read_weighted_coarse_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) to service_role;

comment on function public.read_weighted_coarse_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) is 'Direct SQL coarse habitat reader with compact cover fractions and inline altitude taper; fully qualified to remain safe without blocking planner inlining.';
