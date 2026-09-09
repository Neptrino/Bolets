-- Versioned observation/model blend; all raw inputs remain service-role only.
alter table public.ingestion_runs drop constraint ingestion_runs_pipeline_check;
alter table public.ingestion_runs add constraint ingestion_runs_pipeline_check check (pipeline in (
  'regional-environment','spatial-environment','spatial-atmosphere','spatial-atmosphere-shadow',
  'spatial-soil','spatial-soil-satellite','spatial-static-import','species-occurrences','station-rain','station-temperature','retention'
));
create table public.xema_temperature_days (
  day date primary key, stations jsonb not null, hours jsonb not null,
  raw_readings jsonb not null, quality jsonb not null,
  run_id uuid references public.ingestion_runs(id) on delete set null,
  fetched_at timestamptz not null default now()
);
create table public.station_temperature_windows (
  id text primary key check (id ~ '^[a-f0-9]{64}$'), payload jsonb not null,
  version text not null, valid_at timestamptz not null, unique(version, valid_at),
  created_at timestamptz not null default now()
);
create table public.thermal_model_windows (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  station_window_id text not null references public.station_temperature_windows(id) on delete cascade,
  payload jsonb not null, created_at timestamptz not null default now()
);
create index thermal_model_windows_retention on public.thermal_model_windows(created_at);
create index station_temperature_windows_retention on public.station_temperature_windows(created_at);
alter table public.xema_temperature_days enable row level security;
alter table public.station_temperature_windows enable row level security;
alter table public.thermal_model_windows enable row level security;
revoke all on public.xema_temperature_days, public.station_temperature_windows, public.thermal_model_windows from public, anon, authenticated;
grant select, insert, update, delete on public.xema_temperature_days to service_role;
-- Revoke default Supabase privileges before allowing immutable inserts.
revoke all on public.station_temperature_windows, public.thermal_model_windows from service_role;
-- Content-addressed windows are immutable after insertion.
grant select, insert, delete on public.station_temperature_windows, public.thermal_model_windows to service_role;
comment on table public.xema_temperature_days is 'XEMA variable 32, CC BY 4.0 Meteocat. Complete UTC interval means; V plus published provisional T/blank, never invalid flags. Raw flags retained. 35-day operational retention.';
comment on table public.thermal_model_windows is 'Private exact 480-hour representative AROME control, content addressed with its frozen station window. Snapshot references are published atomically with the existing atmospheric generation; missing evidence keeps baseline scores.';

-- The existing optional-array merge preserves source multiplicity and rejects
-- a parent missing any contributing point. References are resolved server-side.
do $migration$
declare target regprocedure; definition text;
  needle text := $needle$'weatherElevationM', round(avg(nullif(latest.values ->> 'weatherElevationM', '')::numeric)),$needle$;
  addition text := $addition$
        'thermalSources', public.merge_thermal_exposure(jsonb_agg(latest.values -> 'thermalSources')),$addition$;
begin
  foreach target in array array[
    'public.read_aggregated_cell_environment(double precision,double precision,double precision,double precision,integer,integer)'::regprocedure,
    'public.refresh_spatial_level_conditions(integer,date)'::regprocedure
  ] loop
    definition := pg_get_functiondef(target);
    if (length(definition) - length(replace(definition, needle, ''))) / length(needle) <> 1 then
      raise exception 'Thermal source insertion point changed in %', target;
    end if;
    execute replace(definition, needle, needle || addition);
  end loop;
end;
$migration$;

insert into public.pipeline_sources(source_id,title,source_url,source_kind,native_resolution_m,refresh_cadence,license,enabled,status,status_detail)
values ('meteocat-xema-temperature','Meteocat XEMA temperature',
'https://analisi.transparenciacatalunya.cat/resource/nzvn-apee.json','weather',13000,
'Published half-hour means; import every three hours','CC BY 4.0 (Meteocat / Dades Obertes de Catalunya)',true,'degraded',
'Awaiting first import. Eight evaluated stations; 50/50 AROME blend with complete-window fallback. Station observations are not 250 m measurements.');
select cron.schedule('import-xema-temperature','17 */3 * * *',$schedule$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/import-xema-temperature',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
      'apikey',(select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
      'x-ingestion-token',(select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')),
    body := '{"trigger":"cron"}'::jsonb, timeout_milliseconds := 120000);
$schedule$);

-- Bounded maintenance: attach optional inputs first, then let the established
-- database publication jobs rebuild all caches and advance their identities.
create function public.request_station_temperature_republication()
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if not pg_try_advisory_xact_lock(91600347) or not pg_try_advisory_xact_lock(91600348) then return false; end if;
  delete from public.pipeline_cursors where pipeline in ('spatial-condition-coarse','spatial-condition-territorial')
    and snapshot_date = current_date;
  return true;
end;
$$;
revoke all on function public.request_station_temperature_republication() from public, anon, authenticated;
grant execute on function public.request_station_temperature_republication() to service_role;

-- Complete the daily optional attachment after delayed station observations
-- arrive. Each authenticated invocation handles at most 100 model points.
select cron.schedule('refresh-station-temperature','*/3 * * * *',$schedule$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/refresh-station-temperature',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
      'apikey',(select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
      'x-ingestion-token',(select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')),
    body := '{"trigger":"cron"}'::jsonb, timeout_milliseconds := 120000);
$schedule$);
