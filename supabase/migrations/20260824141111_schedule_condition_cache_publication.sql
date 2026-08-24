-- PostgREST's bounded statement timeout is intentionally shorter than a cold
-- 1 km condition-cache rebuild. Publish the completed observed generation from
-- a database worker instead: the two existing functions already require both
-- observed cursors, compare exact generation timestamps and use independent
-- transaction advisory locks, so this retry loop is idempotent and cannot
-- overlap a refresh already started by an Edge Function.

do $migration$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'refresh-spatial-condition-caches';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'refresh-spatial-condition-caches',
    '* * * * *',
    $command$
      select public.refresh_spatial_level_conditions_after_ingestion(current_date);
      select public.refresh_territorial_level_conditions_after_ingestion(current_date);
    $command$
  );
end
$migration$;
