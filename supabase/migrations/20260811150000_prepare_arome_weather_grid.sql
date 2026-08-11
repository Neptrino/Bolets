alter table public.weather_grid_points
  add column if not exists requested_elevation_m real
    check (requested_elevation_m is null or requested_elevation_m between -100 and 5000),
  add column if not exists model text not null default 'best_match';

with grouped_cells as (
  select
    floor(split_part(cell_id, ':', 3)::integer / 10.0)::integer as grid_x,
    floor(split_part(cell_id, ':', 4)::integer / 10.0)::integer as grid_y,
    percentile_cont(0.5) within group (
      order by (static_values ->> 'altitudeM')::double precision
    ) as median_elevation_m
  from public.spatial_cells
  where cell_id ~ '^epsg25831:250:[0-9]+:[0-9]+$'
    and jsonb_typeof(static_values -> 'altitudeM') = 'number'
  group by 1, 2
), prepared_points as (
  select
    'open-meteo:arome-2500:' || grid_x || ':' || grid_y as point_id,
    extensions.st_transform(
      extensions.st_setsrid(
        extensions.st_makepoint(grid_x * 2500 + 1250, grid_y * 2500 + 1250),
        25831
      ),
      4326
    ) as centre,
    median_elevation_m
  from grouped_cells
)
insert into public.weather_grid_points (
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
  point_id,
  'open-meteo',
  extensions.st_y(centre)::real,
  extensions.st_x(centre)::real,
  round(median_elevation_m)::real,
  2500,
  'arome_france',
  now()
from prepared_points
on conflict (point_id) do update set
  requested_lat = excluded.requested_lat,
  requested_lon = excluded.requested_lon,
  requested_elevation_m = excluded.requested_elevation_m,
  native_resolution_m = excluded.native_resolution_m,
  model = excluded.model,
  updated_at = excluded.updated_at;

insert into public.pipeline_sources (
  source_id,
  title,
  source_url,
  source_kind,
  native_resolution_m,
  refresh_cadence,
  license,
  enabled,
  status,
  status_detail
) values (
  'meteofrance-arome',
  'Météo-France AROME via Open-Meteo',
  'https://open-meteo.com/en/docs/meteofrance-api',
  'weather',
  2500,
  'daily',
  'CC BY 4.0',
  true,
  'active',
  'Atmospheric temperature, humidity, precipitation and wind at 2.5 km native resolution, adjusted to the representative terrain elevation.'
)
on conflict (source_id) do update set
  title = excluded.title,
  source_url = excluded.source_url,
  native_resolution_m = excluded.native_resolution_m,
  refresh_cadence = excluded.refresh_cadence,
  license = excluded.license,
  enabled = excluded.enabled,
  status = excluded.status,
  status_detail = excluded.status_detail,
  checked_at = now(),
  updated_at = now();

update public.pipeline_sources
set
  title = 'Open-Meteo soil-moisture model',
  native_resolution_m = 9000,
  status_detail = 'Soil moisture remains a coarser input and is published with its own 9 km resolution metadata.',
  checked_at = now(),
  updated_at = now()
where source_id = 'open-meteo';

delete from public.pipeline_cursors where pipeline = 'spatial-environment';

comment on column public.weather_grid_points.requested_elevation_m is
  'Representative terrain elevation supplied to Open-Meteo statistical downscaling.';

comment on column public.weather_grid_points.model is
  'Explicit atmospheric model requested for this provider-scale point.';
