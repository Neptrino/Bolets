\set ON_ERROR_STOP on

begin;

do $$
declare
  job_name text;
  existing_job_id bigint;
  http_job record;
begin
  foreach job_name in array array[
    'refresh-environment-daily',
    'refresh-spatial-environment',
    'refresh-spatial-soil',
    'refresh-spatial-condition-caches',
    'refresh-spatial-level-conditions',
    'refresh-species-occurrences-monthly',
    'refresh-species-occurrences-monthly-tail',
    'bolets-pipeline-retention',
    'vacuum-weather-grid-snapshots',
    'vacuum-weather-grid-forecasts',
    'vacuum-cron-job-run-details',
    'import-xema-rain-hourly',
    'import-xema-rain-3h'
  ] loop
    select jobid into existing_job_id from cron.job where jobname = job_name;
    if existing_job_id is not null then
      perform cron.unschedule(existing_job_id);
    end if;
    existing_job_id := null;
  end loop;

  for http_job in
    select *
    from (values
      ('refresh-environment-daily', '15 5 * * *', '/functions/v1/refresh-environment', '{"trigger":"cron"}', 30000),
      ('refresh-spatial-soil', '6-59/5 * * * *', '/functions/v1/refresh-spatial-soil', '{"trigger":"cron"}', 120000),
      ('refresh-species-occurrences-monthly', '15,25,35,45,55 3 1 * *', '/functions/v1/refresh-species-occurrences', '{"trigger":"cron","maxSpecies":9}', 120000),
      ('refresh-species-occurrences-monthly-tail', '5,15 4 1 * *', '/functions/v1/refresh-species-occurrences', '{"trigger":"cron","maxSpecies":9}', 120000),
      ('import-xema-rain-3h', '50 2-23/3 * * *', '/functions/v1/import-xema-rain', '{"trigger":"cron","hours":12}', 120000)
    ) as jobs(job_name, schedule, function_path, request_body, timeout_ms)
  loop
    perform cron.schedule(
      http_job.job_name,
      http_job.schedule,
      format(
        $command$
          select net.http_post(
            url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || %L,
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
              'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
              'x-ingestion-token', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')
            ),
            body := %L::jsonb,
            timeout_milliseconds := %s
          );
        $command$,
        http_job.function_path,
        http_job.request_body,
        http_job.timeout_ms
      )
    );
  end loop;

  -- One scheduler tick dispatches all leased lanes. Postgres decides which
  -- shard each lane may claim, so overlapping cron ticks cannot duplicate a
  -- shard and atmosphere waits until every precipitation-fallback shard has
  -- completed.
  perform cron.schedule(
    'refresh-spatial-environment',
    '* * * * *',
    $command$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/refresh-spatial-environment',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
          'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
          'x-ingestion-token', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')
        ),
        body := jsonb_build_object('trigger', 'cron', 'lane', lane),
        timeout_milliseconds := 120000
      )
      from (values ('direct'), ('cloudflare'), ('aws')) as lanes(lane);
    $command$
  );
end
$$;

select cron.schedule(
  'refresh-spatial-condition-caches',
  '* * * * *',
  $command$
    select public.refresh_spatial_level_conditions_after_ingestion(current_date);
    select public.refresh_territorial_level_conditions_after_ingestion(current_date);
  $command$
);

select cron.schedule(
  'bolets-pipeline-retention',
  '0 0 * * *',
  'select public.run_environment_retention();'
);

select cron.schedule(
  'vacuum-weather-grid-snapshots',
  '2 0 * * *',
  'vacuum (analyze) public.weather_grid_snapshots'
);

select cron.schedule(
  'vacuum-cron-job-run-details',
  '3 0 * * *',
  'vacuum (analyze) cron.job_run_details'
);

select cron.schedule(
  'vacuum-weather-grid-forecasts',
  '40 6 * * *',
  'vacuum (analyze) public.weather_grid_forecasts'
);

do $$
begin
  if (
    select count(*)
    from cron.job
    where jobname in (
      'refresh-environment-daily',
      'refresh-spatial-environment',
      'refresh-spatial-soil',
      'refresh-spatial-condition-caches',
      'refresh-species-occurrences-monthly',
      'refresh-species-occurrences-monthly-tail',
      'bolets-pipeline-retention',
      'vacuum-weather-grid-snapshots',
      'vacuum-weather-grid-forecasts',
      'vacuum-cron-job-run-details',
      'import-xema-rain-3h'
    )
  ) <> 11 then
    raise exception 'Expected eleven Bolets cron jobs';
  end if;
end
$$;

-- The managed project remains the writer until the final cutover. Keeping the
-- restored jobs inactive prevents duplicate provider calls during rehearsal.
do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname in (
      'refresh-environment-daily',
      'refresh-spatial-environment',
      'refresh-spatial-soil',
      'refresh-spatial-condition-caches',
      'refresh-species-occurrences-monthly',
      'refresh-species-occurrences-monthly-tail',
      'bolets-pipeline-retention',
      'vacuum-weather-grid-snapshots',
      'vacuum-weather-grid-forecasts',
      'vacuum-cron-job-run-details',
      'import-xema-rain-3h'
    )
  loop
    perform cron.alter_job(existing_job_id, active := false);
  end loop;
end
$$;

commit;
