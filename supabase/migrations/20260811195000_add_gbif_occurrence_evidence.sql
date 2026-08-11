alter table public.pipeline_sources
  drop constraint if exists pipeline_sources_source_kind_check;

alter table public.pipeline_sources
  add constraint pipeline_sources_source_kind_check
  check (source_kind in ('weather', 'terrain', 'soil', 'land-cover', 'occurrence'));

alter table public.ingestion_runs
  drop constraint if exists ingestion_runs_pipeline_check;

alter table public.ingestion_runs
  add constraint ingestion_runs_pipeline_check
  check (pipeline in (
    'regional-environment', 'spatial-environment', 'spatial-atmosphere',
    'spatial-soil', 'spatial-static-import', 'species-occurrences', 'retention'
  ));

insert into public.pipeline_sources (
  source_id, title, source_url, source_kind, native_resolution_m,
  refresh_cadence, license, enabled, status, status_detail
) values (
  'fungacat-gbif',
  'FungaCAT via GBIF',
  'https://www.gbif.org/dataset/8583f4f6-f762-11e1-a439-00145eb45e9a',
  'occurrence',
  10000,
  'monthly check; publisher updates annually',
  'CC BY-NC 4.0',
  true,
  'active',
  'Historical fungal occurrences are quality-filtered and generalized to 10 km support cells before storage.'
)
on conflict (source_id) do update set
  title = excluded.title,
  source_url = excluded.source_url,
  source_kind = excluded.source_kind,
  native_resolution_m = excluded.native_resolution_m,
  refresh_cadence = excluded.refresh_cadence,
  license = excluded.license,
  enabled = excluded.enabled,
  status = excluded.status,
  status_detail = excluded.status_detail,
  checked_at = now(),
  updated_at = now();

create table public.occurrence_datasets (
  dataset_key uuid primary key,
  source_id text not null unique references public.pipeline_sources(source_id) on delete restrict,
  title text not null,
  publisher text not null,
  doi text not null,
  source_url text not null,
  license_url text not null,
  minimum_grid_size_m integer not null default 10000 check (minimum_grid_size_m >= 10000),
  refresh_cadence text not null,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.occurrence_taxa (
  dataset_key uuid not null references public.occurrence_datasets(dataset_key) on delete cascade,
  species_id text not null check (species_id ~ '^[a-z0-9-]+$'),
  scientific_name text not null,
  enabled boolean not null default true,
  last_attempted_at timestamptz,
  last_synced_at timestamptz,
  last_record_count integer not null default 0 check (last_record_count >= 0),
  last_run_id uuid references public.ingestion_runs(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (dataset_key, species_id)
);

create index occurrence_taxa_due_idx
  on public.occurrence_taxa (last_synced_at nulls first, species_id)
  where enabled;

create index occurrence_taxa_last_run_idx
  on public.occurrence_taxa (last_run_id)
  where last_run_id is not null;

create table public.species_occurrence_records (
  dataset_key uuid not null references public.occurrence_datasets(dataset_key) on delete cascade,
  gbif_id bigint not null check (gbif_id > 0),
  species_id text not null check (species_id ~ '^[a-z0-9-]+$'),
  support_cell_id text not null check (support_cell_id ~ '^epsg25831:10000:[0-9]+:[0-9]+$'),
  event_date date,
  event_year smallint check (event_year between 1500 and 2100),
  event_month smallint check (event_month between 1 and 12),
  basis_of_record text not null,
  coordinate_uncertainty_m integer check (coordinate_uncertainty_m between 0 and 10000),
  license_url text not null,
  last_seen_run_id uuid references public.ingestion_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (dataset_key, gbif_id)
);

create index species_occurrence_species_cell_idx
  on public.species_occurrence_records (species_id, support_cell_id)
  include (dataset_key, event_year, event_month);

create index species_occurrence_last_seen_run_idx
  on public.species_occurrence_records (last_seen_run_id)
  where last_seen_run_id is not null;

alter table public.occurrence_datasets enable row level security;
alter table public.occurrence_taxa enable row level security;
alter table public.species_occurrence_records enable row level security;

revoke all on table public.occurrence_datasets from public, anon, authenticated;
revoke all on table public.occurrence_taxa from public, anon, authenticated;
revoke all on table public.species_occurrence_records from public, anon, authenticated;

grant select, insert, update, delete on table public.occurrence_datasets to service_role;
grant select, insert, update, delete on table public.occurrence_taxa to service_role;
grant select, insert, update, delete on table public.species_occurrence_records to service_role;

insert into public.occurrence_datasets (
  dataset_key, source_id, title, publisher, doi, source_url, license_url,
  minimum_grid_size_m, refresh_cadence, enabled, metadata
) values (
  '8583f4f6-f762-11e1-a439-00145eb45e9a',
  'fungacat-gbif',
  'FungaCAT: Banco de datos de los hongos de Cataluña',
  'Banc de dades de biodiversitat de Catalunya',
  '10.15468/ttivpp',
  'https://www.gbif.org/dataset/8583f4f6-f762-11e1-a439-00145eb45e9a',
  'https://creativecommons.org/licenses/by-nc/4.0/',
  10000,
  'monthly check; publisher updates annually',
  true,
  jsonb_build_object(
    'hostingPlatform', 'GBIF',
    'dwca', 'https://ipt.gbif.es/archive.do?r=fungacat',
    'publisherUpdateCadence', 'annual'
  )
);

insert into public.occurrence_taxa (dataset_key, species_id, scientific_name)
values
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'boletus-edulis', 'Boletus edulis'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'boletus-pinophilus', 'Boletus pinophilus'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'boletus-aereus', 'Boletus aereus'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'lactarius-deliciosus', 'Lactarius deliciosus'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'lactarius-sanguifluus', 'Lactarius sanguifluus'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'cantharellus-cibarius', 'Cantharellus cibarius'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'craterellus-lutescens', 'Craterellus lutescens'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'craterellus-cornucopioides', 'Craterellus cornucopioides'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'hydnum-repandum', 'Hydnum repandum'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'macrolepiota-procera', 'Macrolepiota procera'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'tricholoma-terreum', 'Tricholoma terreum'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'hygrophorus-latitabundus', 'Hygrophorus latitabundus'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'amanita-caesarea', 'Amanita caesarea'),
  ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'marasmius-oreades', 'Marasmius oreades');

