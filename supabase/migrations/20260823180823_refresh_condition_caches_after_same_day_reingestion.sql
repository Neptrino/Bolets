-- A same-day restore or cursor replay can complete after a condition cache was
-- already stamped with the same snapshot date. Track the exact observed-stream
-- generation that each cache consumed instead of treating the calendar date as
-- sufficient proof of freshness.
create or replace function public.refresh_spatial_level_conditions_after_ingestion(
  p_snapshot_date date default current_date
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  completed_streams integer;
  observed_generation_at timestamptz;
  cache_generation_at timestamptz;
begin
  if not pg_try_advisory_xact_lock(91600347) then
    return false;
  end if;

  select count(*), max(updated_at)
  into completed_streams, observed_generation_at
  from public.pipeline_cursors
  where snapshot_date = p_snapshot_date
    and last_cell_id = '__complete__'
    and pipeline in ('spatial-atmosphere', 'spatial-soil');

  if completed_streams <> 2 or observed_generation_at is null then
    return false;
  end if;

  select updated_at
  into cache_generation_at
  from public.pipeline_cursors
  where pipeline = 'spatial-condition-coarse'
    and snapshot_date = p_snapshot_date
    and last_cell_id = '__complete__';

  if cache_generation_at >= observed_generation_at then
    return false;
  end if;

  perform public.refresh_spatial_level_conditions(2500, p_snapshot_date);
  perform public.refresh_spatial_level_conditions(5000, p_snapshot_date);
  perform public.refresh_spatial_level_conditions(10000, p_snapshot_date);

  insert into public.pipeline_cursors (
    pipeline,
    snapshot_date,
    last_cell_id,
    updated_at
  ) values (
    'spatial-condition-coarse',
    p_snapshot_date,
    '__complete__',
    pg_catalog.now()
  )
  on conflict (pipeline) do update set
    snapshot_date = excluded.snapshot_date,
    last_cell_id = excluded.last_cell_id,
    updated_at = excluded.updated_at;

  return true;
end;
$$;

create or replace function public.refresh_territorial_level_conditions_after_ingestion(
  p_snapshot_date date default current_date
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  completed_streams integer;
  observed_generation_at timestamptz;
  cache_generation_at timestamptz;
begin
  if not pg_try_advisory_xact_lock(91600348) then
    return false;
  end if;

  select count(*), max(updated_at)
  into completed_streams, observed_generation_at
  from public.pipeline_cursors
  where snapshot_date = p_snapshot_date
    and last_cell_id = '__complete__'
    and pipeline in ('spatial-atmosphere', 'spatial-soil');

  if completed_streams <> 2 or observed_generation_at is null then
    return false;
  end if;

  select updated_at
  into cache_generation_at
  from public.pipeline_cursors
  where pipeline = 'spatial-condition-territorial'
    and snapshot_date = p_snapshot_date
    and last_cell_id = '__complete__';

  if cache_generation_at >= observed_generation_at then
    return false;
  end if;

  perform public.refresh_spatial_level_conditions(1000, p_snapshot_date);

  insert into public.pipeline_cursors (
    pipeline,
    snapshot_date,
    last_cell_id,
    updated_at
  ) values (
    'spatial-condition-territorial',
    p_snapshot_date,
    '__complete__',
    pg_catalog.now()
  )
  on conflict (pipeline) do update set
    snapshot_date = excluded.snapshot_date,
    last_cell_id = excluded.last_cell_id,
    updated_at = excluded.updated_at;

  return true;
end;
$$;

revoke all on function public.refresh_spatial_level_conditions_after_ingestion(date)
  from public, anon, authenticated;
grant execute on function public.refresh_spatial_level_conditions_after_ingestion(date)
  to service_role;

revoke all on function public.refresh_territorial_level_conditions_after_ingestion(date)
  from public, anon, authenticated;
grant execute on function public.refresh_territorial_level_conditions_after_ingestion(date)
  to service_role;

comment on function public.refresh_spatial_level_conditions_after_ingestion(date) is
  'Refreshes 2.5, 5 and 10 km conditions after every completed observed-stream generation, including same-day replays.';

comment on function public.refresh_territorial_level_conditions_after_ingestion(date) is
  'Refreshes 1 km conditions after every completed observed-stream generation, including same-day replays.';
