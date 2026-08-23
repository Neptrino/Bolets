-- Territorial overview cards read the canonical 1 km lattice. Computing the
-- latest provider aggregation for every page request creates hundreds of
-- repeated database reads, so refresh that level once after daily ingestion
-- and serve it through the same precomputed reader as coarser map levels.
do $migration$
declare
  previous_definition text;
  updated_definition text;
begin
  select pg_get_functiondef(
    'public.refresh_spatial_level_conditions(integer,date)'::regprocedure
  ) into previous_definition;

  updated_definition := replace(
    previous_definition,
    'p_grid_size_m not in (2500, 5000, 10000)',
    'p_grid_size_m not in (1000, 2500, 5000, 10000)'
  );

  if updated_definition = previous_definition and position(
    'p_grid_size_m not in (1000, 2500, 5000, 10000)' in previous_definition
  ) = 0 then
    raise exception 'Unable to extend refresh_spatial_level_conditions to 1 km';
  end if;

  if updated_definition <> previous_definition then
    execute updated_definition;
  end if;
end;
$migration$;

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
  already_refreshed boolean;
begin
  if not pg_try_advisory_xact_lock(91600348) then
    return false;
  end if;

  select count(*)
  into completed_streams
  from public.pipeline_cursors
  where snapshot_date = p_snapshot_date
    and last_cell_id = '__complete__'
    and pipeline in ('spatial-atmosphere', 'spatial-soil');

  if completed_streams <> 2 then
    return false;
  end if;

  select not exists (
    select 1
    from public.spatial_cell_levels
    where grid_size_m = 1000
      and condition_snapshot_date is distinct from p_snapshot_date
  ) into already_refreshed;

  if already_refreshed then
    return false;
  end if;

  perform public.refresh_spatial_level_conditions(1000, p_snapshot_date);
  return true;
end;
$$;

revoke all on function public.refresh_territorial_level_conditions_after_ingestion(date)
  from public, anon, authenticated;
grant execute on function public.refresh_territorial_level_conditions_after_ingestion(date)
  to service_role;

comment on function public.refresh_territorial_level_conditions_after_ingestion(date) is
  'Refreshes canonical 1 km conditions once both daily observed spatial streams are complete.';

comment on function public.refresh_spatial_level_conditions(integer, date) is
  'Refreshes current environmental conditions for the 1, 2.5, 5 or 10 km materialized level.';
