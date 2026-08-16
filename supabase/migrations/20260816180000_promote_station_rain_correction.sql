-- Promotes past precipitation to station-rain-v1: gauge inverse-distance
-- hours where the XEMA network is dense enough, the seamless Météo-France
-- blend elsewhere. Decision evidence (2026-08-16 twelve-run sweep, six cells
-- x two seasons vs interpolated gauges): pinned AROME missed 9 real storms
-- and produced 16 phantom ones; meteofrance_seamless had the best event
-- discipline of the four candidate models. Thermal fields remain on AROME.

-- Serves the complete-hour gauge matrix to the spatial refresh in one
-- compact response. Hours are keyed in Europe/Madrid local time to match
-- the provider's hourly axis exactly, including DST transitions.
create or replace function public.get_xema_rain_matrix(p_hours integer default 744)
returns table (
  station_code text,
  latitude real,
  longitude real,
  hours jsonb
)
language sql
security invoker
set search_path = public
as $$
  select
    s.station_code,
    s.latitude,
    s.longitude,
    jsonb_object_agg(
      to_char(h.hour_start at time zone 'Europe/Madrid', 'YYYY-MM-DD"T"HH24:MI'),
      round(h.precipitation_mm::numeric, 1)
    ) as hours
  from public.xema_stations s
  join public.xema_station_rain_hours h using (station_code)
  where h.hour_start >= pg_catalog.now() - make_interval(hours => least(greatest(p_hours, 1), 2000))
    and h.sample_count = 2
  group by s.station_code, s.latitude, s.longitude
$$;

revoke all on function public.get_xema_rain_matrix(integer) from public, anon, authenticated;
grant execute on function public.get_xema_rain_matrix(integer) to service_role;

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
  'meteofrance-seamless-precipitation',
  'Météo-France seamless past precipitation via Open-Meteo',
  'https://open-meteo.com/en/docs/meteofrance-api',
  'weather',
  2500,
  'daily with the spatial atmosphere refresh',
  'CC BY 4.0 (Open-Meteo) / Licence Ouverte (Météo-France)',
  true,
  'active',
  'Fallback past-precipitation source of station-rain-v1 for hours or cells the XEMA gauge field cannot cover. Thermal fields remain on AROME.'
)
on conflict (source_id) do update set
  title = excluded.title,
  source_url = excluded.source_url,
  source_kind = excluded.source_kind,
  native_resolution_m = excluded.native_resolution_m,
  refresh_cadence = excluded.refresh_cadence,
  license = excluded.license,
  enabled = excluded.enabled,
  status = excluded.status,
  status_detail = excluded.status_detail,
  checked_at = pg_catalog.now(),
  updated_at = pg_catalog.now();

update public.pipeline_sources set
  status_detail = 'Observed station rain feeds the promoted station-rain-v1 past-precipitation correction in the spatial refresh; hours with a thin or incomplete nearby network fall back to the seamless model blend.',
  updated_at = pg_catalog.now()
where source_id = 'meteocat-xema-rain';
