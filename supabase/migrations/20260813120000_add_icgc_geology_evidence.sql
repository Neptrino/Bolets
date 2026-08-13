-- ICGC geology is contextual, display-only evidence. Keep it physically
-- separate from scoring static_values/static_sources so importing it cannot
-- alter suitability or imply that 1:50,000 is a ground resolution.

alter table public.pipeline_sources
  drop constraint if exists pipeline_sources_source_kind_check;

alter table public.pipeline_sources
  add constraint pipeline_sources_source_kind_check
  check (source_kind in (
    'weather', 'terrain', 'soil', 'land-cover', 'occurrence', 'geology'
  ));

insert into public.pipeline_sources (
  source_id, title, source_url, source_kind, native_resolution_m,
  refresh_cadence, license, enabled, status, status_detail
) values (
  'icgc-geology-50k-v3',
  'ICGC Mapa geològic de Catalunya 1:50.000 v3r0',
  'https://datacloud.icgc.cat/datacloud/geologia-territorial-50000-geologic/gpkg/geologia-territorial-50000-geologic-v3r0-202412.zip',
  'geology',
  null,
  'static; review annually',
  'CC BY 4.0',
  true,
  'active',
  'Polygon units provide contextual substrate evidence at map scale 1:50,000; they are excluded from suitability scoring.'
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
  checked_at = pg_catalog.now(),
  updated_at = pg_catalog.now();

create table public.geology_sources (
  source_id text primary key
    references public.pipeline_sources(source_id) on delete restrict,
  dataset_version text not null,
  map_scale_denominator integer not null check (map_scale_denominator > 0),
  layer_name text not null check (
    pg_catalog.length(pg_catalog.btrim(layer_name)) between 1 and 128
  ),
  package_sha256 text not null check (package_sha256 ~ '^[0-9a-f]{64}$'),
  classification_version smallint not null check (classification_version > 0),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

insert into public.geology_sources (
  source_id,
  dataset_version,
  map_scale_denominator,
  layer_name,
  package_sha256,
  classification_version
) values (
  'icgc-geology-50k-v3',
  'v3r0-202412',
  50000,
  '_04_unitats_geologiques_50000',
  '60d730395874ee860d09ddddbf2cc60d187c46f05f9018e7049bcdf8a65b684f',
  1
);

create table public.geology_units (
  unit_id smallint primary key check (unit_id between 1 and 2047),
  source_id text not null
    references public.geology_sources(source_id) on delete restrict,
  unit_code text not null check (
    pg_catalog.length(pg_catalog.btrim(unit_code)) between 1 and 64
  ),
  description text not null check (
    pg_catalog.length(pg_catalog.btrim(description)) between 1 and 1000
  ),
  substrate_class text not null check (substrate_class in (
    'silicic', 'calcareous', 'mixed', 'unconsolidated', 'unknown'
  )),
  classification_version smallint not null check (classification_version > 0),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  unique (source_id, unit_code)
);

-- Each exact row stays narrow: an 8-byte coordinate key and one 8-byte
-- evidence word. The key stores unsigned 32-bit grid x/y values. Evidence uses
-- 7-bit lanes for four classified percentages, mapped percentage, a stable
-- 11-bit unit ID, and the dominant-unit percentage (53 bits in total).
create table public.spatial_geology_cells (
  cell_key bigint primary key check (
    cell_key >= 0
    and (cell_key >> 32) between 0 and 2147483647
    and (cell_key & 4294967295) between 0 and 2147483647
  ),
  evidence bigint not null check (
    evidence between 0 and 9007199254740991
    and (evidence >> 53) = 0
    and (evidence & 127) <= 100
    and ((evidence >> 7) & 127) <= 100
    and ((evidence >> 14) & 127) <= 100
    and ((evidence >> 21) & 127) <= 100
    and ((evidence >> 28) & 127) between 1 and 100
    and (
      (evidence & 127)
      + ((evidence >> 7) & 127)
      + ((evidence >> 14) & 127)
      + ((evidence >> 21) & 127)
    ) <= ((evidence >> 28) & 127)
    and (
      (
        ((evidence >> 35) & 2047) = 0
        and ((evidence >> 46) & 127) = 0
      )
      or (
        ((evidence >> 35) & 2047) between 1 and 2047
        and ((evidence >> 46) & 127) between 1
          and ((evidence >> 28) & 127)
      )
    )
  )
);

create table public.spatial_geology_levels (
  grid_size_m smallint not null check (
    grid_size_m in (1000, 2500, 5000, 10000)
  ),
  cell_key bigint not null check (
    cell_key >= 0
    and (cell_key >> 32) between 0 and 2147483647
    and (cell_key & 4294967295) between 0 and 2147483647
  ),
  evidence bigint not null check (
    evidence between 0 and 9007199254740991
    and (evidence >> 53) = 0
    and (evidence & 127) <= 100
    and ((evidence >> 7) & 127) <= 100
    and ((evidence >> 14) & 127) <= 100
    and ((evidence >> 21) & 127) <= 100
    and ((evidence >> 28) & 127) between 1 and 100
    and (
      (evidence & 127)
      + ((evidence >> 7) & 127)
      + ((evidence >> 14) & 127)
      + ((evidence >> 21) & 127)
    ) <= ((evidence >> 28) & 127)
    and (
      (
        ((evidence >> 35) & 2047) = 0
        and ((evidence >> 46) & 127) = 0
      )
      or (
        ((evidence >> 35) & 2047) between 1 and 2047
        and ((evidence >> 46) & 127) between 1
          and ((evidence >> 28) & 127)
      )
    )
  ),
  primary key (grid_size_m, cell_key)
);

alter table public.geology_sources enable row level security;
alter table public.geology_units enable row level security;
alter table public.spatial_geology_cells enable row level security;
alter table public.spatial_geology_levels enable row level security;

revoke all on table public.geology_sources from public, anon, authenticated;
revoke all on table public.geology_units from public, anon, authenticated;
revoke all on table public.spatial_geology_cells
  from public, anon, authenticated;
revoke all on table public.spatial_geology_levels
  from public, anon, authenticated;

grant select, insert, update, delete on table public.geology_sources
  to service_role;
grant select, insert, update, delete on table public.geology_units
  to service_role;
grant select, insert, update, delete on table public.spatial_geology_cells
  to service_role;
grant select, insert, update, delete on table public.spatial_geology_levels
  to service_role;

create or replace function public.upsert_geology_units(p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if p_rows is null
    or pg_catalog.jsonb_typeof(p_rows) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_rows) < 1
    or pg_catalog.jsonb_array_length(p_rows) > 2000 then
    raise exception 'Provide between 1 and 2,000 geology units';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_rows) payload(item)
    where pg_catalog.jsonb_typeof(payload.item) is distinct from 'object'
  ) then
    raise exception 'Every geology unit must be an object';
  end if;

  if exists (
    with incoming as (
      select
        coalesce(
          payload.item ->> 'unit_id',
          payload.item ->> 'unitId'
        )::smallint as unit_id,
        pg_catalog.btrim(coalesce(
          payload.item ->> 'unit_code',
          payload.item ->> 'unitCode',
          payload.item ->> 'code'
        )) as unit_code,
        pg_catalog.btrim(payload.item ->> 'description') as description,
        coalesce(
          payload.item ->> 'substrate_class',
          payload.item ->> 'substrateClass',
          payload.item ->> 'class'
        ) as substrate_class,
        coalesce(
          payload.item ->> 'classification_version',
          payload.item ->> 'classificationVersion',
          '1'
        )::smallint as classification_version
      from pg_catalog.jsonb_array_elements(p_rows) payload(item)
    )
    select 1
    from incoming
    where unit_id not between 1 and 2047
      or pg_catalog.length(unit_code) not between 1 and 64
      or pg_catalog.length(description) not between 1 and 1000
      or substrate_class not in (
        'silicic', 'calcareous', 'mixed', 'unconsolidated', 'unknown'
      )
      or classification_version <> 1
  ) then
    raise exception 'Invalid geology unit';
  end if;

  if exists (
    with incoming as (
      select
        coalesce(
          payload.item ->> 'unit_id',
          payload.item ->> 'unitId'
        )::smallint as unit_id,
        pg_catalog.btrim(coalesce(
          payload.item ->> 'unit_code',
          payload.item ->> 'unitCode',
          payload.item ->> 'code'
        )) as unit_code
      from pg_catalog.jsonb_array_elements(p_rows) payload(item)
    )
    select 1
    from incoming
    group by incoming.unit_id
    having pg_catalog.count(*) > 1
    union all
    select 1
    from incoming
    group by incoming.unit_code
    having pg_catalog.count(*) > 1
  ) then
    raise exception 'Geology unit IDs and codes must be unique within a batch';
  end if;

  if exists (
    with incoming as (
      select
        coalesce(
          payload.item ->> 'unit_id',
          payload.item ->> 'unitId'
        )::smallint as unit_id,
        pg_catalog.btrim(coalesce(
          payload.item ->> 'unit_code',
          payload.item ->> 'unitCode',
          payload.item ->> 'code'
        )) as unit_code
      from pg_catalog.jsonb_array_elements(p_rows) payload(item)
    )
    select 1
    from incoming
    join public.geology_units existing
      on existing.unit_id = incoming.unit_id
        or existing.unit_code = incoming.unit_code
    where existing.unit_id <> incoming.unit_id
      or existing.unit_code <> incoming.unit_code
  ) then
    raise exception 'A geology unit ID or code cannot be reassigned';
  end if;

  insert into public.geology_units as existing (
    unit_id,
    source_id,
    unit_code,
    description,
    substrate_class,
    classification_version,
    updated_at
  )
  select
    coalesce(
      payload.item ->> 'unit_id',
      payload.item ->> 'unitId'
    )::smallint,
    'icgc-geology-50k-v3',
    pg_catalog.btrim(coalesce(
      payload.item ->> 'unit_code',
      payload.item ->> 'unitCode',
      payload.item ->> 'code'
    )),
    pg_catalog.btrim(payload.item ->> 'description'),
    coalesce(
      payload.item ->> 'substrate_class',
      payload.item ->> 'substrateClass',
      payload.item ->> 'class'
    ),
    coalesce(
      payload.item ->> 'classification_version',
      payload.item ->> 'classificationVersion',
      '1'
    )::smallint,
    pg_catalog.now()
  from pg_catalog.jsonb_array_elements(p_rows) payload(item)
  on conflict (unit_id) do update set
    description = excluded.description,
    substrate_class = excluded.substrate_class,
    classification_version = excluded.classification_version,
    updated_at = excluded.updated_at
  where (
    existing.description,
    existing.substrate_class,
    existing.classification_version
  ) is distinct from (
    excluded.description,
    excluded.substrate_class,
    excluded.classification_version
  );

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

