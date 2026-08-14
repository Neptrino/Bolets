-- Preserve the hydrothermal-v1 trailing windows across live 1 km aggregation
-- and the cached 2.5, 5, and 10 km condition levels used by map scoring.
-- Rainfall-day counts are spatial means; frost and heat hours retain the
-- maximum exposure observed among the provider points represented by a cell.
-- Point ingestion defines a wet day as a trailing 24-hour bin with >= 1 mm,
-- frost as an hour <= 0 C, and heat as an hour >= 27 C.
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
      jsonb_strip_nulls(
        jsonb_build_object(
        'weatherObservedAt', max(latest.values ->> 'weatherObservedAt'),
        'weatherModel', mode() within group (order by latest.values ->> 'weatherModel') filter (where latest.values ? 'weatherModel'),
        'atmosphericResolutionM', max(nullif(latest.values ->> 'atmosphericResolutionM', '')::integer),
        'weatherGridLatitude', avg(nullif(latest.values ->> 'weatherGridLatitude', '')::double precision),
        'weatherGridLongitude', avg(nullif(latest.values ->> 'weatherGridLongitude', '')::double precision),
        'weatherElevationM', round(avg(nullif(latest.values ->> 'weatherElevationM', '')::numeric)),
        'temperatureC', avg(nullif(latest.values ->> 'temperatureC', '')::double precision),
        'temperatureAvg7dC', avg(nullif(latest.values ->> 'temperatureAvg7dC', '')::double precision),
        'temperatureAvg14dC', avg(nullif(latest.values ->> 'temperatureAvg14dC', '')::double precision)
        ) || jsonb_build_object(
        'frostHours14d', max(nullif(latest.values ->> 'frostHours14d', '')::integer),
        'heatHours14d', max(nullif(latest.values ->> 'heatHours14d', '')::integer),
        'temperatureAvg20dC', avg(nullif(latest.values ->> 'temperatureAvg20dC', '')::double precision),
        'frostHours20d', max(nullif(latest.values ->> 'frostHours20d', '')::integer),
        'heatHours20d', max(nullif(latest.values ->> 'heatHours20d', '')::integer),
        'relativeHumidity', avg(nullif(latest.values ->> 'relativeHumidity', '')::double precision),
        'relativeHumidityMin24h', min(nullif(latest.values ->> 'relativeHumidityMin24h', '')::double precision),
        'relativeHumidityAvg24h', avg(nullif(latest.values ->> 'relativeHumidityAvg24h', '')::double precision),
        'relativeHumidityMax24h', max(nullif(latest.values ->> 'relativeHumidityMax24h', '')::double precision),
        'relativeHumidityAvg7d', avg(nullif(latest.values ->> 'relativeHumidityAvg7d', '')::double precision),
        'rainfall3dMm', avg(nullif(latest.values ->> 'rainfall3dMm', '')::double precision),
        'rainfall7dMm', avg(nullif(latest.values ->> 'rainfall7dMm', '')::double precision),
        'rainfallDays7d', avg(nullif(latest.values ->> 'rainfallDays7d', '')::double precision),
        'rainfall14dMm', avg(nullif(latest.values ->> 'rainfall14dMm', '')::double precision),
        'rainfallDays14d', avg(nullif(latest.values ->> 'rainfallDays14d', '')::double precision),
        'rainfall21dMm', avg(nullif(latest.values ->> 'rainfall21dMm', '')::double precision),
        'rainfallDays21d', avg(nullif(latest.values ->> 'rainfallDays21d', '')::double precision),
        'rainfall26dMm', avg(nullif(latest.values ->> 'rainfall26dMm', '')::double precision),
        'rainfallDays26d', avg(nullif(latest.values ->> 'rainfallDays26d', '')::double precision),
        'rainfallPrevious23dMm', avg(nullif(latest.values ->> 'rainfallPrevious23dMm', '')::double precision),
        'rainfall30dMm', avg(nullif(latest.values ->> 'rainfall30dMm', '')::double precision),
        'rainfallDays30d', avg(nullif(latest.values ->> 'rainfallDays30d', '')::double precision),
        'drySpellDays', avg(nullif(latest.values ->> 'drySpellDays', '')::double precision),
        'evapotranspiration3dMm', avg(nullif(latest.values ->> 'evapotranspiration3dMm', '')::double precision),
        'evapotranspiration7dMm', avg(nullif(latest.values ->> 'evapotranspiration7dMm', '')::double precision),
        'evapotranspiration14dMm', avg(nullif(latest.values ->> 'evapotranspiration14dMm', '')::double precision),
        'evapotranspiration21dMm', avg(nullif(latest.values ->> 'evapotranspiration21dMm', '')::double precision),
        'evapotranspiration26dMm', avg(nullif(latest.values ->> 'evapotranspiration26dMm', '')::double precision),
        'evapotranspiration30dMm', avg(nullif(latest.values ->> 'evapotranspiration30dMm', '')::double precision),
        'windKmh', avg(nullif(latest.values ->> 'windKmh', '')::double precision),
        'windAvg24hKmh', avg(nullif(latest.values ->> 'windAvg24hKmh', '')::double precision),
        'windMax24hKmh', max(nullif(latest.values ->> 'windMax24hKmh', '')::double precision),
        'windGustKmh', avg(nullif(latest.values ->> 'windGustKmh', '')::double precision),
        'windGustMax24hKmh', max(nullif(latest.values ->> 'windGustMax24hKmh', '')::double precision)
        )
      ) as values
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

