-- Persist the same-issuance ECMWF state at horizon zero. Future scores can
-- then apply the modelled change to current observations instead of silently
-- replacing today's AROME history with a different provider history.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select constraints.conname
    from pg_constraint constraints
    where constraints.conrelid = 'public.weather_grid_forecasts'::regclass
      and constraints.contype = 'c'
      and pg_get_constraintdef(constraints.oid) ilike '%horizon_hours%'
  loop
    execute format(
      'alter table public.weather_grid_forecasts drop constraint %I',
      constraint_name
    );
  end loop;

  for constraint_name in
    select constraints.conname
    from pg_constraint constraints
    where constraints.conrelid = 'public.weather_grid_forecasts'::regclass
      and constraints.contype = 'c'
      and pg_get_constraintdef(constraints.oid) ilike '%valid_at > generated_at%'
  loop
    execute format(
      'alter table public.weather_grid_forecasts drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

alter table public.weather_grid_forecasts
  add constraint weather_grid_forecasts_horizon_hours_check
    check (horizon_hours in (0, 24, 48, 72, 96, 120)),
  add constraint weather_grid_forecasts_valid_time_check
    check (
      (horizon_hours = 0 and valid_at <= generated_at and valid_at >= generated_at - interval '7 hours')
      or (horizon_hours > 0 and valid_at > generated_at)
    );

-- Allocate one immutable issue timestamp per snapshot date. The single-row
-- upsert is atomic, so overlapping first batches cannot split a coarse cell
-- across multiple generated_at groups.
create table public.weather_forecast_issues (
  snapshot_date date primary key,
  generated_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.weather_forecast_issues enable row level security;
revoke all on table public.weather_forecast_issues from public, anon, authenticated, service_role;
grant select, insert on table public.weather_forecast_issues to service_role;

create or replace function public.allocate_weather_forecast_issue(
  p_snapshot_date date,
  p_generated_at timestamptz
)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  allocated_at timestamptz;
begin
  insert into public.weather_forecast_issues (snapshot_date, generated_at)
  values (p_snapshot_date, p_generated_at)
  on conflict (snapshot_date) do nothing;

  select generated_at into allocated_at
  from public.weather_forecast_issues
  where snapshot_date = p_snapshot_date;
  return allocated_at;
end;
$$;

revoke all on function public.allocate_weather_forecast_issue(date, timestamptz)
  from public, anon, authenticated;
grant execute on function public.allocate_weather_forecast_issue(date, timestamptz)
  to service_role;

-- Existing five-row issues have no valid calibration anchor. The versioned
-- cursor makes a migration-first rollout race-safe. Mark both implementations
-- complete for the migration date and clear today's replaceable rows. V2 starts
-- on the next UTC date, alongside a fresh observed-weather cycle, rather than
-- creating a late-day baseline that cannot safely anchor to today's observation.
delete from public.weather_grid_forecasts where snapshot_date = current_date;
delete from public.weather_forecast_issues where snapshot_date = current_date;
insert into public.pipeline_cursors (pipeline, snapshot_date, last_cell_id, updated_at)
values
  ('spatial-forecast', current_date, '__complete__', now()),
  ('spatial-forecast-v2', current_date, '__complete__', now())
on conflict (pipeline) do update set
  snapshot_date = excluded.snapshot_date,
  last_cell_id = excluded.last_cell_id,
  updated_at = excluded.updated_at;

comment on table public.weather_grid_forecasts is
  'One horizon-zero baseline plus five future-valid normalized weather rows per point and issue. Forecast anomalies are anchored to current observations at read time.';
