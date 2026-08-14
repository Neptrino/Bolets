-- Keep one publishable daily forecast issue, and rebuild it automatically when
-- a later same-day observation would make its calibration seam unsafe.
--
-- The project is intentionally bounded to one completed issue in hot storage:
-- a complete 500-point issue contains 3,000 JSON rows, so date-based retention
-- would exhaust the database allowance while adding no value to the reader.

alter table public.weather_forecast_issues
  add column if not exists completed_at timestamptz;

grant update, delete on table public.weather_forecast_issues to service_role;

create or replace function public.complete_weather_forecast_issue(
  p_snapshot_date date,
  p_generated_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_points integer;
  stored_rows integer;
  stored_points integer;
  stored_horizons integer;
  unavailable_rows integer;
begin
  if not pg_try_advisory_xact_lock(91600348) then
    return false;
  end if;

  select count(*)
  into expected_points
  from public.weather_grid_points
  where model = 'best_match';

  select
    count(*),
    count(distinct point_id),
    count(distinct horizon_hours),
    count(*) filter (where cardinality(unavailable_fields) > 0)
  into stored_rows, stored_points, stored_horizons, unavailable_rows
  from public.weather_grid_forecasts
  where snapshot_date = p_snapshot_date
    and generated_at = p_generated_at;

  if expected_points = 0
    or stored_rows <> expected_points * 6
    or stored_points <> expected_points
    or stored_horizons <> 6
    or unavailable_rows <> 0
  then
    return false;
  end if;

  update public.weather_forecast_issues
  set completed_at = coalesce(completed_at, now())
  where snapshot_date = p_snapshot_date
    and generated_at = p_generated_at;

  return found;
end;
$$;

revoke all on function public.complete_weather_forecast_issue(date, timestamptz)
  from public, anon, authenticated;
grant execute on function public.complete_weather_forecast_issue(date, timestamptz)
  to service_role;

-- Existing issues predate the completion marker. Mark only issues whose full
-- six-horizon point matrix is present and publishable.
with expected as (
  select count(*)::integer as point_count
  from public.weather_grid_points
  where model = 'best_match'
), complete_issues as (
  select forecasts.snapshot_date, forecasts.generated_at
  from public.weather_grid_forecasts forecasts
  cross join expected
  group by forecasts.snapshot_date, forecasts.generated_at, expected.point_count
  having expected.point_count > 0
    and count(*) = expected.point_count * 6
    and count(distinct forecasts.point_id) = expected.point_count
    and count(distinct forecasts.horizon_hours) = 6
    and count(*) filter (where cardinality(forecasts.unavailable_fields) > 0) = 0
)
update public.weather_forecast_issues issues
set completed_at = coalesce(issues.completed_at, issues.generated_at)
from complete_issues
where issues.snapshot_date = complete_issues.snapshot_date
  and issues.generated_at = complete_issues.generated_at;

create or replace function public.prune_weather_forecast_issues(
  p_keep_complete integer default 1
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  oldest_retained_generated_at timestamptz;
  deleted_forecast_rows integer := 0;
  deleted_issue_rows integer := 0;
begin
  if p_keep_complete < 1 or p_keep_complete > 2 then
    raise exception 'p_keep_complete must be between 1 and 2';
  end if;

  if not pg_try_advisory_xact_lock(91600348) then
    return jsonb_build_object(
      'pruned', false,
      'reason', 'locked',
      'deletedForecastRows', 0,
      'deletedIssueRows', 0
    );
  end if;

  select min(retained.generated_at)
  into oldest_retained_generated_at
  from (
    select generated_at
    from public.weather_forecast_issues
    where completed_at is not null
    order by generated_at desc
    limit p_keep_complete
  ) retained;

  if oldest_retained_generated_at is null then
    return jsonb_build_object(
      'pruned', false,
      'reason', 'no-complete-issue',
      'deletedForecastRows', 0,
      'deletedIssueRows', 0
    );
  end if;

  delete from public.weather_grid_forecasts
  where generated_at < oldest_retained_generated_at;
  get diagnostics deleted_forecast_rows = row_count;

  delete from public.weather_forecast_issues
  where generated_at < oldest_retained_generated_at;
  get diagnostics deleted_issue_rows = row_count;

  return jsonb_build_object(
    'pruned', deleted_forecast_rows > 0 or deleted_issue_rows > 0,
    'deletedForecastRows', deleted_forecast_rows,
    'deletedIssueRows', deleted_issue_rows,
    'oldestRetainedGeneratedAt', oldest_retained_generated_at
  );
end;
$$;

revoke all on function public.prune_weather_forecast_issues(integer)
  from public, anon, authenticated;
grant execute on function public.prune_weather_forecast_issues(integer)
  to service_role;

create or replace function public.reconcile_weather_forecast_issue(
  p_snapshot_date date,
  p_max_anchor_gap interval default interval '8 hours'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  observed_streams integer;
  observed_cycle_completed_at timestamptz;
  issue_generated_at timestamptz;
  issue_completed_at timestamptz;
  baseline_valid_at timestamptz;
  anchor_gap interval;
  deleted_forecast_rows integer := 0;
begin
  if p_max_anchor_gap <= interval '0 hours'
    or p_max_anchor_gap > interval '12 hours'
  then
    raise exception 'p_max_anchor_gap must be above 0 and at most 12 hours';
  end if;

  if not pg_try_advisory_xact_lock(91600348) then
    return jsonb_build_object('realigned', false, 'issueComplete', false, 'reason', 'locked');
  end if;

  select count(*), min(updated_at)
  into observed_streams, observed_cycle_completed_at
  from public.pipeline_cursors
  where pipeline in ('spatial-atmosphere', 'spatial-soil')
    and snapshot_date = p_snapshot_date
    and last_cell_id = '__complete__';

  if observed_streams <> 2 then
    return jsonb_build_object(
      'realigned', false,
      'issueComplete', false,
      'reason', 'observations-incomplete'
    );
  end if;

  select generated_at, completed_at
  into issue_generated_at, issue_completed_at
  from public.weather_forecast_issues
  where snapshot_date = p_snapshot_date;

  if issue_generated_at is null then
    return jsonb_build_object('realigned', false, 'issueComplete', false, 'reason', 'no-issue');
  end if;

  if issue_completed_at is null then
    return jsonb_build_object(
      'realigned', false,
      'issueComplete', false,
      'reason', 'issue-incomplete',
      'generatedAt', issue_generated_at
    );
  end if;

  select min(valid_at)
  into baseline_valid_at
  from public.weather_grid_forecasts
  where snapshot_date = p_snapshot_date
    and generated_at = issue_generated_at
    and horizon_hours = 0;

  if baseline_valid_at is null then
    return jsonb_build_object(
      'realigned', false,
      'issueComplete', false,
      'reason', 'baseline-missing',
      'generatedAt', issue_generated_at
    );
  end if;

  anchor_gap := observed_cycle_completed_at - baseline_valid_at;
  if anchor_gap <= p_max_anchor_gap then
    return jsonb_build_object(
      'realigned', false,
      'issueComplete', true,
      'reason', 'aligned',
      'generatedAt', issue_generated_at,
      'baselineValidAt', baseline_valid_at,
      'observedCycleCompletedAt', observed_cycle_completed_at,
      'anchorGapSeconds', extract(epoch from anchor_gap)
    );
  end if;

  delete from public.weather_grid_forecasts
  where snapshot_date = p_snapshot_date
    and generated_at = issue_generated_at;
  get diagnostics deleted_forecast_rows = row_count;

  delete from public.weather_forecast_issues
  where snapshot_date = p_snapshot_date
    and generated_at = issue_generated_at;

  delete from public.pipeline_cursors
  where pipeline = 'spatial-forecast-v2'
    and snapshot_date = p_snapshot_date;

  return jsonb_build_object(
    'realigned', true,
    'issueComplete', false,
    'reason', 'observation-past-baseline',
    'previousGeneratedAt', issue_generated_at,
    'baselineValidAt', baseline_valid_at,
    'observedCycleCompletedAt', observed_cycle_completed_at,
    'anchorGapSeconds', extract(epoch from anchor_gap),
    'deletedForecastRows', deleted_forecast_rows
  );
end;
$$;

revoke all on function public.reconcile_weather_forecast_issue(date, interval)
  from public, anon, authenticated;
grant execute on function public.reconcile_weather_forecast_issue(date, interval)
  to service_role;

update public.pipeline_sources
set
  refresh_cadence = 'daily; automatically realigned after a late same-day observation refresh',
  status_detail = case source_id
    when 'ecmwf-ifs-hres-forecast' then
      'One complete five-day issue is retained. A late same-day observation refresh automatically replaces an unsafe calibration seam.'
    else
      'One complete shallow-soil forecast issue is retained and rebuilt with the atmospheric issue when same-day observations move past its safe calibration seam.'
  end,
  checked_at = now(),
  updated_at = now()
where source_id in ('ecmwf-ifs-hres-forecast', 'open-meteo-soil-forecast');

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
    delete from public.weather_grid_snapshots where snapshot_date < current_date - 7;
    get diagnostics weather_grid_deleted = row_count;

    forecast_prune := public.prune_weather_forecast_issues(1);
    forecasts_deleted := coalesce((forecast_prune ->> 'deletedForecastRows')::integer, 0);
    forecast_issues_deleted := coalesce((forecast_prune ->> 'deletedIssueRows')::integer, 0);

    delete from public.ingestion_runs where started_at < now() - interval '90 days';
    get diagnostics runs_deleted = row_count;
    delete from cron.job_run_details where end_time < now() - interval '48 hours';
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
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'vacuum-weather-grid-forecasts';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'vacuum-weather-grid-forecasts',
  '40 6 * * *',
  'vacuum (analyze) public.weather_grid_forecasts'
);

comment on table public.weather_forecast_issues is
  'Daily forecast issue allocations. completed_at is set only after all points and six horizons are complete and publishable.';

comment on function public.reconcile_weather_forecast_issue(date, interval) is
  'Invalidates a completed same-day issue only after both observed streams have moved beyond its safe calibration seam.';

comment on function public.prune_weather_forecast_issues(integer) is
  'Retains the newest completed issue plus any newer in-progress issue, bounding forecast storage without removing the reader fallback.';
