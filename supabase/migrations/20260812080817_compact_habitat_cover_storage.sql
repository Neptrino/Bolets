alter table public.spatial_cells
  add column if not exists habitat_cover_codes smallint[],
  add column if not exists habitat_cover_shares real[];

alter table public.spatial_cells
  drop constraint if exists spatial_cells_habitat_cover_arrays_check;

alter table public.spatial_cells
  add constraint spatial_cells_habitat_cover_arrays_check
  check (
    (habitat_cover_codes is null and habitat_cover_shares is null)
    or (
      habitat_cover_codes is not null
      and habitat_cover_shares is not null
      and cardinality(habitat_cover_codes) = cardinality(habitat_cover_shares)
      and cardinality(habitat_cover_codes) between 1 and 9
    )
  );

-- Compact any already-imported verbose fractions before removing the JSON
-- copy. Each array position preserves an ICGC cover code and its sampled
-- linear share, so no ecological evidence is lost.
with compacted as (
  select
    cells.cell_id,
    array_agg((cover.value ->> 'code')::smallint order by cover.ordinality) as codes,
    array_agg((cover.value ->> 'share')::real order by cover.ordinality) as shares
  from public.spatial_cells cells
  cross join lateral jsonb_array_elements(cells.static_values -> 'landCoverFractions')
    with ordinality as cover(value, ordinality)
  where jsonb_typeof(cells.static_values -> 'landCoverFractions') = 'array'
    and jsonb_array_length(cells.static_values -> 'landCoverFractions') between 1 and 9
  group by cells.cell_id
)
update public.spatial_cells cells
set
  habitat_cover_codes = compacted.codes,
  habitat_cover_shares = compacted.shares,
  static_values = cells.static_values - 'landCoverFractions'
from compacted
where cells.cell_id = compacted.cell_id;

drop index if exists public.spatial_cells_habitat_ranges_covering_idx;

create index spatial_cells_habitat_ranges_covering_idx
  on public.spatial_cells (habitat_altitude_m, habitat_soil_ph)
  include (cell_id, habitat_forest_types, habitat_cover_codes, habitat_cover_shares)
  where static_verified;

create index if not exists spatial_cells_cover_fraction_present_idx
  on public.spatial_cells (cell_id)
  where habitat_cover_codes is not null;

create or replace function public.habitat_cover_weight_compact(
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
          when 228 then array['prats', 'clarianes', 'vores de bosc']
          when 229 then array['bosc de ribera', 'boscos humits']
          else '{}'::text[]
        end && p_forest_terms
      ), 0::double precision))
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
    select
      cells.cell_id, cells.region_id, cells.west, cells.south, cells.east, cells.north,
      cells.grid_size_m, cover.score, cover.score * altitude.score, 1,
      cells.source_resolution_m, cells.confidence, cells.static_sources
    from public.spatial_cells cells
    cross join lateral (
      select public.habitat_cover_weight_compact(
        cells.habitat_cover_codes,
        cells.habitat_cover_shares,
        cells.habitat_forest_types,
        p_forest_terms
      ) as score
    ) cover
    cross join lateral (
      select public.habitat_altitude_weight(cells.habitat_altitude_m, p_altitude_min, p_altitude_max) as score
    ) altitude
    where cells.static_verified
      and cells.geom operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
      and cells.habitat_forest_types ?| p_forest_terms
      and cells.habitat_altitude_m > p_altitude_min - 100
      and cells.habitat_altitude_m < p_altitude_max + 100
      and cover.score > 0 and altitude.score > 0
      and (p_ph_min is null or cells.habitat_soil_ph >= p_ph_min)
      and (p_ph_max is null or cells.habitat_soil_ph <= p_ph_max)
    order by cells.cell_id
    limit least(greatest(p_limit, 1), 1000);
    return;
  end if;

  -- Until the next static rebuild supplies sampled fractions, keep the legacy
  -- branch entirely index-only. The partial presence index makes this check
  -- constant-time for both an empty and a populated compact dataset.
  if not exists (
    select 1 from public.spatial_cells cells
    where cells.habitat_cover_codes is not null
    limit 1
  ) then
    return query
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
        split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) as bucket_x,
        split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250) as bucket_y,
        count(*)::integer as eligible_cell_count,
        sum(altitude.score) as altitude_weighted_cell_count
      from public.spatial_cells cells
      join visible_levels levels on levels.cell_id =
        'epsg25831:' || p_grid_size_m || ':' ||
        split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) || ':' ||
        split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250)
      cross join lateral (
        select public.habitat_altitude_weight(cells.habitat_altitude_m, p_altitude_min, p_altitude_max) as score
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
      levels.cell_id, levels.region_id, levels.west, levels.south, levels.east,
      levels.north, levels.grid_size_m,
      least(1::double precision, grouped.eligible_cell_count::double precision / power(p_grid_size_m / 250, 2)),
      least(1::double precision, grouped.altitude_weighted_cell_count / power(p_grid_size_m / 250, 2)),
      grouped.eligible_cell_count, levels.source_resolution_m, levels.confidence,
      levels.static_sources
    from coarse_grouped grouped
    join visible_levels levels on levels.cell_id =
      'epsg25831:' || p_grid_size_m || ':' || grouped.bucket_x || ':' || grouped.bucket_y
    order by 9 desc, levels.cell_id
    limit least(greatest(p_limit, 1), 1000);
    return;
  end if;

  return query
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
      split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) as bucket_x,
      split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250) as bucket_y,
      count(*)::integer as eligible_cell_count,
      sum(cover.score) as compatible_cover_cell_count,
      sum(cover.score * altitude.score) as altitude_weighted_cell_count
    from public.spatial_cells cells
    join visible_levels levels on levels.cell_id =
      'epsg25831:' || p_grid_size_m || ':' ||
      split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) || ':' ||
      split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250)
    cross join lateral (
      select public.habitat_cover_weight_compact(
        cells.habitat_cover_codes,
        cells.habitat_cover_shares,
        cells.habitat_forest_types,
        p_forest_terms
      ) as score
    ) cover
    cross join lateral (
      select public.habitat_altitude_weight(cells.habitat_altitude_m, p_altitude_min, p_altitude_max) as score
    ) altitude
    where cells.static_verified
      and cells.habitat_forest_types ?| p_forest_terms
      and cells.habitat_altitude_m > p_altitude_min - 100
      and cells.habitat_altitude_m < p_altitude_max + 100
      and cover.score > 0 and altitude.score > 0
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
end;
$$;

revoke all on function public.habitat_cover_weight_compact(
  smallint[], real[], jsonb, text[]
) from public, anon, authenticated;
grant execute on function public.habitat_cover_weight_compact(
  smallint[], real[], jsonb, text[]
) to service_role;

revoke all on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) from public, anon, authenticated;
grant execute on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) to service_role;

comment on column public.spatial_cells.habitat_cover_codes is
  'Compact ICGC land-cover class codes aligned positionally with habitat_cover_shares.';
comment on column public.spatial_cells.habitat_cover_shares is
  'Exact sampled linear cover shares aligned positionally with habitat_cover_codes; null marks legacy dominant-cover cells.';
