-- The nightly spatial refresh is the only consumer of the gauge table, so
-- hourly 48-hour re-imports mostly rewrote unchanged rows (~200k upserts a
-- day of vacuum churn on the near-budget database). Every three hours with
-- a twelve-hour window keeps each hour covered by four runs (a six-hour
-- provider outage still self-heals), keeps late quality-control revisions
-- within half a day, and lands one run at 23:50 UTC just before the daily
-- refresh cycle reads the matrix.

select cron.unschedule(jobid)
from cron.job
where jobname = 'import-xema-rain-hourly';

select cron.schedule(
  'import-xema-rain-3h',
  '50 2-23/3 * * *',
  $schedule$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/import-xema-rain',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'x-ingestion-token', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')
      ),
      body := '{"trigger":"cron","hours":12}'::jsonb,
      timeout_milliseconds := 120000
    );
  $schedule$
);
