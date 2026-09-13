-- Current rollout contract. Keep the historical restore-baseline check fixed.
do $verify$
begin
  if exists (select 1 from cron.job where jobname = 'refresh-spatial-condition-caches')
    or (select count(*) from cron.job where active and (
      (jobname = 'refresh-spatial-condition-coarse' and schedule = '*/2 * * * *'
        and command = 'select public.refresh_spatial_level_conditions_after_ingestion(current_date);')
      or (jobname = 'refresh-spatial-condition-territorial' and schedule = '1-59/2 * * * *'
        and command = 'select public.refresh_territorial_level_conditions_after_ingestion(current_date);')
    )) <> 2 then
    raise exception 'Expected two active, independent condition publication jobs';
  end if;
end;
$verify$;
