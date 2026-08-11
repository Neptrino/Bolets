create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.unschedule(jobid)
from cron.job
where jobname = 'refresh-environment-daily';

select cron.schedule(
  'refresh-environment-daily',
  '15 5 * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/refresh-environment',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);
