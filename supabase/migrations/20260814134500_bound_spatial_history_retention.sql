-- Four complete observed grid dates fit the hosted database safely. Prune and
-- vacuum before the next UTC ingestion cycle so the new date reuses the oldest
-- date's heap pages instead of crossing the Free database limit.

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
  forecast_issues_deleted integer := 0;
  forecast_prune jsonb := '{}'::jsonb;
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
    delete from public.weather_grid_snapshots where snapshot_date < current_date - 3;
    get diagnostics weather_grid_deleted = row_count;

    forecast_prune := public.prune_weather_forecast_issues(1);
    forecasts_deleted := coalesce((forecast_prune ->> 'deletedForecastRows')::integer, 0);
    forecast_issues_deleted := coalesce((forecast_prune ->> 'deletedIssueRows')::integer, 0);

    delete from public.ingestion_runs where started_at < now() - interval '90 days';
    get diagnostics runs_deleted = row_count;
    delete from cron.job_run_details where end_time < now() - interval '24 hours';
    get diagnostics cron_runs_deleted = row_count;

    update public.ingestion_runs set
      status = 'succeeded', completed_at = now(),
      rows_read = regional_deleted + cell_deleted + weather_grid_deleted + forecasts_deleted + forecast_issues_deleted + runs_deleted + cron_runs_deleted,
      rows_written = 0,
      metadata = jsonb_build_object(
        'regionalDeleted', regional_deleted,
        'cellDeleted', cell_deleted,
        'weatherGridDeleted', weather_grid_deleted,
        'forecastsDeleted', forecasts_deleted,
        'forecastIssuesDeleted', forecast_issues_deleted,
        'forecastPrune', forecast_prune,
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
    'forecastIssuesDeleted', forecast_issues_deleted,
    'runsDeleted', runs_deleted,
    'cronRunsDeleted', cron_runs_deleted
  );
end;
$$;

revoke all on function public.run_environment_retention()
  from public, anon, authenticated;
grant execute on function public.run_environment_retention()
  to service_role;

do $$
declare
  job_name text;
  existing_job_id bigint;
begin
  foreach job_name in array array[
    'bolets-pipeline-retention',
    'refresh-spatial-environment',
    'refresh-spatial-soil',
    'vacuum-weather-grid-snapshots',
    'vacuum-cron-job-run-details'
  ] loop
    select jobid into existing_job_id from cron.job where jobname = job_name;
    if existing_job_id is not null then perform cron.unschedule(existing_job_id); end if;
    existing_job_id := null;
  end loop;
end
$$;

select cron.schedule(
  'bolets-pipeline-retention',
  '0 0 * * *',
  'select public.run_environment_retention();'
);

select cron.schedule(
  'vacuum-weather-grid-snapshots',
  '2 0 * * *',
  'vacuum (analyze) public.weather_grid_snapshots'
);

select cron.schedule(
  'vacuum-cron-job-run-details',
  '3 0 * * *',
  'vacuum (analyze) cron.job_run_details'
);

select cron.schedule(
  'refresh-spatial-environment',
  '5-59/2 * * * *',
  $schedule$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/refresh-spatial-environment',
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

select cron.schedule(
  'refresh-spatial-soil',
  '6-59/5 * * * *',
  $schedule$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/refresh-spatial-soil',
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
