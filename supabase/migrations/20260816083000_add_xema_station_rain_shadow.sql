-- Meteocat XEMA station precipitation, retained as a private shadow stream.
-- Gauge accumulations are observed ground truth for past rain; every
-- numerical model's archived "past hours" keep whatever the run predicted,
-- so a mis-placed convective storm stays invisible to the production rain
-- windows forever. No prediction, current-weather or scoring table reads
-- these rows until the versioned station-versus-model comparison validates
-- a correction into the unified water model.

alter table public.ingestion_runs
  drop constraint if exists ingestion_runs_pipeline_check;

alter table public.ingestion_runs
  add constraint ingestion_runs_pipeline_check
  check (pipeline in (
    'regional-environment',
    'spatial-environment',
    'spatial-atmosphere',
    'spatial-atmosphere-shadow',
    'spatial-soil',
    'spatial-soil-satellite',
    'spatial-static-import',
    'species-occurrences',
    'station-rain',
    'retention'
  ));

create table public.xema_stations (
  station_code text primary key check (station_code ~ '^[A-Z0-9]{1,4}$'),
  station_name text not null check (char_length(station_name) between 1 and 120),
  latitude real not null check (latitude between 40.3 and 43.0),
  longitude real not null check (longitude between -0.5 and 3.5),
  altitude_m real not null check (altitude_m between -5 and 3500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Hourly gauge accumulations collapsed from the official semi-hourly feed.
-- sample_count records how many distinct half hours support the hour, so
-- consumers can require complete hours instead of reading an outage as a
-- dry hour. The table holds a bounded rolling operational window; deeper
-- history stays at the provider and is fetched on demand for evaluation.
create table public.xema_station_rain_hours (
  station_code text not null references public.xema_stations(station_code) on delete cascade,
  hour_start timestamptz not null,
  precipitation_mm real not null check (precipitation_mm >= 0 and precipitation_mm <= 240),
  sample_count smallint not null check (sample_count between 1 and 2),
  run_id uuid references public.ingestion_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (station_code, hour_start)
);

create index xema_station_rain_hours_hour_idx
  on public.xema_station_rain_hours (hour_start desc);

alter table public.xema_stations enable row level security;
alter table public.xema_station_rain_hours enable row level security;

revoke all on table public.xema_stations from public, anon, authenticated;
revoke all on table public.xema_station_rain_hours from public, anon, authenticated;
grant select, insert, update, delete on table public.xema_stations to service_role;
grant select, insert, update, delete on table public.xema_station_rain_hours to service_role;

comment on table public.xema_stations is
  'Meteocat XEMA automatic stations (CC BY 4.0, Dades Obertes de Catalunya). Station coordinates are public infrastructure locations, never observation or ecological sites.';

comment on table public.xema_station_rain_hours is
  'Observed hourly gauge precipitation, shadow evidence only. Production rain windows stay on the model provider until a versioned comparison validates the station correction.';

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
  'meteocat-xema-rain',
  'Meteocat XEMA semi-hourly station precipitation',
  'https://analisi.transparenciacatalunya.cat/resource/nzvn-apee.json',
  'weather',
  -- Point gauges have no raster resolution; this records the network's
  -- median station spacing across Catalonia as the effective sampling scale.
  13000,
  'semi-hourly readings, roughly one hour of provider latency',
  'CC BY 4.0 (Meteocat / Dades Obertes de Catalunya)',
  true,
  'active',
  'Observed station rain is stored as a private shadow stream; production rain windows remain on the model provider pending the versioned station-versus-model validation.'
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

select cron.unschedule(jobid)
from cron.job
where jobname = 'import-xema-rain-hourly';

-- Minute 50 keeps each hour's ingest behind the provider's ~1 h latency and
-- ahead of the nightly spatial refresh windows.
select cron.schedule(
  'import-xema-rain-hourly',
  '50 * * * *',
  $schedule$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/import-xema-rain',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'x-ingestion-token', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')
      ),
      body := '{"trigger":"cron"}'::jsonb,
      timeout_milliseconds := 120000
    );
  $schedule$
);
