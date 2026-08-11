alter table public.ingestion_runs
  drop constraint if exists ingestion_runs_pipeline_check;

alter table public.ingestion_runs
  add constraint ingestion_runs_pipeline_check
  check (pipeline in (
    'regional-environment',
    'spatial-environment',
    'spatial-atmosphere',
    'spatial-soil',
    'spatial-static-import',
    'retention'
  ));

select cron.unschedule(jobid)
from cron.job
where jobname = 'refresh-spatial-soil';

select cron.schedule(
  'refresh-spatial-soil',
  '30 5 * * *',
  $schedule$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/refresh-spatial-soil',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'x-ingestion-token', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')
      ),
      body := '{"trigger":"cron"}'::jsonb,
      timeout_milliseconds := 120000
    );
  $schedule$
);

delete from public.pipeline_cursors
where pipeline in ('spatial-environment', 'spatial-atmosphere', 'spatial-soil');
