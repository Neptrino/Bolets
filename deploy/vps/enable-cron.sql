\set ON_ERROR_STOP on

do $$
begin
  if (
    select count(*)
    from vault.decrypted_secrets
    where name in (
      'bolets_project_url',
      'bolets_legacy_anon_key',
      'bolets_ingestion_token'
    )
  ) <> 3 then
    raise exception 'Bolets Vault secrets are incomplete';
  end if;

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
      'import-xema-rain-3h',
      'cleanup-finding-photo-staging'
    )
  ) <> 12 then
    raise exception 'Expected twelve Bolets cron jobs';
  end if;
end
$$;

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
      'import-xema-rain-3h',
      'cleanup-finding-photo-staging'
    )
  loop
    perform cron.alter_job(existing_job_id, active := true);
  end loop;
end
$$;
