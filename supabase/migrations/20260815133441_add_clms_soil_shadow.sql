-- Copernicus CLMS soil products are a separate hot shadow-evaluation stream. They are
-- relative satellite indices, not the volumetric 3-9 cm moisture consumed by
-- hydrothermal-v1, so this migration deliberately leaves production weather
-- snapshots, soil_point_id links, and publication gates unchanged. The short
-- relational window is an operational preview, not a calibration archive.

alter table public.ingestion_runs
  drop constraint if exists ingestion_runs_pipeline_check;

alter table public.ingestion_runs
  add constraint ingestion_runs_pipeline_check
  check (pipeline in (
    'regional-environment',
    'spatial-environment',
    'spatial-atmosphere',
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
) values
  (
    'copernicus-clms-ssm-1km-v1',
    'Copernicus CLMS Surface Soil Moisture Europe 1 km v1',
    'https://land.copernicus.eu/en/products/soil-moisture/daily-surface-soil-moisture-v1.0',
    'soil',
    1000,
    'daily; nominal product latency one day',
    'Copernicus full, free and open access; source and DOI attribution required',
    true,
    'blocked',
    'Shadow adapter is ready; CDSE credentials and the first validated raster import are still required. This source does not affect production scores.'
  ),
  (
    'copernicus-clms-swi-1km-v2',
    'Copernicus CLMS Soil Water Index Europe 1 km v2',
    'https://land.copernicus.eu/en/products/soil-moisture/daily-soil-water-index-europe-1km-v2',
    'soil',
    1000,
    'daily; within two days of observation',
    'Copernicus full, free and open access; source and DOI attribution required',
    true,
    'blocked',
    'Shadow adapter is ready; CDSE credentials and the first validated V2.1.1+ raster import are still required. This source does not affect production scores.'
  )
on conflict (source_id) do update set
  title = excluded.title,
  source_url = excluded.source_url,
  source_kind = excluded.source_kind,
  native_resolution_m = excluded.native_resolution_m,
  refresh_cadence = excluded.refresh_cadence,
  license = excluded.license,
  enabled = excluded.enabled,
  status_detail = excluded.status_detail,
  checked_at = pg_catalog.now(),
  updated_at = pg_catalog.now();

create table public.clms_soil_manifests (
  snapshot_date date primary key,
  ssm_product_id text not null unique check (
    ssm_product_id ~ '^c_gls_SSM1km_[0-9]{12}_CEURO_S1CSAR_V[0-9]+[.][0-9]+[.][0-9]+_cog$'
  ),
  ssm_product_version text not null check (
    ssm_product_version ~ '^V[0-9]+[.][0-9]+[.][0-9]+$'
  ),
  ssm_nominal_at timestamptz not null,
  ssm_content_start timestamptz not null,
  ssm_content_end timestamptz not null,
  ssm_published_at timestamptz not null,
  swi_product_id text not null unique check (
    swi_product_id ~ '^c_gls_SWI1km_[0-9]{12}_CEURO_SCATSAR_V[0-9]+[.][0-9]+[.][0-9]+_cog$'
  ),
  swi_product_version text not null check (
    swi_product_version ~ '^V[0-9]+[.][0-9]+[.][0-9]+$'
  ),
  swi_nominal_at timestamptz not null,
  swi_content_start timestamptz not null,
  swi_content_end timestamptz not null,
  swi_published_at timestamptz not null,
  source_assets jsonb not null check (jsonb_typeof(source_assets) = 'object'),
  native_resolution_m smallint not null default 1000 check (native_resolution_m = 1000),
  expected_sample_count integer not null check (expected_sample_count between 1 and 100000),
  imported_sample_count integer not null default 0 check (imported_sample_count >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  check (ssm_content_start <= ssm_content_end),
  check (swi_content_start <= swi_content_end),
  check (imported_sample_count <= expected_sample_count),
  check (completed_at is null or imported_sample_count = expected_sample_count),
  check ((ssm_nominal_at at time zone 'UTC')::date = snapshot_date),
  check ((swi_nominal_at at time zone 'UTC')::date = snapshot_date)
);

create table public.clms_soil_samples (
  atmosphere_point_id text not null
    references public.weather_grid_points(point_id) on delete cascade,
  snapshot_date date not null
    references public.clms_soil_manifests(snapshot_date) on delete cascade,
  source_pixel_lat real not null check (source_pixel_lat between 35 and 72),
  source_pixel_lon real not null check (source_pixel_lon between -11 and 50),
  native_resolution_m smallint not null default 1000 check (native_resolution_m = 1000),
  sampling_resolution_m smallint not null default 2500 check (sampling_resolution_m = 2500),
  ssm_dn smallint not null check (
    ssm_dn between 0 and 200 or ssm_dn in (241, 242, 251, 252, 253, 255)
  ),
  ssm_noise_dn smallint not null check (
    ssm_noise_dn between 0 and 200 or ssm_noise_dn = 255
  ),
  swi_002_dn smallint not null check (
    swi_002_dn between 0 and 200 or swi_002_dn in (241, 242, 251, 252, 253, 254, 255)
  ),
  qflag_002_dn smallint not null check (
    qflag_002_dn between 0 and 200 or qflag_002_dn in (241, 242, 251, 252, 253, 254, 255)
  ),
  swi_005_dn smallint not null check (
    swi_005_dn between 0 and 200 or swi_005_dn in (241, 242, 251, 252, 253, 254, 255)
  ),
  qflag_005_dn smallint not null check (
    qflag_005_dn between 0 and 200 or qflag_005_dn in (241, 242, 251, 252, 253, 254, 255)
  ),
  swi_010_dn smallint not null check (
    swi_010_dn between 0 and 200 or swi_010_dn in (241, 242, 251, 252, 253, 254, 255)
  ),
  qflag_010_dn smallint not null check (
    qflag_010_dn between 0 and 200 or qflag_010_dn in (241, 242, 251, 252, 253, 254, 255)
  ),
  ssf_dn smallint not null check (ssf_dn between 0 and 4 or ssf_dn = 255),
  ssm_status text not null check (ssm_status in ('usable', 'limited', 'unavailable')),
  swi_t5_status text not null check (swi_t5_status in ('usable', 'limited', 'unavailable')),
  run_id uuid references public.ingestion_runs(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (atmosphere_point_id, snapshot_date)
);

create index clms_soil_samples_date_point_idx
  on public.clms_soil_samples (snapshot_date, atmosphere_point_id);

create index clms_soil_samples_run_idx
  on public.clms_soil_samples (run_id)
  where run_id is not null;

alter table public.clms_soil_manifests enable row level security;
alter table public.clms_soil_samples enable row level security;

revoke all on table public.clms_soil_manifests from public, anon, authenticated;
revoke all on table public.clms_soil_samples from public, anon, authenticated;
grant select, insert, update, delete on table public.clms_soil_manifests to service_role;
grant select, insert, update, delete on table public.clms_soil_samples to service_role;

create or replace function public.upsert_clms_soil_shadow(
  p_manifest jsonb,
  p_samples jsonb,
  p_run_id uuid,
  p_reset boolean,
  p_expected_samples integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_date date;
  expected_rows integer;
  affected_rows integer;
  stored_rows integer;
  newer_completed_rows integer;
begin
  if jsonb_typeof(p_manifest) <> 'object' then
    raise exception 'CLMS manifest must be an object';
  end if;
  if jsonb_typeof(p_samples) <> 'array' then
    raise exception 'CLMS samples must be an array';
  end if;

  target_date := (p_manifest ->> 'snapshot_date')::date;
  select pg_catalog.count(*)::integer
  into newer_completed_rows
  from public.clms_soil_manifests manifest
  where manifest.completed_at is not null
    and manifest.snapshot_date > target_date;
  if newer_completed_rows >= 4 then
    raise exception 'CLMS snapshot is older than the four-date hot preview';
  end if;
  expected_rows := jsonb_array_length(p_samples);
  if expected_rows < 1 or expected_rows > 500 then
    raise exception 'CLMS import batches must contain between 1 and 500 samples';
  end if;
  if p_expected_samples is null or p_expected_samples < expected_rows or p_expected_samples > 100000 then
    raise exception 'CLMS expected sample count is invalid';
  end if;

  if p_reset then
    delete from public.clms_soil_samples where snapshot_date = target_date;
  elsif exists (
    select 1
    from public.clms_soil_manifests existing
    where existing.snapshot_date = target_date
      and (
        existing.ssm_product_id <> (p_manifest ->> 'ssm_product_id')
        or existing.swi_product_id <> (p_manifest ->> 'swi_product_id')
        or existing.source_assets <> (p_manifest -> 'source_assets')
        or existing.expected_sample_count <> p_expected_samples
      )
  ) then
    raise exception 'CLMS product manifest changed after the first batch';
  end if;

  insert into public.clms_soil_manifests (
    snapshot_date,
    ssm_product_id,
    ssm_product_version,
    ssm_nominal_at,
    ssm_content_start,
    ssm_content_end,
    ssm_published_at,
    swi_product_id,
    swi_product_version,
    swi_nominal_at,
    swi_content_start,
    swi_content_end,
    swi_published_at,
    source_assets,
    native_resolution_m,
    expected_sample_count,
    imported_sample_count,
    completed_at,
    updated_at
  ) values (
    target_date,
    p_manifest ->> 'ssm_product_id',
    p_manifest ->> 'ssm_product_version',
    (p_manifest ->> 'ssm_nominal_at')::timestamptz,
    (p_manifest ->> 'ssm_content_start')::timestamptz,
    (p_manifest ->> 'ssm_content_end')::timestamptz,
    (p_manifest ->> 'ssm_published_at')::timestamptz,
    p_manifest ->> 'swi_product_id',
    p_manifest ->> 'swi_product_version',
    (p_manifest ->> 'swi_nominal_at')::timestamptz,
    (p_manifest ->> 'swi_content_start')::timestamptz,
    (p_manifest ->> 'swi_content_end')::timestamptz,
    (p_manifest ->> 'swi_published_at')::timestamptz,
    p_manifest -> 'source_assets',
    (p_manifest ->> 'native_resolution_m')::smallint,
    p_expected_samples,
    0,
    null,
    pg_catalog.now()
  )
  on conflict (snapshot_date) do update set
    ssm_product_id = excluded.ssm_product_id,
    ssm_product_version = excluded.ssm_product_version,
    ssm_nominal_at = excluded.ssm_nominal_at,
    ssm_content_start = excluded.ssm_content_start,
    ssm_content_end = excluded.ssm_content_end,
    ssm_published_at = excluded.ssm_published_at,
    swi_product_id = excluded.swi_product_id,
    swi_product_version = excluded.swi_product_version,
    swi_nominal_at = excluded.swi_nominal_at,
    swi_content_start = excluded.swi_content_start,
    swi_content_end = excluded.swi_content_end,
    swi_published_at = excluded.swi_published_at,
    source_assets = excluded.source_assets,
    native_resolution_m = excluded.native_resolution_m,
    expected_sample_count = excluded.expected_sample_count,
    imported_sample_count = case
      when p_reset then 0
      else public.clms_soil_manifests.imported_sample_count
    end,
    completed_at = null,
    updated_at = pg_catalog.now();

  insert into public.clms_soil_samples (
    atmosphere_point_id,
    snapshot_date,
    source_pixel_lat,
    source_pixel_lon,
    native_resolution_m,
    sampling_resolution_m,
    ssm_dn,
    ssm_noise_dn,
    swi_002_dn,
    qflag_002_dn,
    swi_005_dn,
    qflag_005_dn,
    swi_010_dn,
    qflag_010_dn,
    ssf_dn,
    ssm_status,
    swi_t5_status,
    run_id,
    updated_at
  )
  select
    incoming.atmosphere_point_id,
    target_date,
    incoming.source_pixel_lat,
    incoming.source_pixel_lon,
    1000,
    2500,
    incoming.ssm_dn,
    incoming.ssm_noise_dn,
    incoming.swi_002_dn,
    incoming.qflag_002_dn,
    incoming.swi_005_dn,
    incoming.qflag_005_dn,
    incoming.swi_010_dn,
    incoming.qflag_010_dn,
    incoming.ssf_dn,
    incoming.ssm_status,
    incoming.swi_t5_status,
    p_run_id,
    pg_catalog.now()
  from jsonb_to_recordset(p_samples) as incoming(
    atmosphere_point_id text,
    source_pixel_lat real,
    source_pixel_lon real,
    ssm_dn smallint,
    ssm_noise_dn smallint,
    swi_002_dn smallint,
    qflag_002_dn smallint,
    swi_005_dn smallint,
    qflag_005_dn smallint,
    swi_010_dn smallint,
    qflag_010_dn smallint,
    ssf_dn smallint,
    ssm_status text,
    swi_t5_status text
  )
  join public.weather_grid_points point
    on point.point_id = incoming.atmosphere_point_id
   and point.model = 'arome_france'
   and point.native_resolution_m = 2500
   and pg_catalog.abs(point.requested_lat - incoming.source_pixel_lat) <= (1.0 / 224.0) + 0.000001
   and pg_catalog.abs(point.requested_lon - incoming.source_pixel_lon) <= (1.0 / 224.0) + 0.000001
  on conflict (atmosphere_point_id, snapshot_date) do update set
    source_pixel_lat = excluded.source_pixel_lat,
    source_pixel_lon = excluded.source_pixel_lon,
    native_resolution_m = excluded.native_resolution_m,
    sampling_resolution_m = excluded.sampling_resolution_m,
    ssm_dn = excluded.ssm_dn,
    ssm_noise_dn = excluded.ssm_noise_dn,
    swi_002_dn = excluded.swi_002_dn,
    qflag_002_dn = excluded.qflag_002_dn,
    swi_005_dn = excluded.swi_005_dn,
    qflag_005_dn = excluded.qflag_005_dn,
    swi_010_dn = excluded.swi_010_dn,
    qflag_010_dn = excluded.qflag_010_dn,
    ssf_dn = excluded.ssf_dn,
    ssm_status = excluded.ssm_status,
    swi_t5_status = excluded.swi_t5_status,
    run_id = excluded.run_id,
    updated_at = pg_catalog.now();

  get diagnostics affected_rows = row_count;
  if affected_rows <> expected_rows then
    raise exception 'CLMS import matched % of % canonical atmosphere points', affected_rows, expected_rows;
  end if;

  select pg_catalog.count(*)::integer
  into stored_rows
  from public.clms_soil_samples
  where snapshot_date = target_date;

  update public.clms_soil_manifests
  set imported_sample_count = stored_rows,
      completed_at = null,
      updated_at = pg_catalog.now()
  where snapshot_date = target_date;

  return jsonb_build_object(
    'snapshotDate', target_date,
    'samplesWritten', affected_rows,
    'samplesStoredForDate', stored_rows,
    'expectedSamples', p_expected_samples,
    'complete', false
  );
end;
$$;

revoke all on function public.upsert_clms_soil_shadow(jsonb, jsonb, uuid, boolean, integer)
  from public, anon, authenticated;
grant execute on function public.upsert_clms_soil_shadow(jsonb, jsonb, uuid, boolean, integer)
  to service_role;

create or replace function public.finalize_clms_soil_shadow(
  p_snapshot_date date,
  p_expected_samples integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  stored_rows integer;
  canonical_rows integer;
  import_complete boolean;
  retained_before date;
begin
  if p_snapshot_date is null or p_expected_samples is null or p_expected_samples < 1 then
    raise exception 'CLMS completion coordinates are invalid';
  end if;
  if not exists (
    select 1
    from public.clms_soil_manifests manifest
    where manifest.snapshot_date = p_snapshot_date
      and manifest.expected_sample_count = p_expected_samples
  ) then
    raise exception 'CLMS manifest or expected sample count is unavailable';
  end if;

  select pg_catalog.count(*)::integer
  into stored_rows
  from public.clms_soil_samples sample
  where sample.snapshot_date = p_snapshot_date;

  select pg_catalog.count(*)::integer
  into canonical_rows
  from public.weather_grid_points point
  where point.model = 'arome_france'
    and point.native_resolution_m = 2500;

  import_complete := stored_rows = p_expected_samples
    and p_expected_samples = canonical_rows
    and canonical_rows > 0;

  update public.clms_soil_manifests
  set imported_sample_count = stored_rows,
      completed_at = case when import_complete then pg_catalog.now() else null end,
      updated_at = pg_catalog.now()
  where snapshot_date = p_snapshot_date;

  -- Keep the newest four completed product dates, even when provider dates
  -- have gaps. The upsert gate ensures a newly finalized target is among them.
  delete from public.clms_soil_manifests manifest
  where manifest.completed_at is not null
    and manifest.snapshot_date in (
      select older.snapshot_date
      from public.clms_soil_manifests older
      where older.completed_at is not null
      order by older.snapshot_date desc
      offset 4
    );

  select pg_catalog.min(manifest.snapshot_date)
  into retained_before
  from public.clms_soil_manifests manifest
  where manifest.completed_at is not null;

  if retained_before is not null then
    delete from public.clms_soil_manifests manifest
    where manifest.completed_at is null
      and manifest.snapshot_date < retained_before;
  end if;

  select coalesce(manifest.completed_at is not null, false)
  into import_complete
  from public.clms_soil_manifests manifest
  where manifest.snapshot_date = p_snapshot_date;
  import_complete := coalesce(import_complete, false);

  return jsonb_build_object(
    'snapshotDate', p_snapshot_date,
    'samplesStoredForDate', stored_rows,
    'expectedSamples', p_expected_samples,
    'canonicalSampleCount', canonical_rows,
    'complete', import_complete,
    'retainedFrom', retained_before
  );
end;
$$;

revoke all on function public.finalize_clms_soil_shadow(date, integer)
  from public, anon, authenticated;
grant execute on function public.finalize_clms_soil_shadow(date, integer)
  to service_role;

comment on table public.clms_soil_manifests is
  'Private provenance and completeness state for the short Copernicus CLMS SSM/SWI hot preview. Nominal product date is distinct from STAC content-start time.';

comment on table public.clms_soil_samples is
  'Raw CLMS uint8 samples at canonical 2.5 km atmosphere points. Moisture and quality DNs use a 0.5 percent scale; SSF is an unscaled integer. This table is excluded from hydrothermal-v1.';

comment on column public.clms_soil_samples.native_resolution_m is
  'Native 1 km raster sampling; this is not the spacing of stored samples.';

comment on column public.clms_soil_samples.sampling_resolution_m is
  'Canonical 2.5 km AROME point spacing used to bound relational storage.';
