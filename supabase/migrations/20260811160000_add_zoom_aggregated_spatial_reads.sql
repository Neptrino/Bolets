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
  with requested as (
    select p_grid_size_m / 250 as bucket_factor
    where p_grid_size_m in (500, 1000, 2500, 5000, 10000)
  ),
  candidate_cells as materialized (
    select
      cells.*,
      split_part(cells.cell_id, ':', 3)::integer / requested.bucket_factor as bucket_x,
      split_part(cells.cell_id, ':', 4)::integer / requested.bucket_factor as bucket_y
    from public.spatial_cells cells
    cross join requested
    where cells.static_verified
      and cells.weather_point_id is not null
      and cells.geom operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
  ),
  base as materialized (
    select
      cells.bucket_x,
      cells.bucket_y,
      cells.region_id,
      cells.west,
      cells.south,
      cells.east,
      cells.north,
      greatest(atmosphere_snapshot.observed_at, coalesce(soil_snapshot.observed_at, atmosphere_snapshot.observed_at)) as observed_at,
      cells.static_sources || coalesce(soil_snapshot.sources, '{}'::text[]) || atmosphere_snapshot.sources as sources,
      greatest(cells.source_resolution_m, atmosphere_snapshot.source_resolution_m, coalesce(soil_snapshot.source_resolution_m, 0)) as source_resolution_m,
      case
        when cells.confidence in ('limited', 'unknown') then cells.confidence
        when atmosphere_snapshot.confidence in ('limited', 'unknown') then atmosphere_snapshot.confidence
        when soil_snapshot.confidence in ('limited', 'unknown') then soil_snapshot.confidence
        else atmosphere_snapshot.confidence
      end as confidence,
      atmosphere_snapshot.stale
        or atmosphere_snapshot.observed_at < now() - interval '36 hours'
        or coalesce(soil_snapshot.stale or soil_snapshot.observed_at < now() - interval '36 hours', false) as stale,
      atmosphere_snapshot.unavailable_fields || coalesce(soil_snapshot.unavailable_fields, '{}'::text[]) as unavailable_fields,
      cells.static_values || coalesce(soil_snapshot.values, '{}'::jsonb) || atmosphere_snapshot.values as values
    from candidate_cells cells
    join public.weather_grid_points atmosphere_point
      on atmosphere_point.point_id = cells.weather_point_id
    join lateral (
      select current_snapshot.*
      from public.weather_grid_snapshots current_snapshot
      where current_snapshot.point_id = atmosphere_point.point_id
      order by current_snapshot.snapshot_date desc
      limit 1
    ) atmosphere_snapshot on true
    left join lateral (
      select current_snapshot.*
      from public.weather_grid_snapshots current_snapshot
      where current_snapshot.point_id = atmosphere_point.soil_point_id
      order by current_snapshot.snapshot_date desc
      limit 1
    ) soil_snapshot on true
  ),
  forest_values as (
    select base.bucket_x, base.bucket_y, jsonb_agg(distinct forest_type order by forest_type) as forest_types
    from base
    cross join lateral jsonb_array_elements_text(coalesce(base.values -> 'forestTypes', '[]'::jsonb)) forest(forest_type)
    group by base.bucket_x, base.bucket_y
  ),
  tree_values as (
    select base.bucket_x, base.bucket_y, jsonb_agg(distinct tree_species order by tree_species) as tree_species
    from base
    cross join lateral jsonb_array_elements_text(coalesce(base.values -> 'treeSpecies', '[]'::jsonb)) tree(tree_species)
    group by base.bucket_x, base.bucket_y
  ),
  source_values as (
    select base.bucket_x, base.bucket_y, array_agg(distinct source_name order by source_name) as sources
    from base
    cross join lateral unnest(base.sources) source_value(source_name)
    group by base.bucket_x, base.bucket_y
  ),
  unavailable_values as (
    select base.bucket_x, base.bucket_y, array_agg(distinct field_name order by field_name) as unavailable_fields
    from base
    cross join lateral unnest(base.unavailable_fields) unavailable_value(field_name)
    group by base.bucket_x, base.bucket_y
  ),
  grouped as (
    select
      base.bucket_x,
      base.bucket_y,
      mode() within group (order by base.region_id) as region_id,
      min(base.west) as west,
      min(base.south) as south,
      max(base.east) as east,
      max(base.north) as north,
      max(base.observed_at) as observed_at,
      max(base.source_resolution_m) as source_resolution_m,
      case min(case base.confidence when 'unknown' then 0 when 'limited' then 1 when 'moderate' then 2 else 3 end)
        when 0 then 'unknown' when 1 then 'limited' when 2 then 'moderate' else 'high'
      end as confidence,
      bool_or(base.stale) as stale,
      jsonb_strip_nulls(jsonb_build_object(
        'weatherObservedAt', max(base.values ->> 'weatherObservedAt'),
        'weatherModel', mode() within group (order by base.values ->> 'weatherModel') filter (where base.values ? 'weatherModel'),
        'atmosphericResolutionM', max(nullif(base.values ->> 'atmosphericResolutionM', '')::integer),
        'soilMoistureResolutionM', max(nullif(base.values ->> 'soilMoistureResolutionM', '')::integer),
        'weatherGridLatitude', avg(nullif(base.values ->> 'weatherGridLatitude', '')::double precision),
        'weatherGridLongitude', avg(nullif(base.values ->> 'weatherGridLongitude', '')::double precision),
        'weatherElevationM', round(avg(nullif(base.values ->> 'weatherElevationM', '')::numeric)),
        'soilGridLatitude', avg(nullif(base.values ->> 'soilGridLatitude', '')::double precision),
        'soilGridLongitude', avg(nullif(base.values ->> 'soilGridLongitude', '')::double precision),
        'temperatureC', avg(nullif(base.values ->> 'temperatureC', '')::double precision),
        'temperatureMin24hC', min(nullif(base.values ->> 'temperatureMin24hC', '')::double precision),
        'temperatureAvg24hC', avg(nullif(base.values ->> 'temperatureAvg24hC', '')::double precision),
        'temperatureMax24hC', max(nullif(base.values ->> 'temperatureMax24hC', '')::double precision),
        'temperatureMin7dC', min(nullif(base.values ->> 'temperatureMin7dC', '')::double precision),
        'frostHours7d', max(nullif(base.values ->> 'frostHours7d', '')::integer),
        'relativeHumidity', avg(nullif(base.values ->> 'relativeHumidity', '')::double precision),
        'relativeHumidityMin24h', min(nullif(base.values ->> 'relativeHumidityMin24h', '')::double precision),
        'relativeHumidityAvg24h', avg(nullif(base.values ->> 'relativeHumidityAvg24h', '')::double precision),
        'relativeHumidityMax24h', max(nullif(base.values ->> 'relativeHumidityMax24h', '')::double precision),
        'soilMoisture', avg(nullif(base.values ->> 'soilMoisture', '')::double precision),
        'soilMoistureMin24h', min(nullif(base.values ->> 'soilMoistureMin24h', '')::double precision),
        'soilMoistureAvg24h', avg(nullif(base.values ->> 'soilMoistureAvg24h', '')::double precision),
        'soilMoistureMax24h', max(nullif(base.values ->> 'soilMoistureMax24h', '')::double precision),
        'rainfall7dMm', avg(nullif(base.values ->> 'rainfall7dMm', '')::double precision),
        'windKmh', avg(nullif(base.values ->> 'windKmh', '')::double precision),
        'windAvg24hKmh', avg(nullif(base.values ->> 'windAvg24hKmh', '')::double precision),
        'windMax24hKmh', max(nullif(base.values ->> 'windMax24hKmh', '')::double precision),
        'windGustKmh', avg(nullif(base.values ->> 'windGustKmh', '')::double precision),
        'windGustMax24hKmh', max(nullif(base.values ->> 'windGustMax24hKmh', '')::double precision),
        'altitudeM', round(avg(nullif(base.values ->> 'altitudeM', '')::numeric)),
        'forestCompatibility', avg(nullif(base.values ->> 'forestCompatibility', '')::double precision),
        'soilCompatibility', avg(nullif(base.values ->> 'soilCompatibility', '')::double precision),
        'soilPh', round(avg(nullif(base.values ->> 'soilPh', '')::numeric), 1),
        'soilTexture', mode() within group (order by base.values ->> 'soilTexture') filter (where base.values ? 'soilTexture'),
        'soilSubstrate', mode() within group (order by base.values ->> 'soilSubstrate') filter (where base.values ? 'soilSubstrate')
      )) as values
    from base
    group by base.bucket_x, base.bucket_y
  )
  select
    'epsg25831:' || p_grid_size_m || ':' || grouped.bucket_x || ':' || grouped.bucket_y,
    grouped.region_id,
    grouped.west,
    grouped.south,
    grouped.east,
    grouped.north,
    p_grid_size_m,
    grouped.observed_at,
    coalesce(source_values.sources, '{}'::text[]),
    grouped.source_resolution_m,
    grouped.confidence,
    grouped.stale,
    coalesce(unavailable_values.unavailable_fields, '{}'::text[]),
    grouped.values
      || case when forest_values.forest_types is null then '{}'::jsonb else jsonb_build_object('forestTypes', forest_values.forest_types) end
      || case when tree_values.tree_species is null then '{}'::jsonb else jsonb_build_object('treeSpecies', tree_values.tree_species) end
  from grouped
  left join forest_values using (bucket_x, bucket_y)
  left join tree_values using (bucket_x, bucket_y)
  left join source_values using (bucket_x, bucket_y)
  left join unavailable_values using (bucket_x, bucket_y)
  order by
    power((grouped.west + grouped.east) / 2 - (p_west + p_east) / 2, 2)
      + power((grouped.south + grouped.north) / 2 - (p_south + p_north) / 2, 2),
    grouped.bucket_x,
    grouped.bucket_y
  limit least(greatest(p_limit, 1), 1000);
$$;

revoke all on function public.read_aggregated_cell_environment(double precision, double precision, double precision, double precision, integer, integer) from public, anon, authenticated;
grant execute on function public.read_aggregated_cell_environment(double precision, double precision, double precision, double precision, integer, integer) to service_role;

comment on function public.read_aggregated_cell_environment(double precision, double precision, double precision, double precision, integer, integer) is
  'Returns zoom-adaptive environmental summaries derived from verified 250 m cells. Temporal minima/maxima retain frost, heat and wind risks within each display cell.';
