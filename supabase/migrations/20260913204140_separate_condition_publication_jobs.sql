-- Publish from database workers, never through the short PostgREST timeout.
-- Each group commits independently. The common coarse lock serializes heavy
-- rebuilding even when a previous territorial run lasts beyond the next tick.
do $migration$
declare
  definition text;
  needle text := 'if not pg_try_advisory_xact_lock(91600348) then';
  job_id bigint;
  jobs_active boolean;
begin
  select pg_get_functiondef(
    'public.refresh_territorial_level_conditions_after_ingestion(date)'::regprocedure
  ) into definition;
  if (length(definition) - length(replace(definition, needle, ''))) / length(needle) <> 1 then
    raise exception 'Unexpected territorial publication lock definition';
  end if;
  execute replace(definition, needle,
    'if not pg_try_advisory_xact_lock(91600347) or not pg_try_advisory_xact_lock(91600348) then');

  -- Preserve paused restore/rehearsal state; never activate restored ingestion.
  select jobid, active into job_id, jobs_active
  from cron.job where jobname = 'refresh-spatial-condition-caches';
  if job_id is null then
    raise exception 'Missing condition publication scheduler';
  end if;
  perform cron.unschedule(job_id);
  job_id := cron.schedule('refresh-spatial-condition-coarse', '*/2 * * * *',
    'select public.refresh_spatial_level_conditions_after_ingestion(current_date);');
  perform cron.alter_job(job_id, active := jobs_active);
  job_id := cron.schedule('refresh-spatial-condition-territorial', '1-59/2 * * * *',
    'select public.refresh_territorial_level_conditions_after_ingestion(current_date);');
  perform cron.alter_job(job_id, active := jobs_active);
end;
$migration$;
