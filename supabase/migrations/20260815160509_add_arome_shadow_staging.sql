-- Direct Météo-France AROME files are retained only as private, bounded shadow
-- evidence. No prediction, current-weather or scoring table references this
-- bucket or source. Object payloads stay in Storage instead of the near-budget
-- PostgreSQL database; only the ordinary Storage object row and audited run
-- metadata enter Postgres.

alter table public.ingestion_runs
  drop constraint if exists ingestion_runs_pipeline_check;

alter table public.ingestion_runs
  add constraint ingestion_runs_pipeline_check
  check (pipeline in (
    'regional-environment',
    'spatial-environment',
    'spatial-atmosphere',
    'spatial-atmosphere-shadow',
    'spatial-soil',
    'spatial-soil-satellite',
    'spatial-static-import',
    'species-occurrences',
    'retention'
  ));

insert into public.pipeline_sources (
  source_id,
  title,
  source_url,
  source_kind,
  native_resolution_m,
  refresh_cadence,
  license,
  enabled,
  status,
  status_detail
) values (
  'meteofrance-arome-direct-shadow',
  'Météo-France AROME 0.01-degree direct WCS shadow',
  'https://public-api.meteofrance.fr/public/arome/1.0/wcs/MF-NWP-HIGHRES-AROME-001-FRANCE-WCS',
  'weather',
  1300,
  'manual bounded evaluation; provider retains five days',
  'Licence Ouverte d''Etalab',
  true,
  'blocked',
  'Server-side staging remains blocked and outside production scoring pending a named staging token, a live credential smoke, an all-three same-run contract, and decoded GRIB semantic verification.'
)
on conflict (source_id) do update set
  title = excluded.title,
  source_url = excluded.source_url,
  source_kind = excluded.source_kind,
  native_resolution_m = excluded.native_resolution_m,
  refresh_cadence = excluded.refresh_cadence,
  license = excluded.license,
  enabled = excluded.enabled,
  status = 'blocked',
  status_detail = excluded.status_detail,
  checked_at = pg_catalog.now(),
  updated_at = pg_catalog.now();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'environment-shadow',
  'environment-shadow',
  false,
  8388608,
  array['application/wmo-grib']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
