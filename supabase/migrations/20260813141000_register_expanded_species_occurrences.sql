insert into public.occurrence_taxa (dataset_key, species_id, scientific_name)
values
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'hygrophorus-marzuolus', 'Hygrophorus marzuolus'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'tricholoma-portentosum', 'Tricholoma portentosum'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'russula-virescens', 'Russula virescens'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'cyclocybe-cylindracea', 'Cyclocybe cylindracea'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'coprinus-comatus', 'Coprinus comatus'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'suillus-granulatus', 'Suillus granulatus'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'pleurotus-eryngii', 'Pleurotus eryngii'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'lepiota-brunneoincarnata', 'Lepiota brunneoincarnata'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'galerina-marginata', 'Galerina marginata'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'cortinarius-orellanus', 'Cortinarius orellanus'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'gyromitra-esculenta', 'Gyromitra esculenta'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'amanita-pantherina', 'Amanita pantherina'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'amanita-virosa', 'Amanita virosa'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'amanita-verna', 'Amanita verna'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'tricholoma-pardinum', 'Tricholoma pardinum'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'entoloma-sinuatum', 'Entoloma sinuatum'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'inocybe-erubescens', 'Inosperma erubescens'),
  -- The profile uses the current Kew name 'Collybia rivulosa'; FungaCAT/GBIF
  -- occurrences remain indexed under this provider-specific synonym.
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'clitocybe-rivulosa', 'Clitocybe rivulosa'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'paxillus-involutus', 'Paxillus involutus')
on conflict (dataset_key, species_id) do update
set scientific_name = excluded.scientific_name;

select cron.unschedule(jobid)
from cron.job
where jobname in (
  'refresh-species-occurrences-monthly',
  'refresh-species-occurrences-monthly-tail'
);

-- Seven nine-species invocations cover the 52-profile catalogue with one full
-- batch of headroom. Ten-minute spacing keeps requests beyond pg_net's
-- 120-second timeout and the hosted Edge Function wall clock.
select cron.schedule(
  'refresh-species-occurrences-monthly',
  '15,25,35,45,55 3 1 * *',
  $schedule$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/refresh-species-occurrences',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'x-ingestion-token', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')
      ),
      body := '{"trigger":"cron","maxSpecies":9}'::jsonb,
      timeout_milliseconds := 120000
    );
  $schedule$
);

select cron.schedule(
  'refresh-species-occurrences-monthly-tail',
  '5,15 4 1 * *',
  $schedule$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/refresh-species-occurrences',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'x-ingestion-token', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')
      ),
      body := '{"trigger":"cron","maxSpecies":9}'::jsonb,
      timeout_milliseconds := 120000
    );
  $schedule$
);
