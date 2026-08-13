create table public.weather_grid_forecasts (
  id uuid primary key default gen_random_uuid(),
  point_id text not null references public.weather_grid_points(point_id) on delete cascade,
  snapshot_date date not null,
  generated_at timestamptz not null,
  valid_at timestamptz not null,
  horizon_hours smallint not null check (horizon_hours in (24, 48, 72, 96, 120)),
  sources text[] not null default '{}',
  source_resolution_m integer not null check (source_resolution_m > 0),
  confidence text not null check (confidence in ('high', 'moderate', 'limited', 'unknown')),
  unavailable_fields text[] not null default '{}',
  "values" jsonb not null default '{}'::jsonb,
  run_id uuid references public.ingestion_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (point_id, snapshot_date, horizon_hours),
  check (valid_at > generated_at)
);

create index weather_grid_forecasts_point_date_idx
  on public.weather_grid_forecasts (point_id, snapshot_date desc, horizon_hours);

create index weather_grid_forecasts_run_id_idx
  on public.weather_grid_forecasts (run_id)
  where run_id is not null;

alter table public.weather_grid_forecasts enable row level security;

revoke all on table public.weather_grid_forecasts from public, anon, authenticated;
grant select, insert, update, delete on table public.weather_grid_forecasts to service_role;

insert into public.pipeline_sources (
  source_id, title, source_url, source_kind, native_resolution_m,
  refresh_cadence, license, enabled, status, status_detail
) values (
  'ecmwf-ifs-hres-forecast',
  'ECMWF IFS HRES via Open-Meteo',
  'https://open-meteo.com/en/docs/ecmwf-api',
  'weather',
  9000,
  'daily',
  'CC BY 4.0',
  true,
  'active',
  'Homogeneous 9 km atmospheric forecast used only for the five-day projected suitability trend. Current-condition maps remain on Météo-France AROME.'
), (
  'open-meteo-soil-forecast',
  'Open-Meteo 3–9 cm soil-moisture forecast',
  'https://open-meteo.com/en/docs',
  'weather',
  9000,
  'daily',
  'CC BY 4.0',
  true,
  'active',
  'Hourly shallow-soil forecast used only for the five-day projected suitability trend and tracked separately from ECMWF atmosphere.'
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
  checked_at = now(),
  updated_at = now();

create or replace function public.run_environment_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id uuid;
  regional_deleted integer := 0;
  cell_deleted integer := 0;
  weather_grid_deleted integer := 0;
  forecasts_deleted integer := 0;
  runs_deleted integer := 0;
  cron_runs_deleted integer := 0;
  error_text text;
begin
  insert into public.ingestion_runs (pipeline, trigger_type, status, snapshot_date, metadata)
  values ('retention', 'cron', 'running', current_date, '{}'::jsonb)
  returning id into run_id;

  begin
    delete from public.environment_snapshots where snapshot_date < current_date - 45;
    get diagnostics regional_deleted = row_count;
    delete from public.cell_environment_snapshots where snapshot_date < current_date - 7;
    get diagnostics cell_deleted = row_count;
    delete from public.weather_grid_snapshots where snapshot_date < current_date - 7;
    get diagnostics weather_grid_deleted = row_count;
    delete from public.weather_grid_forecasts where snapshot_date < current_date - 2;
    get diagnostics forecasts_deleted = row_count;
    delete from public.ingestion_runs where started_at < now() - interval '90 days';
    get diagnostics runs_deleted = row_count;
    delete from cron.job_run_details where end_time < now() - interval '48 hours';
    get diagnostics cron_runs_deleted = row_count;

    update public.ingestion_runs set
      status = 'succeeded', completed_at = now(),
      rows_read = regional_deleted + cell_deleted + weather_grid_deleted + forecasts_deleted + runs_deleted + cron_runs_deleted,
      rows_written = 0,
      metadata = jsonb_build_object(
        'regionalDeleted', regional_deleted,
        'cellDeleted', cell_deleted,
        'weatherGridDeleted', weather_grid_deleted,
        'forecastsDeleted', forecasts_deleted,
        'runsDeleted', runs_deleted,
        'cronRunsDeleted', cron_runs_deleted
      )
    where id = run_id;
  exception when others then
    get stacked diagnostics error_text = message_text;
    update public.ingestion_runs
    set status = 'failed', completed_at = now(), error_message = error_text
    where id = run_id;
    return jsonb_build_object('runId', run_id, 'status', 'failed');
  end;

  return jsonb_build_object(
    'runId', run_id,
    'status', 'succeeded',
    'regionalDeleted', regional_deleted,
    'cellDeleted', cell_deleted,
    'weatherGridDeleted', weather_grid_deleted,
    'forecastsDeleted', forecasts_deleted,
    'runsDeleted', runs_deleted,
    'cronRunsDeleted', cron_runs_deleted
  );
end;
$$;

revoke all on function public.run_environment_retention()
  from public, anon, authenticated;
grant execute on function public.run_environment_retention()
  to service_role;

-- A deployment later in the day must still populate the first forecast run.
delete from public.pipeline_cursors where pipeline = 'spatial-forecast';

comment on table public.weather_grid_forecasts is
  'Future-valid normalized weather kept separate from observed snapshots so latest-observation readers can never select a forecast row.';
