-- A forecast can only be calibrated once both observed streams have finished.
-- The cycle completion time is therefore the later cursor update, not the
-- earlier one. Using the earlier update kept a midnight forecast published
-- after a late atmospheric refresh and the application correctly withheld it.

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

  select generated_at, completed_at
  into issue_generated_at, issue_completed_at
  from public.weather_forecast_issues
  where snapshot_date = p_snapshot_date;

  select count(*), max(updated_at)
  into observed_streams, observed_cycle_completed_at
  from public.pipeline_cursors
  where pipeline in ('spatial-atmosphere', 'spatial-soil')
    and snapshot_date = p_snapshot_date
    and last_cell_id = '__complete__';

  if observed_streams <> 2 then
    return jsonb_build_object(
      'realigned', false,
      'issueComplete', issue_completed_at is not null,
      'reason', 'observations-incomplete',
      'generatedAt', issue_generated_at
    );
  end if;

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

comment on function public.reconcile_weather_forecast_issue(date, interval) is
  'Preserves a completed issue while observations refresh, then compares its baseline with the later of the completed observed-stream cursors before rebuilding it.';
