-- Coarse conditions drive the regional Top 10. Rebuild them only after both
-- daily observed provider streams have completed, rather than at a guessed hour.
select cron.unschedule(jobid)
from cron.job
where jobname = 'refresh-spatial-level-conditions';

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
  refreshed_levels integer;
begin
  if not pg_try_advisory_xact_lock(91600347) then
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

  select count(distinct grid_size_m)
  into refreshed_levels
  from public.spatial_cell_levels
  where grid_size_m in (2500, 5000, 10000)
    and condition_snapshot_date = p_snapshot_date;

  if refreshed_levels = 3 then
    return false;
  end if;

  perform public.refresh_spatial_level_conditions(2500, p_snapshot_date);
  perform public.refresh_spatial_level_conditions(5000, p_snapshot_date);
  perform public.refresh_spatial_level_conditions(10000, p_snapshot_date);
  return true;
end;
$$;

revoke all on function public.refresh_spatial_level_conditions_after_ingestion(date) from public, anon, authenticated;
grant execute on function public.refresh_spatial_level_conditions_after_ingestion(date) to service_role;

comment on function public.refresh_spatial_level_conditions_after_ingestion(date) is
  'Refreshes 2.5, 5 and 10 km current conditions once the daily observed atmosphere and soil ingestions are complete; forecast availability is independent.';