create or replace function public.backfill_spatial_geology_evidence(p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_rows integer;
  affected_rows integer;
begin
  if p_rows is null
    or pg_catalog.jsonb_typeof(p_rows) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_rows) < 1
    or pg_catalog.jsonb_array_length(p_rows) > 1000 then
    raise exception 'Provide between 1 and 1,000 geology evidence rows';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_rows) payload(item)
    where pg_catalog.jsonb_typeof(payload.item) is distinct from 'object'
  ) then
    raise exception 'Every geology evidence row must be an object';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_rows) payload(item)
    where coalesce(
      payload.item ->> 'cell_id',
      payload.item ->> 'cellId',
      ''
    ) !~ '^epsg25831:250:(0|[1-9][0-9]*):(0|[1-9][0-9]*)$'
  ) then
    raise exception 'Every geology row must have a canonical 250 m cell ID';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_rows) payload(item)
    where pg_catalog.split_part(coalesce(
      payload.item ->> 'cell_id',
      payload.item ->> 'cellId'
    ), ':', 3)::bigint > 2147483647
      or pg_catalog.split_part(coalesce(
        payload.item ->> 'cell_id',
        payload.item ->> 'cellId'
      ), ':', 4)::bigint > 2147483647
  ) then
    raise exception 'Geology grid coordinates exceed the compact key range';
  end if;

  if exists (
    with incoming as (
      select coalesce(
        payload.item ->> 'cell_id',
        payload.item ->> 'cellId'
      ) as cell_id
      from pg_catalog.jsonb_array_elements(p_rows) payload(item)
    )
    select 1
    from incoming
    group by incoming.cell_id
    having pg_catalog.count(*) > 1
  ) then
    raise exception 'Cell IDs must be unique within a batch';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_rows) payload(item)
    where not exists (
      select 1
      from public.spatial_cells cells
      where cells.cell_id = coalesce(
        payload.item ->> 'cell_id',
        payload.item ->> 'cellId'
      )
    )
  ) then
    raise exception 'Every geology row must reference an existing 250 m cell';
  end if;

  if exists (
    with incoming as (
      select
        coalesce(
          payload.item ->> 'geology_class_coverages',
          payload.item ->> 'classCoveragesPacked',
          payload.item ->> 'geologyClassCoverages'
        )::bigint as class_coverages,
        coalesce(
          payload.item ->> 'geology_mapped_coverage_percent',
          payload.item ->> 'mappedCoveragePercent',
          payload.item ->> 'geologyMappedCoveragePercent'
        )::smallint as mapped_percent,
        coalesce(
          payload.item ->> 'geology_unit_id',
          payload.item ->> 'dominantUnitId',
          payload.item ->> 'geologyUnitId'
        )::smallint as unit_id,
        coalesce(
          payload.item ->> 'geology_unit_coverage_percent',
          payload.item ->> 'dominantUnitCoveragePercent',
          payload.item ->> 'geologyUnitCoveragePercent'
        )::smallint as unit_percent
      from pg_catalog.jsonb_array_elements(p_rows) payload(item)
    )
    select 1
    from incoming
    where (
      (
        class_coverages is null
        and mapped_percent is null
        and unit_id is null
        and unit_percent is null
      )
      or (
        class_coverages between 0 and 268435455
        and (class_coverages & 127) <= 100
        and ((class_coverages >> 7) & 127) <= 100
        and ((class_coverages >> 14) & 127) <= 100
        and ((class_coverages >> 21) & 127) <= 100
        and mapped_percent between 1 and 100
        and (
          (class_coverages & 127)
          + ((class_coverages >> 7) & 127)
          + ((class_coverages >> 14) & 127)
          + ((class_coverages >> 21) & 127)
        ) <= mapped_percent
        and (
          (unit_id is null and unit_percent is null)
          or (
            unit_id between 1 and 2047
            and unit_percent between 1 and mapped_percent
          )
        )
      )
    ) is not true
  ) then
    raise exception 'Invalid compact geology evidence';
  end if;

  if exists (
    with incoming as (
      select coalesce(
        payload.item ->> 'geology_unit_id',
        payload.item ->> 'dominantUnitId',
        payload.item ->> 'geologyUnitId'
      )::smallint as unit_id
      from pg_catalog.jsonb_array_elements(p_rows) payload(item)
    )
    select 1
    from incoming
    where incoming.unit_id is not null
      and not exists (
        select 1
        from public.geology_units units
        where units.unit_id = incoming.unit_id
      )
  ) then
    raise exception 'Every dominant geology unit must exist in the lookup';
  end if;

  with incoming as (
    select
      (
        pg_catalog.split_part(coalesce(
          payload.item ->> 'cell_id',
          payload.item ->> 'cellId'
        ), ':', 3)::bigint << 32
      ) | pg_catalog.split_part(coalesce(
        payload.item ->> 'cell_id',
        payload.item ->> 'cellId'
      ), ':', 4)::bigint as cell_key,
      coalesce(
        payload.item ->> 'geology_class_coverages',
        payload.item ->> 'classCoveragesPacked',
        payload.item ->> 'geologyClassCoverages'
      )::bigint as class_coverages,
      coalesce(
        payload.item ->> 'geology_mapped_coverage_percent',
        payload.item ->> 'mappedCoveragePercent',
        payload.item ->> 'geologyMappedCoveragePercent'
      )::smallint as mapped_percent,
      coalesce(
        payload.item ->> 'geology_unit_id',
        payload.item ->> 'dominantUnitId',
        payload.item ->> 'geologyUnitId'
      )::smallint as unit_id,
      coalesce(
        payload.item ->> 'geology_unit_coverage_percent',
        payload.item ->> 'dominantUnitCoveragePercent',
        payload.item ->> 'geologyUnitCoveragePercent'
      )::smallint as unit_percent
    from pg_catalog.jsonb_array_elements(p_rows) payload(item)
  )
  delete from public.spatial_geology_cells existing
  using incoming
  where existing.cell_key = incoming.cell_key
    and incoming.class_coverages is null
    and incoming.mapped_percent is null
    and incoming.unit_id is null
    and incoming.unit_percent is null;

  get diagnostics deleted_rows = row_count;

  insert into public.spatial_geology_cells as existing (cell_key, evidence)
  select
    (
      pg_catalog.split_part(coalesce(
        payload.item ->> 'cell_id',
        payload.item ->> 'cellId'
      ), ':', 3)::bigint << 32
    ) | pg_catalog.split_part(coalesce(
      payload.item ->> 'cell_id',
      payload.item ->> 'cellId'
    ), ':', 4)::bigint,
    coalesce(
      payload.item ->> 'geology_class_coverages',
      payload.item ->> 'classCoveragesPacked',
      payload.item ->> 'geologyClassCoverages'
    )::bigint
      | (
        coalesce(
          payload.item ->> 'geology_mapped_coverage_percent',
          payload.item ->> 'mappedCoveragePercent',
          payload.item ->> 'geologyMappedCoveragePercent'
        )::bigint << 28
      )
      | (
        coalesce(
          payload.item ->> 'geology_unit_id',
          payload.item ->> 'dominantUnitId',
          payload.item ->> 'geologyUnitId',
          '0'
        )::bigint << 35
      )
      | (
        coalesce(
          payload.item ->> 'geology_unit_coverage_percent',
          payload.item ->> 'dominantUnitCoveragePercent',
          payload.item ->> 'geologyUnitCoveragePercent',
          '0'
        )::bigint << 46
      )
  from pg_catalog.jsonb_array_elements(p_rows) payload(item)
  where coalesce(
    payload.item ->> 'geology_class_coverages',
    payload.item ->> 'classCoveragesPacked',
    payload.item ->> 'geologyClassCoverages'
  ) is not null
  on conflict (cell_key) do update set
    evidence = excluded.evidence
  where existing.evidence is distinct from excluded.evidence;

  get diagnostics affected_rows = row_count;
  return deleted_rows + affected_rows;
