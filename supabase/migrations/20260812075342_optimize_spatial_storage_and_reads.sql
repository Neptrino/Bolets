-- The 500 m level duplicated most of the 250 m table while only covering a
-- narrow zoom band. The client now moves directly from 1 km to the indexed
-- 250 m cells, so keep only the coarse levels that materially reduce reads.
delete from public.spatial_cell_levels where grid_size_m = 500;

alter table public.spatial_cell_levels
  drop constraint if exists spatial_cell_levels_supported_grid_size_check;

alter table public.spatial_cell_levels
  add constraint spatial_cell_levels_supported_grid_size_check
  check (grid_size_m in (1000, 2500, 5000, 10000));

drop index if exists public.spatial_cell_levels_500_forest_types_gin_idx;
drop index if exists public.spatial_cell_levels_500_habitat_ranges_idx;

-- Coarse tables are small after filtering by grid size. Numeric overlap tests
-- are both faster and smaller than reading a stored PostGIS polygon + GiST
-- index for every level row.
drop index if exists public.spatial_cell_levels_geom_idx;

create or replace function public.read_precomputed_cell_environment(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_grid_size_m integer,
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
  observed_at timestamptz,
  sources text[],
  source_resolution_m integer,
  confidence text,
  stale boolean,
  unavailable_fields text[],
  "values" jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    levels.cell_id,
    levels.region_id,
    levels.west,
    levels.south,
    levels.east,
    levels.north,
    levels.grid_size_m,
    levels.condition_observed_at,
    levels.condition_sources,
    levels.condition_source_resolution_m,
    levels.condition_confidence,
    levels.condition_stale or levels.condition_observed_at < now() - interval '36 hours',
    levels.condition_unavailable_fields,
    levels.condition_values
  from public.spatial_cell_levels levels
  where levels.grid_size_m = p_grid_size_m
    and levels.condition_observed_at is not null
    and levels.east >= p_west
    and levels.west <= p_east
    and levels.north >= p_south
    and levels.south <= p_north
  order by
    power(((levels.west + levels.east) / 2) - ((p_west + p_east) / 2), 2)
      + power(((levels.south + levels.north) / 2) - ((p_south + p_north) / 2), 2),
    levels.cell_id
  limit least(greatest(p_limit, 1), 1000);
$$;

create or replace function public.read_aggregated_cell_environment(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_grid_size_m integer,
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
  observed_at timestamptz,
  sources text[],
  source_resolution_m integer,
  confidence text,
  stale boolean,
  unavailable_fields text[],
  "values" jsonb
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
      levels.static_values,
      levels.static_sources,
      levels.source_resolution_m,
      levels.confidence,
      levels.weather_point_ids,
      levels.soil_point_ids
    from public.spatial_cell_levels levels
    where levels.grid_size_m = p_grid_size_m
      and levels.east >= p_west
      and levels.west <= p_east
      and levels.north >= p_south
      and levels.south <= p_north
    order by
      power((levels.west + levels.east) / 2 - (p_west + p_east) / 2, 2)
        + power((levels.south + levels.north) / 2 - (p_south + p_north) / 2, 2),
      levels.cell_id
    limit least(greatest(p_limit, 1), 1000)
  ),
  atmosphere as (
    select
      levels.cell_id,
      max(latest.observed_at) as observed_at,
      array_remove(array_agg(distinct source_name order by source_name), null) as sources,
      max(latest.source_resolution_m) as source_resolution_m,
      case min(case latest.confidence when 'unknown' then 0 when 'limited' then 1 when 'moderate' then 2 else 3 end)
        when 0 then 'unknown' when 1 then 'limited' when 2 then 'moderate' else 'high'
      end as confidence,
      bool_or(latest.stale or latest.observed_at < now() - interval '36 hours') as stale,
      array_remove(array_agg(distinct field_name order by field_name), null) as unavailable_fields,
      jsonb_strip_nulls(jsonb_build_object(
        'weatherObservedAt', max(latest.values ->> 'weatherObservedAt'),
        'weatherModel', mode() within group (order by latest.values ->> 'weatherModel') filter (where latest.values ? 'weatherModel'),
        'atmosphericResolutionM', max(nullif(latest.values ->> 'atmosphericResolutionM', '')::integer),
        'weatherGridLatitude', avg(nullif(latest.values ->> 'weatherGridLatitude', '')::double precision),
        'weatherGridLongitude', avg(nullif(latest.values ->> 'weatherGridLongitude', '')::double precision),
        'weatherElevationM', round(avg(nullif(latest.values ->> 'weatherElevationM', '')::numeric)),
        'temperatureC', avg(nullif(latest.values ->> 'temperatureC', '')::double precision),
        'temperatureMin24hC', min(nullif(latest.values ->> 'temperatureMin24hC', '')::double precision),
        'temperatureAvg24hC', avg(nullif(latest.values ->> 'temperatureAvg24hC', '')::double precision),
        'temperatureMax24hC', max(nullif(latest.values ->> 'temperatureMax24hC', '')::double precision),
        'temperatureMin7dC', min(nullif(latest.values ->> 'temperatureMin7dC', '')::double precision),
        'frostHours7d', max(nullif(latest.values ->> 'frostHours7d', '')::integer),
        'temperatureMin10dC', min(nullif(latest.values ->> 'temperatureMin10dC', '')::double precision),
        'temperatureAvg10dC', avg(nullif(latest.values ->> 'temperatureAvg10dC', '')::double precision),
        'temperatureMax10dC', max(nullif(latest.values ->> 'temperatureMax10dC', '')::double precision),
        'frostHours10d', max(nullif(latest.values ->> 'frostHours10d', '')::integer),
        'relativeHumidity', avg(nullif(latest.values ->> 'relativeHumidity', '')::double precision),
        'relativeHumidityMin24h', min(nullif(latest.values ->> 'relativeHumidityMin24h', '')::double precision),
        'relativeHumidityAvg24h', avg(nullif(latest.values ->> 'relativeHumidityAvg24h', '')::double precision),
        'relativeHumidityMax24h', max(nullif(latest.values ->> 'relativeHumidityMax24h', '')::double precision),
        'rainfall3dMm', avg(nullif(latest.values ->> 'rainfall3dMm', '')::double precision),
        'rainfall7dMm', avg(nullif(latest.values ->> 'rainfall7dMm', '')::double precision),
        'rainfallPrevious23dMm', avg(nullif(latest.values ->> 'rainfallPrevious23dMm', '')::double precision),
        'rainfall30dMm', avg(nullif(latest.values ->> 'rainfall30dMm', '')::double precision),
        'drySpellDays', avg(nullif(latest.values ->> 'drySpellDays', '')::double precision),
        'evapotranspiration3dMm', avg(nullif(latest.values ->> 'evapotranspiration3dMm', '')::double precision),
        'evapotranspiration7dMm', avg(nullif(latest.values ->> 'evapotranspiration7dMm', '')::double precision),
        'evapotranspiration30dMm', avg(nullif(latest.values ->> 'evapotranspiration30dMm', '')::double precision),
        'windKmh', avg(nullif(latest.values ->> 'windKmh', '')::double precision),
        'windAvg24hKmh', avg(nullif(latest.values ->> 'windAvg24hKmh', '')::double precision),
        'windMax24hKmh', max(nullif(latest.values ->> 'windMax24hKmh', '')::double precision),
        'windGustKmh', avg(nullif(latest.values ->> 'windGustKmh', '')::double precision),
        'windGustMax24hKmh', max(nullif(latest.values ->> 'windGustMax24hKmh', '')::double precision)
      )) as values
    from visible_levels levels
    cross join lateral unnest(levels.weather_point_ids) weather_point(point_id)
    join public.weather_grid_snapshots latest on latest.point_id = weather_point.point_id
    left join public.weather_grid_snapshots newer
      on newer.point_id = latest.point_id and newer.snapshot_date > latest.snapshot_date
    left join lateral unnest(latest.sources) source_value(source_name) on true
    left join lateral unnest(latest.unavailable_fields) unavailable_value(field_name) on true
    where newer.point_id is null
    group by levels.cell_id
  ),
  soil as (
    select
      levels.cell_id,
      max(latest.observed_at) as observed_at,
      array_remove(array_agg(distinct source_name order by source_name), null) as sources,
      max(latest.source_resolution_m) as source_resolution_m,
      case min(case latest.confidence when 'unknown' then 0 when 'limited' then 1 when 'moderate' then 2 else 3 end)
        when 0 then 'unknown' when 1 then 'limited' when 2 then 'moderate' else 'high'
      end as confidence,
      bool_or(latest.stale or latest.observed_at < now() - interval '36 hours') as stale,
      array_remove(array_agg(distinct field_name order by field_name), null) as unavailable_fields,
      jsonb_strip_nulls(jsonb_build_object(
        'soilMoistureResolutionM', max(nullif(latest.values ->> 'soilMoistureResolutionM', '')::integer),
        'soilGridLatitude', avg(nullif(latest.values ->> 'soilGridLatitude', '')::double precision),
        'soilGridLongitude', avg(nullif(latest.values ->> 'soilGridLongitude', '')::double precision),
        'soilMoisture', avg(nullif(latest.values ->> 'soilMoisture', '')::double precision),
        'soilMoistureMin24h', min(nullif(latest.values ->> 'soilMoistureMin24h', '')::double precision),
        'soilMoistureAvg24h', avg(nullif(latest.values ->> 'soilMoistureAvg24h', '')::double precision),
        'soilMoistureMax24h', max(nullif(latest.values ->> 'soilMoistureMax24h', '')::double precision),
        'soilMoistureMin7d', min(nullif(latest.values ->> 'soilMoistureMin7d', '')::double precision),
        'soilMoistureAvg7d', avg(nullif(latest.values ->> 'soilMoistureAvg7d', '')::double precision),
        'soilMoistureMax7d', max(nullif(latest.values ->> 'soilMoistureMax7d', '')::double precision),
        'soilMoistureTrend7d', avg(nullif(latest.values ->> 'soilMoistureTrend7d', '')::double precision)
      )) as values
    from visible_levels levels
    cross join lateral unnest(levels.soil_point_ids) soil_point(point_id)
    join public.weather_grid_snapshots latest on latest.point_id = soil_point.point_id
    left join public.weather_grid_snapshots newer
      on newer.point_id = latest.point_id and newer.snapshot_date > latest.snapshot_date
    left join lateral unnest(latest.sources) source_value(source_name) on true
    left join lateral unnest(latest.unavailable_fields) unavailable_value(field_name) on true
    where newer.point_id is null
    group by levels.cell_id
  )
  select
    levels.cell_id,
    levels.region_id,
    levels.west,
    levels.south,
    levels.east,
    levels.north,
    levels.grid_size_m,
    greatest(atmosphere.observed_at, coalesce(soil.observed_at, atmosphere.observed_at)),
    levels.static_sources || coalesce(soil.sources, '{}'::text[]) || atmosphere.sources,
    greatest(levels.source_resolution_m, atmosphere.source_resolution_m, coalesce(soil.source_resolution_m, 0)),
    case
      when levels.confidence in ('limited', 'unknown') then levels.confidence
      when atmosphere.confidence in ('limited', 'unknown') then atmosphere.confidence
      when soil.confidence in ('limited', 'unknown') then soil.confidence
      else atmosphere.confidence
    end,
    atmosphere.stale or coalesce(soil.stale, false),
    atmosphere.unavailable_fields || coalesce(soil.unavailable_fields, '{}'::text[]),
    levels.static_values || coalesce(soil.values, '{}'::jsonb) || atmosphere.values
  from visible_levels levels
  join atmosphere using (cell_id)
  left join soil using (cell_id)
  order by levels.cell_id;
$$;

-- Keep the two habitat helpers self-contained so this migration can repair a
-- deployment where the corresponding application code arrived first.
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
    when p_altitude_m < p_core_min_m then 0.75 * ((p_altitude_m - (p_core_min_m - 100)) / 100)
    when p_altitude_m < p_core_min_m + least(100::double precision, (p_core_max_m - p_core_min_m) / 2) then
      0.75 + 0.25 * ((p_altitude_m - p_core_min_m) / least(100::double precision, (p_core_max_m - p_core_min_m) / 2))
    when p_altitude_m <= p_core_max_m - least(100::double precision, (p_core_max_m - p_core_min_m) / 2) then 1::double precision
    when p_altitude_m <= p_core_max_m then
      0.75 + 0.25 * ((p_core_max_m - p_altitude_m) / least(100::double precision, (p_core_max_m - p_core_min_m) / 2))
    else 0.75 * (((p_core_max_m + 100) - p_altitude_m) / 100)
  end;
$$;

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
      least(1::double precision, coalesce((
        select sum((cover ->> 'share')::double precision)
        from jsonb_array_elements(p_cover_fractions) cover
        where jsonb_typeof(cover -> 'share') = 'number'
          and jsonb_typeof(cover -> 'habitat') = 'array'
          and (cover -> 'habitat') ?| p_forest_terms
      ), 0::double precision))
    when p_legacy_forest_types ?| p_forest_terms then 1::double precision
    else 0::double precision
  end;
$$;

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
  cell_id text, region_id text, west double precision, south double precision,
  east double precision, north double precision, grid_size_m integer,
  coverage double precision, eligible_cell_count integer,
  source_resolution_m integer, confidence text, sources text[]
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
      cells.grid_size_m, 1::double precision, 1,
      cells.source_resolution_m, cells.confidence, cells.static_sources
    from public.spatial_cells cells
    where cells.static_verified
      and cells.geom operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
      and cells.habitat_forest_types ?| p_forest_terms
      and cells.habitat_altitude_m between p_altitude_min and p_altitude_max
      and (p_ph_min is null or cells.habitat_soil_ph >= p_ph_min)
      and (p_ph_max is null or cells.habitat_soil_ph <= p_ph_max)
    order by cells.cell_id
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
      count(*)::integer as eligible_cell_count
    from public.spatial_cells cells
    join visible_levels levels on levels.cell_id =
      'epsg25831:' || p_grid_size_m || ':' ||
      split_part(cells.cell_id, ':', 3)::integer / (p_grid_size_m / 250) || ':' ||
      split_part(cells.cell_id, ':', 4)::integer / (p_grid_size_m / 250)
    where cells.static_verified
      and cells.habitat_forest_types ?| p_forest_terms
      and cells.habitat_altitude_m between p_altitude_min and p_altitude_max
      and (p_ph_min is null or cells.habitat_soil_ph >= p_ph_min)
      and (p_ph_max is null or cells.habitat_soil_ph <= p_ph_max)
    group by 1, 2
  )
  select
    levels.cell_id, levels.region_id, levels.west, levels.south, levels.east,
    levels.north, levels.grid_size_m,
    least(1::double precision, grouped.eligible_cell_count::double precision / power(p_grid_size_m / 250, 2)),
    grouped.eligible_cell_count, levels.source_resolution_m, levels.confidence,
    levels.static_sources
  from coarse_grouped grouped
  join visible_levels levels on levels.cell_id =
    'epsg25831:' || p_grid_size_m || ':' || grouped.bucket_x || ':' || grouped.bucket_y
  order by 8 desc, levels.cell_id
  limit least(greatest(p_limit, 1), 1000);
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
      select public.habitat_cover_weight(
        coalesce(cells.static_values -> 'landCoverFractions', '[]'::jsonb),
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
      select public.habitat_cover_weight(
        coalesce(cells.static_values -> 'landCoverFractions', '[]'::jsonb),
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

-- Remove indexes superseded by the current habitat indexes. Keep the 39 MB
-- covering index: live cold-cache profiling showed that removing it turns a
-- country-wide habitat read from sub-second into a multi-second heap scan.
drop index if exists public.spatial_cells_verified_cell_idx;
drop index if exists public.spatial_cells_habitat_ranges_idx;
drop index if exists public.spatial_cells_forest_types_gin_idx;

alter table public.spatial_cells drop column if exists habitat_land_cover_fractions;

revoke all on function public.habitat_altitude_weight(double precision, double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.habitat_altitude_weight(double precision, double precision, double precision)
  to service_role;

revoke all on function public.habitat_cover_weight(jsonb, jsonb, text[])
  from public, anon, authenticated;
grant execute on function public.habitat_cover_weight(jsonb, jsonb, text[])
  to service_role;

revoke all on function public.read_precomputed_cell_environment(
  double precision, double precision, double precision, double precision, integer, integer
) from public, anon, authenticated;
grant execute on function public.read_precomputed_cell_environment(
  double precision, double precision, double precision, double precision, integer, integer
) to service_role;

revoke all on function public.read_aggregated_cell_environment(
  double precision, double precision, double precision, double precision, integer, integer
) from public, anon, authenticated;
grant execute on function public.read_aggregated_cell_environment(
  double precision, double precision, double precision, double precision, integer, integer
) to service_role;

revoke all on function public.read_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) from public, anon, authenticated;
grant execute on function public.read_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) to service_role;

revoke all on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) from public, anon, authenticated;
grant execute on function public.read_weighted_potential_habitat_cells(
  double precision, double precision, double precision, double precision,
  integer, text[], double precision, double precision, double precision, double precision, integer
) to service_role;

comment on table public.spatial_cell_levels is
  'Materialized 1 km, 2.5 km, 5 km, and 10 km rollups. The exact 250 m table replaces the redundant 500 m band.';

comment on function public.read_precomputed_cell_environment(
  double precision, double precision, double precision, double precision, integer, integer
) is 'Reads cached coarse conditions with numeric bounds so a map request does not materialize or sort wide geometry rows.';
