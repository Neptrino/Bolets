-- Forecast windows now use verified AROME history through horizon zero and
-- ECMWF only for future atmospheric hours. Invalidate a completed issue made
-- by the previous ECMWF-retrospective normalizer so the resumable cron rebuilds
-- it atomically with one provider contract instead of serving mixed batches.

do $$
declare
  issue_generated_at timestamptz;
begin
  perform pg_advisory_xact_lock(91600348);

  select generated_at
  into issue_generated_at
  from public.weather_forecast_issues
  where snapshot_date = current_date
    and completed_at is not null;

  if issue_generated_at is not null
    and exists (
      select 1
      from public.weather_grid_forecasts
      where snapshot_date = current_date
        and generated_at = issue_generated_at
        and horizon_hours = 0
        and values ->> 'weatherModel' is distinct from
          'Météo-France AROME history + ECMWF IFS HRES forecast'
    )
  then
    delete from public.weather_grid_forecasts
    where snapshot_date = current_date
      and generated_at = issue_generated_at;

    delete from public.weather_forecast_issues
    where snapshot_date = current_date
      and generated_at = issue_generated_at;

    delete from public.pipeline_cursors
    where pipeline = 'spatial-forecast-v2'
      and snapshot_date = current_date;
  end if;
end;
$$;
