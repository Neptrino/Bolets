-- A seven-day window lets the UI show a meaningful per-cell score trend while
-- remaining bounded. The snapshots already contain all rolling model inputs.
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
    delete from public.ingestion_runs where started_at < now() - interval '90 days';
    get diagnostics runs_deleted = row_count;
    delete from cron.job_run_details where end_time < now() - interval '48 hours';
    get diagnostics cron_runs_deleted = row_count;

    update public.ingestion_runs set
      status = 'succeeded', completed_at = now(),
      rows_read = regional_deleted + cell_deleted + weather_grid_deleted + runs_deleted + cron_runs_deleted,
      rows_written = 0,
      metadata = jsonb_build_object('regionalDeleted', regional_deleted, 'cellDeleted', cell_deleted, 'weatherGridDeleted', weather_grid_deleted, 'runsDeleted', runs_deleted, 'cronRunsDeleted', cron_runs_deleted)
    where id = run_id;
  exception when others then
    get stacked diagnostics error_text = message_text;
    update public.ingestion_runs set status = 'failed', completed_at = now(), error_message = error_text where id = run_id;
    return jsonb_build_object('runId', run_id, 'status', 'failed');
  end;

  return jsonb_build_object('runId', run_id, 'status', 'succeeded', 'regionalDeleted', regional_deleted, 'cellDeleted', cell_deleted, 'weatherGridDeleted', weather_grid_deleted, 'runsDeleted', runs_deleted, 'cronRunsDeleted', cron_runs_deleted);
end;
$$;

revoke all on function public.run_environment_retention()
  from public, anon, authenticated;
grant execute on function public.run_environment_retention()
  to service_role;