end;
$$;

create or replace function public.refresh_spatial_geology_level(
  p_grid_size_m integer
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  bucket_factor integer;
  affected_rows integer;
  deleted_rows integer;
begin
  if p_grid_size_m not in (1000, 2500, 5000, 10000) then
    raise exception 'Unsupported spatial geology grid size: %', p_grid_size_m;
  end if;

  bucket_factor := p_grid_size_m / 250;

  insert into public.spatial_geology_levels as existing (
    grid_size_m,
    cell_key,
    evidence
  )
  with base as materialized (
    select
      (
        ((geology.cell_key >> 32) / bucket_factor) << 32
      ) | ((geology.cell_key & 4294967295) / bucket_factor) as parent_key,
      geology.evidence & 127 as silicic_percent,
      (geology.evidence >> 7) & 127 as calcareous_percent,
      (geology.evidence >> 14) & 127 as mixed_percent,
      (geology.evidence >> 21) & 127 as unconsolidated_percent,
      (geology.evidence >> 28) & 127 as mapped_percent,
      (geology.evidence >> 35) & 2047 as unit_id,
      (geology.evidence >> 46) & 127 as unit_percent
    from public.spatial_geology_cells geology
    join public.spatial_cells cells
      on cells.cell_id = 'epsg25831:250:'
        || (geology.cell_key >> 32)::text
        || ':'
        || (geology.cell_key & 4294967295)::text
    where cells.static_verified
      and cells.weather_point_id is not null
  ),
  coverage_totals as materialized (
    select
      base.parent_key,
      pg_catalog.sum(base.silicic_percent)::bigint as silicic_total,
      pg_catalog.sum(base.calcareous_percent)::bigint as calcareous_total,
      pg_catalog.sum(base.mixed_percent)::bigint as mixed_total,
      pg_catalog.sum(base.unconsolidated_percent)::bigint
        as unconsolidated_total,
      pg_catalog.sum(base.mapped_percent)::bigint as mapped_total
    from base
    group by base.parent_key
  ),
  unit_totals as materialized (
    select
      base.parent_key,
      base.unit_id,
      pg_catalog.sum(base.unit_percent)::bigint as unit_total
    from base
    where base.unit_id > 0
    group by base.parent_key, base.unit_id
  ),
  ranked_units as (
    select
      unit_totals.*,
      pg_catalog.row_number() over (
        partition by unit_totals.parent_key
        order by unit_totals.unit_total desc, unit_totals.unit_id
      ) as rank
    from unit_totals
  ),
  rolled as (
    select
      coverage_totals.parent_key,
      levels.base_cell_count,
      (coverage_totals.silicic_total / levels.base_cell_count)::bigint
        as silicic_percent,
      (coverage_totals.calcareous_total / levels.base_cell_count)::bigint
        as calcareous_percent,
      (coverage_totals.mixed_total / levels.base_cell_count)::bigint
        as mixed_percent,
      (coverage_totals.unconsolidated_total / levels.base_cell_count)::bigint
        as unconsolidated_percent,
      greatest(
        1::bigint,
        coverage_totals.mapped_total / levels.base_cell_count
      )::bigint as mapped_percent,
      case
        when ranked_units.unit_total * 10 >= coverage_totals.mapped_total * 7
          and ranked_units.unit_total >= levels.base_cell_count
          then ranked_units.unit_id
        else 0
      end::bigint as unit_id,
      case
        when ranked_units.unit_total * 10 >= coverage_totals.mapped_total * 7
          and ranked_units.unit_total >= levels.base_cell_count
          then ranked_units.unit_total / levels.base_cell_count
        else 0
      end::bigint as unit_percent
    from coverage_totals
    join public.spatial_cell_levels levels
      on levels.grid_size_m = p_grid_size_m
      and levels.cell_id = 'epsg25831:' || p_grid_size_m
        || ':' || (coverage_totals.parent_key >> 32)::text
        || ':' || (coverage_totals.parent_key & 4294967295)::text
    left join ranked_units
      on ranked_units.parent_key = coverage_totals.parent_key
      and ranked_units.rank = 1
  )
  select
    p_grid_size_m::smallint,
    rolled.parent_key,
    rolled.silicic_percent
      | (rolled.calcareous_percent << 7)
      | (rolled.mixed_percent << 14)
      | (rolled.unconsolidated_percent << 21)
      | (rolled.mapped_percent << 28)
      | (rolled.unit_id << 35)
      | (rolled.unit_percent << 46)
  from rolled
  on conflict (grid_size_m, cell_key) do update set
    evidence = excluded.evidence
  where existing.evidence is distinct from excluded.evidence;

  get diagnostics affected_rows = row_count;

  with current_parents as materialized (
    select distinct
      (
        ((geology.cell_key >> 32) / bucket_factor) << 32
      ) | ((geology.cell_key & 4294967295) / bucket_factor) as parent_key
    from public.spatial_geology_cells geology
    join public.spatial_cells cells
      on cells.cell_id = 'epsg25831:250:'
        || (geology.cell_key >> 32)::text
        || ':'
        || (geology.cell_key & 4294967295)::text
    join public.spatial_cell_levels levels
      on levels.grid_size_m = p_grid_size_m
      and levels.cell_id = 'epsg25831:' || p_grid_size_m
        || ':' || ((geology.cell_key >> 32) / bucket_factor)::text
        || ':' || ((geology.cell_key & 4294967295) / bucket_factor)::text
    where cells.static_verified
      and cells.weather_point_id is not null
  )
  delete from public.spatial_geology_levels stale
  where stale.grid_size_m = p_grid_size_m
    and not exists (
      select 1
      from current_parents
      where current_parents.parent_key = stale.cell_key
    );

  get diagnostics deleted_rows = row_count;
  return affected_rows + deleted_rows;
end;
$$;

create or replace function public.read_spatial_geology_evidence(
  p_cell_ids text[],
  p_grid_size_m integer
)
returns table (
  cell_id text,
  silicic_percent smallint,
  calcareous_percent smallint,
  mixed_percent smallint,
  unconsolidated_percent smallint,
  unknown_percent smallint,
  mapped_percent smallint,
  dominant_unit_code text,
  dominant_unit_coverage_percent smallint,
  source_id text,
  scale_denominator integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_cell_ids is null
    or pg_catalog.cardinality(p_cell_ids) < 1
    or pg_catalog.cardinality(p_cell_ids) > 1000
    or pg_catalog.array_position(p_cell_ids, null) is not null then
    raise exception 'Provide between 1 and 1,000 non-null cell IDs';
  end if;

  if p_grid_size_m not in (250, 1000, 2500, 5000, 10000) then
    raise exception 'Unsupported spatial geology grid size: %', p_grid_size_m;
  end if;

  if exists (
    select 1
    from pg_catalog.unnest(p_cell_ids) requested(cell_id)
    where requested.cell_id
      !~ '^epsg25831:[0-9]+:(0|[1-9][0-9]*):(0|[1-9][0-9]*)$'
      or pg_catalog.split_part(requested.cell_id, ':', 2)::integer
        <> p_grid_size_m
  ) then
    raise exception 'Every requested cell ID must match the requested grid size';
  end if;

  if exists (
    select 1
    from pg_catalog.unnest(p_cell_ids) requested(cell_id)
    where pg_catalog.split_part(requested.cell_id, ':', 3)::bigint
        > 2147483647
      or pg_catalog.split_part(requested.cell_id, ':', 4)::bigint
        > 2147483647
  ) then
    raise exception 'Requested geology grid coordinates exceed the compact key range';
  end if;

  return query
  with requested as materialized (
    select
      requested_values.requested_cell_id,
      (
        pg_catalog.split_part(
          requested_values.requested_cell_id,
          ':',
          3
        )::bigint << 32
      ) | pg_catalog.split_part(
        requested_values.requested_cell_id,
        ':',
        4
      )::bigint as cell_key,
      pg_catalog.min(requested_values.ordinality) as ordinality
    from pg_catalog.unnest(p_cell_ids) with ordinality
      requested_values(requested_cell_id, ordinality)
    group by requested_values.requested_cell_id
  ),
  evidence_rows as (
    select
      requested.requested_cell_id,
      exact.evidence,
      requested.ordinality
    from requested
    join public.spatial_geology_cells exact
      on exact.cell_key = requested.cell_key
    where p_grid_size_m = 250

    union all

    select
      requested.requested_cell_id,
      levels.evidence,
      requested.ordinality
    from requested
    join public.spatial_geology_levels levels
      on levels.grid_size_m = p_grid_size_m
      and levels.cell_key = requested.cell_key
    where p_grid_size_m <> 250
  )
  select
    evidence_rows.requested_cell_id,
    (evidence_rows.evidence & 127)::smallint,
    ((evidence_rows.evidence >> 7) & 127)::smallint,
    ((evidence_rows.evidence >> 14) & 127)::smallint,
    ((evidence_rows.evidence >> 21) & 127)::smallint,
    (
      ((evidence_rows.evidence >> 28) & 127)
      - (evidence_rows.evidence & 127)
      - ((evidence_rows.evidence >> 7) & 127)
      - ((evidence_rows.evidence >> 14) & 127)
      - ((evidence_rows.evidence >> 21) & 127)
    )::smallint,
    ((evidence_rows.evidence >> 28) & 127)::smallint,
    units.unit_code,
    nullif((evidence_rows.evidence >> 46) & 127, 0)::smallint,
    sources.source_id,
    sources.map_scale_denominator
  from evidence_rows
  left join public.geology_units units
    on units.unit_id = ((evidence_rows.evidence >> 35) & 2047)::smallint
  cross join public.geology_sources sources
  where sources.source_id = 'icgc-geology-50k-v3'
  order by evidence_rows.ordinality;
end;
$$;

revoke all on function public.upsert_geology_units(jsonb)
  from public, anon, authenticated;
revoke all on function public.backfill_spatial_geology_evidence(jsonb)
  from public, anon, authenticated;
revoke all on function public.refresh_spatial_geology_level(integer)
  from public, anon, authenticated;
revoke all on function public.read_spatial_geology_evidence(text[], integer)
  from public, anon, authenticated;

grant execute on function public.upsert_geology_units(jsonb) to service_role;
grant execute on function public.backfill_spatial_geology_evidence(jsonb)
  to service_role;
grant execute on function public.refresh_spatial_geology_level(integer)
  to service_role;
grant execute on function public.read_spatial_geology_evidence(text[], integer)
  to service_role;

comment on table public.geology_sources is
  'Version, checksum, and cartographic scale for display-only geological evidence.';
comment on table public.geology_units is
  'Stable ICGC unit IDs and reviewed broad substrate classifications; not scoring inputs.';
comment on table public.spatial_geology_cells is
  'Compact side table for exact 250 m display-only geology. It avoids rewriting the much wider spatial_cells heap.';
comment on column public.spatial_geology_cells.cell_key is
  'Packed EPSG:25831 grid x/y key: unsigned x in the high 32 bits and y in the low 32 bits.';
comment on column public.spatial_geology_cells.evidence is
  'Packed percentages and dominant unit in 53 bits; unknown is mapped coverage minus four classified lanes.';
comment on table public.spatial_geology_levels is
  'Compact area-weighted geology rollups derived only from canonical 250 m side-table evidence.';
comment on function public.upsert_geology_units(jsonb) is
  'Service-only upsert for the versioned ICGC lookup without allowing stable IDs or codes to be reassigned.';
comment on function public.backfill_spatial_geology_evidence(jsonb) is
  'Service-only compact upsert for existing canonical cells; a cell-only payload removes its geology evidence.';
comment on function public.refresh_spatial_geology_level(integer) is
  'Area-weights exact compact geology evidence into one existing coarse spatial level.';
comment on function public.read_spatial_geology_evidence(text[], integer) is
  'Reads display-only geology for at most 1,000 requested cell IDs without exposing side tables publicly.';
