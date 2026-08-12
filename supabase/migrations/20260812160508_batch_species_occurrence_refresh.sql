insert into public.occurrence_taxa (dataset_key, species_id, scientific_name)
values
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'ramaria-aurea', 'Ramaria aurea'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'agaricus-campestris', 'Agaricus campestris'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'pleurotus-ostreatus', 'Pleurotus ostreatus'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'hygrophorus-eburneus', 'Hygrophorus eburneus'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'craterellus-tubaeformis', 'Craterellus tubaeformis'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'tuber-melanosporum', 'Tuber melanosporum'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'amanita-phalloides', 'Amanita phalloides')
on conflict (dataset_key, species_id) do update
set scientific_name = excluded.scientific_name;

select cron.unschedule(jobid)
from cron.job
where jobname = 'refresh-species-occurrences-monthly';

-- Four nine-species batches cover the catalogue with capacity for 36 species without putting all
-- sequential GBIF pagination inside one HTTP request. Ten-minute spacing exceeds
-- both pg_net's 120-second request timeout and the hosted Edge Function wall clock.
select cron.schedule(
  'refresh-species-occurrences-monthly',
  '15,25,35,45 3 1 * *',
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
