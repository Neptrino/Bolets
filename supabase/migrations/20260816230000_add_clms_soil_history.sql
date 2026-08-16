-- Append-only CLMS SWI/SSM history at canonical atmosphere points. The
-- existing clms_soil_manifests/clms_soil_samples pair is a four-date hot
-- preview; this table is the calibration archive it deliberately is not:
-- rows accumulate from the daily shadow import and from the 2025-07-14+
-- backfill so satellite soil can be validated against dated findings and,
-- if it earns the vacant v2 soil slot, fitted into a percentile
-- climatology. Raw uint8 DNs are stored unchanged (0.5 percent scale for
-- moisture and quality; SSF unscaled) with per-row product versions so
-- cross-version analyses stay explicit.

create table public.clms_soil_history (
  atmosphere_point_id text not null
    references public.weather_grid_points(point_id) on delete cascade,
  snapshot_date date not null,
  source_pixel_lat real not null check (source_pixel_lat between 35 and 72),
  source_pixel_lon real not null check (source_pixel_lon between -11 and 50),
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
  ssm_product_version text not null check (
    ssm_product_version ~ '^V[0-9]+[.][0-9]+[.][0-9]+$'
  ),
  swi_product_version text not null check (
    swi_product_version ~ '^V[0-9]+[.][0-9]+[.][0-9]+$'
  ),
  run_id uuid references public.ingestion_runs(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (atmosphere_point_id, snapshot_date)
);

create index clms_soil_history_date_idx
  on public.clms_soil_history (snapshot_date);

alter table public.clms_soil_history enable row level security;
revoke all on table public.clms_soil_history from public, anon, authenticated;
grant select, insert, update, delete on table public.clms_soil_history to service_role;

create or replace function public.upsert_clms_soil_history(
  p_manifest jsonb,
  p_samples jsonb,
  p_run_id uuid
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
begin
  if jsonb_typeof(p_manifest) <> 'object' then
    raise exception 'CLMS history manifest must be an object';
  end if;
  if jsonb_typeof(p_samples) <> 'array' then
    raise exception 'CLMS history samples must be an array';
  end if;
  target_date := (p_manifest ->> 'snapshot_date')::date;
  expected_rows := jsonb_array_length(p_samples);
  if expected_rows < 1 or expected_rows > 500 then
    raise exception 'CLMS history batches must contain between 1 and 500 samples';
  end if;

  insert into public.clms_soil_history (
    atmosphere_point_id,
    snapshot_date,
    source_pixel_lat,
    source_pixel_lon,
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
    ssm_product_version,
    swi_product_version,
    run_id,
    updated_at
  )
  select
    incoming.atmosphere_point_id,
    target_date,
    incoming.source_pixel_lat,
    incoming.source_pixel_lon,
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
    p_manifest ->> 'ssm_product_version',
    p_manifest ->> 'swi_product_version',
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
    ssm_product_version = excluded.ssm_product_version,
    swi_product_version = excluded.swi_product_version,
    run_id = excluded.run_id,
    updated_at = pg_catalog.now();

  get diagnostics affected_rows = row_count;
  if affected_rows <> expected_rows then
    raise exception 'CLMS history matched % of % canonical atmosphere points',
      affected_rows, expected_rows;
  end if;

  return jsonb_build_object(
    'snapshotDate', target_date,
    'historyRowsWritten', affected_rows
  );
end;
$$;

revoke all on function public.upsert_clms_soil_history(jsonb, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.upsert_clms_soil_history(jsonb, jsonb, uuid)
  to service_role;

comment on table public.clms_soil_history is
  'Append-only CLMS SSM/SWI archive at canonical 2.5 km atmosphere points, fed by the daily shadow import and the 2025-07-14+ backfill. Excluded from production scoring until satellite soil is validated into hydrothermal-v2.';