create or replace function public.refresh_spatial_level_conditions(
  p_grid_size_m integer,
  p_snapshot_date date default current_date
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if p_grid_size_m not in (2500, 5000, 10000) then
    raise exception 'Unsupported cached condition grid size: %', p_grid_size_m;
  end if;

  with refreshed as materialized (
    select
      levels.cell_id,
      greatest(atmosphere.observed_at, coalesce(soil.observed_at, atmosphere.observed_at)) as observed_at,
      levels.static_sources || coalesce(soil.sources, '{}'::text[]) || atmosphere.sources as sources,
      greatest(levels.source_resolution_m, atmosphere.source_resolution_m, coalesce(soil.source_resolution_m, 0)) as source_resolution_m,
      case
        when levels.confidence in ('limited', 'unknown') then levels.confidence
        when atmosphere.confidence in ('limited', 'unknown') then atmosphere.confidence
        when soil.confidence in ('limited', 'unknown') then soil.confidence
        else atmosphere.confidence
      end as confidence,
      atmosphere.stale or coalesce(soil.stale, false) as stale,
      atmosphere.unavailable_fields || coalesce(soil.unavailable_fields, '{}'::text[]) as unavailable_fields,
      levels.static_values || coalesce(soil.values, '{}'::jsonb) || atmosphere.values as values
    from public.spatial_cell_levels levels
    join lateral (
      with latest as materialized (
        select distinct on (snapshots.point_id) snapshots.*
        from public.weather_grid_snapshots snapshots
        where snapshots.point_id = any(levels.weather_point_ids)
          and snapshots.snapshot_date <= p_snapshot_date
        order by snapshots.point_id, snapshots.snapshot_date desc
      )
      select
        max(latest.observed_at) as observed_at,
        array(select distinct source_name from latest cross join lateral unnest(latest.sources) source_value(source_name) order by source_name) as sources,
        max(latest.source_resolution_m) as source_resolution_m,
        case min(case latest.confidence when 'unknown' then 0 when 'limited' then 1 when 'moderate' then 2 else 3 end)
          when 0 then 'unknown' when 1 then 'limited' when 2 then 'moderate' else 'high'
        end as confidence,
        bool_or(latest.stale or latest.observed_at < now() - interval '36 hours') as stale,
        array(select distinct field_name from latest cross join lateral unnest(latest.unavailable_fields) unavailable_value(field_name) order by field_name) as unavailable_fields,
        jsonb_strip_nulls(
          jsonb_build_object(
          'weatherObservedAt', max(latest.values ->> 'weatherObservedAt'),
          'weatherModel', mode() within group (order by latest.values ->> 'weatherModel') filter (where latest.values ? 'weatherModel'),
          'atmosphericResolutionM', max(nullif(latest.values ->> 'atmosphericResolutionM', '')::integer),
          'weatherGridLatitude', avg(nullif(latest.values ->> 'weatherGridLatitude', '')::double precision),
          'weatherGridLongitude', avg(nullif(latest.values ->> 'weatherGridLongitude', '')::double precision),
          'weatherElevationM', round(avg(nullif(latest.values ->> 'weatherElevationM', '')::numeric)),
          'temperatureC', avg(nullif(latest.values ->> 'temperatureC', '')::double precision),
          'temperatureAvg7dC', avg(nullif(latest.values ->> 'temperatureAvg7dC', '')::double precision),
          'temperatureAvg14dC', avg(nullif(latest.values ->> 'temperatureAvg14dC', '')::double precision)
          ) || jsonb_build_object(
          'frostHours14d', max(nullif(latest.values ->> 'frostHours14d', '')::integer),
          'heatHours14d', max(nullif(latest.values ->> 'heatHours14d', '')::integer),
          'temperatureAvg20dC', avg(nullif(latest.values ->> 'temperatureAvg20dC', '')::double precision),
          'frostHours20d', max(nullif(latest.values ->> 'frostHours20d', '')::integer),
          'heatHours20d', max(nullif(latest.values ->> 'heatHours20d', '')::integer),
          'relativeHumidity', avg(nullif(latest.values ->> 'relativeHumidity', '')::double precision),
          'relativeHumidityMin24h', min(nullif(latest.values ->> 'relativeHumidityMin24h', '')::double precision),
          'relativeHumidityAvg24h', avg(nullif(latest.values ->> 'relativeHumidityAvg24h', '')::double precision),
          'relativeHumidityMax24h', max(nullif(latest.values ->> 'relativeHumidityMax24h', '')::double precision),
          'relativeHumidityAvg7d', avg(nullif(latest.values ->> 'relativeHumidityAvg7d', '')::double precision),
          'rainfall3dMm', avg(nullif(latest.values ->> 'rainfall3dMm', '')::double precision),
          'rainfall7dMm', avg(nullif(latest.values ->> 'rainfall7dMm', '')::double precision),
          'rainfallDays7d', avg(nullif(latest.values ->> 'rainfallDays7d', '')::double precision),
          'rainfall14dMm', avg(nullif(latest.values ->> 'rainfall14dMm', '')::double precision),
          'rainfallDays14d', avg(nullif(latest.values ->> 'rainfallDays14d', '')::double precision),
          'rainfall21dMm', avg(nullif(latest.values ->> 'rainfall21dMm', '')::double precision),
          'rainfallDays21d', avg(nullif(latest.values ->> 'rainfallDays21d', '')::double precision),
          'rainfall26dMm', avg(nullif(latest.values ->> 'rainfall26dMm', '')::double precision),
          'rainfallDays26d', avg(nullif(latest.values ->> 'rainfallDays26d', '')::double precision),
          'rainfallPrevious23dMm', avg(nullif(latest.values ->> 'rainfallPrevious23dMm', '')::double precision),
          'rainfall30dMm', avg(nullif(latest.values ->> 'rainfall30dMm', '')::double precision),
          'rainfallDays30d', avg(nullif(latest.values ->> 'rainfallDays30d', '')::double precision),
          'drySpellDays', avg(nullif(latest.values ->> 'drySpellDays', '')::double precision),
          'evapotranspiration3dMm', avg(nullif(latest.values ->> 'evapotranspiration3dMm', '')::double precision),
          'evapotranspiration7dMm', avg(nullif(latest.values ->> 'evapotranspiration7dMm', '')::double precision),
          'evapotranspiration14dMm', avg(nullif(latest.values ->> 'evapotranspiration14dMm', '')::double precision),
          'evapotranspiration21dMm', avg(nullif(latest.values ->> 'evapotranspiration21dMm', '')::double precision),
          'evapotranspiration26dMm', avg(nullif(latest.values ->> 'evapotranspiration26dMm', '')::double precision),
          'evapotranspiration30dMm', avg(nullif(latest.values ->> 'evapotranspiration30dMm', '')::double precision),
          'windKmh', avg(nullif(latest.values ->> 'windKmh', '')::double precision),
          'windAvg24hKmh', avg(nullif(latest.values ->> 'windAvg24hKmh', '')::double precision),
          'windMax24hKmh', max(nullif(latest.values ->> 'windMax24hKmh', '')::double precision),
          'windGustKmh', avg(nullif(latest.values ->> 'windGustKmh', '')::double precision),
          'windGustMax24hKmh', max(nullif(latest.values ->> 'windGustMax24hKmh', '')::double precision)
          )
        ) as values
      from latest
    ) atmosphere on atmosphere.observed_at is not null
    left join lateral (
      with latest as materialized (
        select distinct on (snapshots.point_id) snapshots.*
        from public.weather_grid_snapshots snapshots
        where snapshots.point_id = any(levels.soil_point_ids)
          and snapshots.snapshot_date <= p_snapshot_date
        order by snapshots.point_id, snapshots.snapshot_date desc
      )
      select
        max(latest.observed_at) as observed_at,
        array(select distinct source_name from latest cross join lateral unnest(latest.sources) source_value(source_name) order by source_name) as sources,
        max(latest.source_resolution_m) as source_resolution_m,
        case min(case latest.confidence when 'unknown' then 0 when 'limited' then 1 when 'moderate' then 2 else 3 end)
          when 0 then 'unknown' when 1 then 'limited' when 2 then 'moderate' else 'high'
        end as confidence,
        bool_or(latest.stale or latest.observed_at < now() - interval '36 hours') as stale,
        array(select distinct field_name from latest cross join lateral unnest(latest.unavailable_fields) unavailable_value(field_name) order by field_name) as unavailable_fields,
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
      from latest
    ) soil on soil.observed_at is not null
    where levels.grid_size_m = p_grid_size_m
  )
  update public.spatial_cell_levels levels
  set
    condition_snapshot_date = p_snapshot_date,
    condition_observed_at = refreshed.observed_at,
    condition_sources = refreshed.sources,
    condition_source_resolution_m = refreshed.source_resolution_m,
    condition_confidence = refreshed.confidence,
    condition_stale = refreshed.stale,
    condition_unavailable_fields = refreshed.unavailable_fields,
    condition_values = refreshed.values,
    updated_at = now()
  from refreshed
  where levels.cell_id = refreshed.cell_id;

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

revoke all on function public.read_aggregated_cell_environment(double precision, double precision, double precision, double precision, integer, integer) from public, anon, authenticated;
grant execute on function public.read_aggregated_cell_environment(double precision, double precision, double precision, double precision, integer, integer) to service_role;

revoke all on function public.refresh_spatial_level_conditions(integer, date) from public, anon, authenticated;
grant execute on function public.refresh_spatial_level_conditions(integer, date) to service_role;

comment on function public.read_aggregated_cell_environment(double precision, double precision, double precision, double precision, integer, integer) is
  'Returns zoom-adaptive conditions while preserving hydrothermal-v1 temperature exposure and 3/7/14/21/26/30-day rain and ET0 windows.';

comment on function public.refresh_spatial_level_conditions(integer, date) is
  'Refreshes coarse current-condition caches while preserving hydrothermal-v1 temperature exposure and 3/7/14/21/26/30-day rain and ET0 windows.';
