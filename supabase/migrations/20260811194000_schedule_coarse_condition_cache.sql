do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'refresh-spatial-level-conditions';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule(
  'refresh-spatial-level-conditions',
  '10 1 * * *',
  $job$
    select public.refresh_spatial_level_conditions(2500);
    select public.refresh_spatial_level_conditions(5000);
    select public.refresh_spatial_level_conditions(10000);
  $job$
);

comment on table public.spatial_cell_levels is
  'Precomputed zoom levels derived from verified 250 m cells. Coarse levels cache their latest environmental projection after daily ingestion.';
