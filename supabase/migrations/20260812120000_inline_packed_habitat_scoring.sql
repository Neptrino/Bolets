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
  with compatibility as materialized (
    select
      array['pinedes', 'boscos de coniferes'] && p_forest_terms as c221,
      array['fagedes', 'rouredes', 'boscos de planifolis'] && p_forest_terms as c222,
      array['alzinars', 'suredes', 'boscos d esclerofil les'] && p_forest_terms as c223,
      array['matollars', 'clarianes', 'vores de bosc'] && p_forest_terms as c224,
      array['pinedes', 'pinedes obertes', 'boscos de coniferes'] && p_forest_terms as c225,
      array['fagedes', 'rouredes', 'boscos de planifolis'] && p_forest_terms as c226,
      array['alzinars', 'suredes', 'boscos d esclerofil les'] && p_forest_terms as c227,
      array['prats', 'pastures', 'gespes', 'vores de cami', 'clarianes', 'vores de bosc'] && p_forest_terms as c228,
      array['bosc de ribera', 'boscos humits'] && p_forest_terms as c229
  ),
  visible_levels as materialized (
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
      cells.habitat_cover_counts,
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
  scored_base as materialized (
    select
      cells.*,
      case
        when cells.habitat_cover_counts is not null then least(1::double precision, (
          case when compatibility.c221 then ((cells.habitat_cover_counts >> 0) & 31::bigint) else 0 end
          + case when compatibility.c222 then ((cells.habitat_cover_counts >> 5) & 31::bigint) else 0 end
          + case when compatibility.c223 then ((cells.habitat_cover_counts >> 10) & 31::bigint) else 0 end
          + case when compatibility.c224 then ((cells.habitat_cover_counts >> 15) & 31::bigint) else 0 end
          + case when compatibility.c225 then ((cells.habitat_cover_counts >> 20) & 31::bigint) else 0 end
          + case when compatibility.c226 then ((cells.habitat_cover_counts >> 25) & 31::bigint) else 0 end
          + case when compatibility.c227 then ((cells.habitat_cover_counts >> 30) & 31::bigint) else 0 end
          + case when compatibility.c228 then ((cells.habitat_cover_counts >> 35) & 31::bigint) else 0 end
          + case when compatibility.c229 then ((cells.habitat_cover_counts >> 40) & 31::bigint) else 0 end
        )::double precision / 25)
        else public.habitat_cover_weight_packed(
          cells.habitat_cover_counts,
          cells.habitat_cover_codes,
          cells.habitat_cover_shares,
          cells.habitat_forest_types,
          p_forest_terms
        )
      end as cover_score
    from visible_base cells
    cross join compatibility
  ),
  coarse_grouped as materialized (
    select
      pg_catalog.split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) as bucket_x,
      pg_catalog.split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250) as bucket_y,
      count(*)::integer as eligible_cell_count,
      sum(cells.cover_score) as compatible_cover_cell_count,
      sum(cells.cover_score * altitude.score) as altitude_weighted_cell_count
    from scored_base cells
    join visible_levels levels on levels.cell_id =
      'epsg25831:' || p_grid_size_m || ':' ||
      pg_catalog.split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) || ':' ||
      pg_catalog.split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250)
    cross join lateral (
      select public.habitat_altitude_weight(
        cells.habitat_altitude_m,
        p_altitude_min,
        p_altitude_max
      ) as score
    ) altitude
    where cells.habitat_altitude_m > p_altitude_min - 100
      and cells.habitat_altitude_m < p_altitude_max + 100
      and cells.cover_score > 0
      and altitude.score > 0
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
  cell_id text, region_id text, west double precision, south double precision,
  east double precision, north double precision, grid_size_m integer,
  coverage double precision, altitude_weighted_coverage double precision,
  eligible_cell_count integer, source_resolution_m integer,
  confidence text, sources text[]
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_grid_size_m = 250 then
    return query
    with compatibility as materialized (
      select
        array['pinedes', 'boscos de coniferes'] && p_forest_terms as c221,
        array['fagedes', 'rouredes', 'boscos de planifolis'] && p_forest_terms as c222,
        array['alzinars', 'suredes', 'boscos d esclerofil les'] && p_forest_terms as c223,
        array['matollars', 'clarianes', 'vores de bosc'] && p_forest_terms as c224,
        array['pinedes', 'pinedes obertes', 'boscos de coniferes'] && p_forest_terms as c225,
        array['fagedes', 'rouredes', 'boscos de planifolis'] && p_forest_terms as c226,
        array['alzinars', 'suredes', 'boscos d esclerofil les'] && p_forest_terms as c227,
        array['prats', 'pastures', 'gespes', 'vores de cami', 'clarianes', 'vores de bosc'] && p_forest_terms as c228,
        array['bosc de ribera', 'boscos humits'] && p_forest_terms as c229
    ),
    visible_base as materialized (
      select cells.*
      from public.spatial_cells cells
      where cells.static_verified
        and cells.geom operator(extensions.&&) extensions.st_makeenvelope(
          p_west, p_south, p_east, p_north, 4326
        )
    ),
    scored as materialized (
      select
        cells.*,
        case
          when cells.habitat_cover_counts is not null then least(1::double precision, (
            case when compatibility.c221 then ((cells.habitat_cover_counts >> 0) & 31::bigint) else 0 end
            + case when compatibility.c222 then ((cells.habitat_cover_counts >> 5) & 31::bigint) else 0 end
            + case when compatibility.c223 then ((cells.habitat_cover_counts >> 10) & 31::bigint) else 0 end
            + case when compatibility.c224 then ((cells.habitat_cover_counts >> 15) & 31::bigint) else 0 end
            + case when compatibility.c225 then ((cells.habitat_cover_counts >> 20) & 31::bigint) else 0 end
            + case when compatibility.c226 then ((cells.habitat_cover_counts >> 25) & 31::bigint) else 0 end
            + case when compatibility.c227 then ((cells.habitat_cover_counts >> 30) & 31::bigint) else 0 end
            + case when compatibility.c228 then ((cells.habitat_cover_counts >> 35) & 31::bigint) else 0 end
            + case when compatibility.c229 then ((cells.habitat_cover_counts >> 40) & 31::bigint) else 0 end
          )::double precision / 25)
          else public.habitat_cover_weight_packed(
            cells.habitat_cover_counts,
            cells.habitat_cover_codes,
            cells.habitat_cover_shares,
            cells.habitat_forest_types,
            p_forest_terms
          )
        end as cover_score
      from visible_base cells
      cross join compatibility
    )
    select
      cells.cell_id, cells.region_id, cells.west, cells.south, cells.east, cells.north,
      cells.grid_size_m, cells.cover_score, cells.cover_score * altitude.score, 1,
      cells.source_resolution_m, cells.confidence, cells.static_sources
    from scored cells
    cross join lateral (
      select public.habitat_altitude_weight(
        cells.habitat_altitude_m,
        p_altitude_min,
        p_altitude_max
      ) as score
    ) altitude
    where cells.habitat_altitude_m > p_altitude_min - 100
      and cells.habitat_altitude_m < p_altitude_max + 100
      and cells.cover_score > 0
      and altitude.score > 0
      and (p_ph_min is null or cells.habitat_soil_ph >= p_ph_min)
      and (p_ph_max is null or cells.habitat_soil_ph <= p_ph_max)
    order by cells.cell_id
    limit least(greatest(p_limit, 1), 1000);
    return;
  end if;

  return query
  select *
  from public.read_weighted_coarse_potential_habitat_cells(
    p_west, p_south, p_east, p_north, p_grid_size_m, p_forest_terms,
    p_altitude_min, p_altitude_max, p_ph_min, p_ph_max, p_limit
  );
end;
$$;

revoke all on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision,
  double precision, double precision, integer
) from public, anon, authenticated;
grant execute on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision,
  double precision, double precision, integer
) to service_role;

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
