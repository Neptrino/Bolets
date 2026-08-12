create or replace function public.upsert_spatial_import_batch(
  p_cells jsonb,
  p_weather_points jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cell_rows_written integer;
  weather_rows_written integer;
begin
  if p_cells is null
    or pg_catalog.jsonb_typeof(p_cells) is distinct from 'array' then
    raise exception 'Provide between 1 and 1,000 cells';
  end if;

  if pg_catalog.jsonb_array_length(p_cells) < 1
    or pg_catalog.jsonb_array_length(p_cells) > 1000 then
    raise exception 'Provide between 1 and 1,000 cells';
  end if;

  if p_weather_points is null
    or pg_catalog.jsonb_typeof(p_weather_points) is distinct from 'array' then
    raise exception 'Provide between 1 and 1,000 weather points';
  end if;

  if pg_catalog.jsonb_array_length(p_weather_points) < 1
    or pg_catalog.jsonb_array_length(p_weather_points) > 1000 then
    raise exception 'Provide between 1 and 1,000 weather points';
  end if;

  insert into public.weather_grid_points as existing (
    point_id,
    provider,
    requested_lat,
    requested_lon,
    requested_elevation_m,
    native_resolution_m,
    model,
    updated_at
  )
  select
    incoming.point_id,
    incoming.provider,
    incoming.requested_lat,
    incoming.requested_lon,
    incoming.requested_elevation_m,
    incoming.native_resolution_m,
    incoming.model,
    incoming.updated_at
  from pg_catalog.jsonb_to_recordset(p_weather_points) as incoming(
    point_id text,
    provider text,
    requested_lat real,
    requested_lon real,
    requested_elevation_m real,
    native_resolution_m integer,
    model text,
    updated_at timestamptz
  )
  on conflict (point_id) do update set
    provider = excluded.provider,
    requested_lat = excluded.requested_lat,
    requested_lon = excluded.requested_lon,
    requested_elevation_m = excluded.requested_elevation_m,
    native_resolution_m = excluded.native_resolution_m,
    model = excluded.model,
    updated_at = excluded.updated_at
  where (
    existing.provider,
    existing.requested_lat,
    existing.requested_lon,
    existing.requested_elevation_m,
    existing.native_resolution_m,
    existing.model
  ) is distinct from (
    excluded.provider,
    excluded.requested_lat,
    excluded.requested_lon,
    excluded.requested_elevation_m,
    excluded.native_resolution_m,
    excluded.model
  );

  get diagnostics weather_rows_written = row_count;

  insert into public.spatial_cells as existing (
    cell_id,
    region_id,
    grid_size_m,
    west,
    south,
    east,
    north,
    static_values,
    habitat_cover_counts,
    habitat_cover_codes,
    habitat_cover_shares,
    static_sources,
    source_resolution_m,
    confidence,
    static_verified,
    source_observed_at,
    weather_point_id,
    updated_at
  )
  select
    incoming.cell_id,
    incoming.region_id,
    incoming.grid_size_m,
    incoming.west,
    incoming.south,
    incoming.east,
    incoming.north,
    incoming.static_values,
    incoming.habitat_cover_counts,
    incoming.habitat_cover_codes,
    incoming.habitat_cover_shares,
    incoming.static_sources,
    incoming.source_resolution_m,
    incoming.confidence,
    incoming.static_verified,
    incoming.source_observed_at,
    incoming.weather_point_id,
    incoming.updated_at
  from pg_catalog.jsonb_to_recordset(p_cells) as incoming(
    cell_id text,
    region_id text,
    grid_size_m integer,
    west double precision,
    south double precision,
    east double precision,
    north double precision,
    static_values jsonb,
    habitat_cover_counts bigint,
    habitat_cover_codes smallint[],
    habitat_cover_shares real[],
    static_sources text[],
    source_resolution_m integer,
    confidence text,
    static_verified boolean,
    source_observed_at timestamptz,
    weather_point_id text,
    updated_at timestamptz
  )
  on conflict (cell_id) do update set
    region_id = excluded.region_id,
    grid_size_m = excluded.grid_size_m,
    west = excluded.west,
    south = excluded.south,
    east = excluded.east,
    north = excluded.north,
    static_values = excluded.static_values,
    habitat_cover_counts = excluded.habitat_cover_counts,
    habitat_cover_codes = excluded.habitat_cover_codes,
    habitat_cover_shares = excluded.habitat_cover_shares,
    static_sources = excluded.static_sources,
    source_resolution_m = excluded.source_resolution_m,
    confidence = excluded.confidence,
    static_verified = excluded.static_verified,
    source_observed_at = excluded.source_observed_at,
    weather_point_id = excluded.weather_point_id,
    updated_at = excluded.updated_at
  where (
    existing.region_id,
    existing.grid_size_m,
    existing.west,
    existing.south,
    existing.east,
    existing.north,
    existing.static_values,
    existing.habitat_cover_counts,
    existing.habitat_cover_codes,
    existing.habitat_cover_shares,
    existing.static_sources,
    existing.source_resolution_m,
    existing.confidence,
    existing.static_verified,
    existing.source_observed_at,
    existing.weather_point_id
  ) is distinct from (
    excluded.region_id,
    excluded.grid_size_m,
    excluded.west,
    excluded.south,
    excluded.east,
    excluded.north,
    excluded.static_values,
    excluded.habitat_cover_counts,
    excluded.habitat_cover_codes,
    excluded.habitat_cover_shares,
    excluded.static_sources,
    excluded.source_resolution_m,
    excluded.confidence,
    excluded.static_verified,
    excluded.source_observed_at,
    excluded.weather_point_id
  );

  get diagnostics cell_rows_written = row_count;

  return pg_catalog.jsonb_build_object(
    'cellsWritten', cell_rows_written,
    'weatherPointsWritten', weather_rows_written
  );
end;
$$;

revoke all on function public.upsert_spatial_import_batch(jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_spatial_import_batch(jsonb, jsonb)
  to service_role;

comment on function public.upsert_spatial_import_batch(jsonb, jsonb) is
  'Atomically imports static cells and weather points while leaving semantically unchanged rows untouched.';