create or replace function public.upsert_species_occurrence_batch(
  p_dataset_key uuid,
  p_species_id text,
  p_run_id uuid,
  p_records jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if jsonb_typeof(p_records) <> 'array' then
    raise exception 'Occurrence batch must be a JSON array';
  end if;

  if jsonb_array_length(p_records) > 300 then
    raise exception 'Occurrence batch must be a JSON array of at most 300 records';
  end if;

  if not exists (
    select 1
    from public.ingestion_runs runs
    where runs.id = p_run_id
      and runs.pipeline = 'species-occurrences'
      and runs.status = 'running'
  ) then
    raise exception 'Occurrence ingestion run is not active';
  end if;

  if not exists (
    select 1
    from public.occurrence_taxa taxa
    where taxa.dataset_key = p_dataset_key
      and taxa.species_id = p_species_id
      and taxa.enabled
  ) then
    raise exception 'Occurrence taxon is not enabled';
  end if;

  with input_records as materialized (
    select
      input.gbif_id,
      input.event_date,
      input.event_year,
      input.event_month,
      input.basis_of_record,
      input.coordinate_uncertainty_m,
      input.license_url,
      extensions.st_setsrid(extensions.st_makepoint(input.longitude, input.latitude), 4326) as point_geom
    from jsonb_to_recordset(p_records) as input(
      gbif_id bigint,
      longitude double precision,
      latitude double precision,
      event_date date,
      event_year smallint,
      event_month smallint,
      basis_of_record text,
      coordinate_uncertainty_m integer,
      license_url text
    )
    where input.gbif_id > 0
      and input.longitude between 0.05 and 3.32
      and input.latitude between 40.48 and 42.92
      and input.basis_of_record is not null
      and input.license_url is not null
      and (input.coordinate_uncertainty_m is null or input.coordinate_uncertainty_m between 0 and 10000)
  ),
  mapped_records as materialized (
    select input_records.*, support_cell.cell_id
    from input_records
    join lateral (
      select levels.cell_id
      from public.spatial_cell_levels levels
      where levels.grid_size_m = 10000
        and levels.geom operator(extensions.&&) input_records.point_geom
        and extensions.st_covers(levels.geom, input_records.point_geom)
      order by levels.cell_id
      limit 1
    ) support_cell on true
  ),
  upserted as (
    insert into public.species_occurrence_records (
      dataset_key, gbif_id, species_id, support_cell_id, event_date,
      event_year, event_month, basis_of_record, coordinate_uncertainty_m,
      license_url, last_seen_run_id, updated_at
    )
    select
      p_dataset_key, mapped_records.gbif_id, p_species_id, mapped_records.cell_id,
      mapped_records.event_date, mapped_records.event_year, mapped_records.event_month,
      mapped_records.basis_of_record, mapped_records.coordinate_uncertainty_m,
      mapped_records.license_url, p_run_id, now()
    from mapped_records
    on conflict (dataset_key, gbif_id) do update set
      species_id = excluded.species_id,
      support_cell_id = excluded.support_cell_id,
      event_date = excluded.event_date,
      event_year = excluded.event_year,
      event_month = excluded.event_month,
      basis_of_record = excluded.basis_of_record,
      coordinate_uncertainty_m = excluded.coordinate_uncertainty_m,
      license_url = excluded.license_url,
      last_seen_run_id = excluded.last_seen_run_id,
      updated_at = now()
    returning 1
  )
  select count(*)::integer into affected_rows from upserted;

  return affected_rows;
end;
$$;

create or replace function public.finalize_species_occurrence_sync(
  p_dataset_key uuid,
  p_species_id text,
  p_run_id uuid
)
returns table (deleted_records integer, current_records integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  removed integer;
  retained integer;
begin
  if not exists (
    select 1
    from public.ingestion_runs runs
    where runs.id = p_run_id
      and runs.pipeline = 'species-occurrences'
      and runs.status = 'running'
  ) then
    raise exception 'Occurrence ingestion run is not active';
  end if;

  delete from public.species_occurrence_records records
  where records.dataset_key = p_dataset_key
    and records.species_id = p_species_id
    and records.last_seen_run_id is distinct from p_run_id;
  get diagnostics removed = row_count;

  select count(*)::integer into retained
  from public.species_occurrence_records records
  where records.dataset_key = p_dataset_key
    and records.species_id = p_species_id;

  update public.occurrence_taxa taxa
  set
    last_synced_at = now(),
    last_record_count = retained,
    last_run_id = p_run_id,
    error_message = null,
    updated_at = now()
  where taxa.dataset_key = p_dataset_key
    and taxa.species_id = p_species_id;

  update public.occurrence_datasets datasets
  set updated_at = now()
  where datasets.dataset_key = p_dataset_key;

  return query select removed, retained;
end;
$$;

create or replace function public.read_species_occurrence_support(
  p_species_id text,
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_limit integer default 1000
)
returns table (
  cell_id text,
  west double precision,
  south double precision,
  east double precision,
  north double precision,
  grid_size_m integer,
  record_count integer,
  observed_year_min integer,
  observed_year_max integer,
  observed_months integer[],
  sources jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with relevant_records as materialized (
    select records.*
    from public.species_occurrence_records records
    where records.species_id = p_species_id
  ),
  grouped as (
    select
      records.support_cell_id,
      count(*)::integer as record_count,
      min(records.event_year)::integer as observed_year_min,
      max(records.event_year)::integer as observed_year_max,
      array_agg(distinct records.event_month::integer order by records.event_month::integer)
        filter (where records.event_month is not null) as observed_months
    from relevant_records records
    group by records.support_cell_id
  ),
  source_values as (
    select
      source_records.support_cell_id,
      jsonb_agg(
        jsonb_build_object(
          'sourceId', datasets.source_id,
          'title', datasets.title,
          'datasetKey', datasets.dataset_key,
          'doi', datasets.doi,
          'licenseUrl', datasets.license_url,
          'sourceUrl', datasets.source_url,
          'lastSyncedAt', taxa.last_synced_at
        ) order by datasets.source_id
      ) as sources
    from (
      select distinct records.support_cell_id, records.dataset_key
      from relevant_records records
    ) source_records
    join public.occurrence_datasets datasets
      on datasets.dataset_key = source_records.dataset_key
    join public.occurrence_taxa taxa
      on taxa.dataset_key = source_records.dataset_key
      and taxa.species_id = p_species_id
    group by source_records.support_cell_id
  )
  select
    levels.cell_id,
    levels.west,
    levels.south,
    levels.east,
    levels.north,
    levels.grid_size_m,
    grouped.record_count,
    grouped.observed_year_min,
    grouped.observed_year_max,
    coalesce(grouped.observed_months, '{}'::integer[]),
    coalesce(source_values.sources, '[]'::jsonb)
  from grouped
  join public.spatial_cell_levels levels
    on levels.cell_id = grouped.support_cell_id
    and levels.grid_size_m = 10000
  left join source_values
    on source_values.support_cell_id = grouped.support_cell_id
  where levels.geom operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
  order by
    power((levels.west + levels.east) / 2 - (p_west + p_east) / 2, 2)
      + power((levels.south + levels.north) / 2 - (p_south + p_north) / 2, 2),
    levels.cell_id
  limit least(greatest(p_limit, 1), 1000);
$$;

revoke all on function public.upsert_species_occurrence_batch(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.finalize_species_occurrence_sync(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.read_species_occurrence_support(text, double precision, double precision, double precision, double precision, integer) from public, anon, authenticated;

grant execute on function public.upsert_species_occurrence_batch(uuid, text, uuid, jsonb) to service_role;
grant execute on function public.finalize_species_occurrence_sync(uuid, text, uuid) to service_role;
grant execute on function public.read_species_occurrence_support(text, double precision, double precision, double precision, double precision, integer) to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'refresh-species-occurrences-monthly';

select cron.schedule(
  'refresh-species-occurrences-monthly',
  '15 3 1 * *',
  $schedule$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_project_url') || '/functions/v1/refresh-species-occurrences',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_legacy_anon_key'),
        'x-ingestion-token', (select decrypted_secret from vault.decrypted_secrets where name = 'bolets_ingestion_token')
      ),
      body := '{"trigger":"cron","maxSpecies":14}'::jsonb,
      timeout_milliseconds := 120000
    );
  $schedule$
);

comment on table public.occurrence_datasets is
  'Whitelisted GBIF-hosted occurrence datasets with explicit licence and provenance metadata.';

comment on table public.occurrence_taxa is
  'Operational mapping from version-controlled application species IDs to dataset scientific names.';

comment on table public.species_occurrence_records is
  'Quality-filtered historical records generalized to 10 km support cells; exact source coordinates are never stored.';

comment on function public.read_species_occurrence_support(text, double precision, double precision, double precision, double precision, integer) is
  'Returns privacy-safe historical occurrence support for one species. Missing records are not evidence of absence.';
