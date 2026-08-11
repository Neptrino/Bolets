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
    select levels.*
    from public.spatial_cell_levels levels
    where levels.grid_size_m = p_grid_size_m
      and levels.geom operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
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
        'relativeHumidity', avg(nullif(latest.values ->> 'relativeHumidity', '')::double precision),
        'relativeHumidityMin24h', min(nullif(latest.values ->> 'relativeHumidityMin24h', '')::double precision),
        'relativeHumidityAvg24h', avg(nullif(latest.values ->> 'relativeHumidityAvg24h', '')::double precision),
        'relativeHumidityMax24h', max(nullif(latest.values ->> 'relativeHumidityMax24h', '')::double precision),
        'rainfall7dMm', avg(nullif(latest.values ->> 'rainfall7dMm', '')::double precision),
        'windKmh', avg(nullif(latest.values ->> 'windKmh', '')::double precision),
        'windAvg24hKmh', avg(nullif(latest.values ->> 'windAvg24hKmh', '')::double precision),
        'windMax24hKmh', max(nullif(latest.values ->> 'windMax24hKmh', '')::double precision),
        'windGustKmh', avg(nullif(latest.values ->> 'windGustKmh', '')::double precision),
        'windGustMax24hKmh', max(nullif(latest.values ->> 'windGustMax24hKmh', '')::double precision)
      )) as values
    from visible_levels levels
    cross join lateral unnest(levels.weather_point_ids) weather_point(point_id)
    join public.weather_grid_snapshots latest
      on latest.point_id = weather_point.point_id
    left join public.weather_grid_snapshots newer
      on newer.point_id = latest.point_id
      and newer.snapshot_date > latest.snapshot_date
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
        'soilMoistureMax24h', max(nullif(latest.values ->> 'soilMoistureMax24h', '')::double precision)
      )) as values
    from visible_levels levels
    cross join lateral unnest(levels.soil_point_ids) soil_point(point_id)
    join public.weather_grid_snapshots latest
      on latest.point_id = soil_point.point_id
    left join public.weather_grid_snapshots newer
      on newer.point_id = latest.point_id
      and newer.snapshot_date > latest.snapshot_date
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

revoke all on function public.read_aggregated_cell_environment(double precision, double precision, double precision, double precision, integer, integer) from public, anon, authenticated;
grant execute on function public.read_aggregated_cell_environment(double precision, double precision, double precision, double precision, integer, integer) to service_role;

