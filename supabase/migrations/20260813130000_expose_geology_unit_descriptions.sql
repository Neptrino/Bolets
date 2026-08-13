-- Preserve the official lithology text for mapped units whose broad substrate
-- family cannot be inferred safely. This remains display-only evidence.

drop function public.read_spatial_geology_evidence(text[], integer);

create function public.read_spatial_geology_evidence(
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
  dominant_unit_description text,
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
    units.description,
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

revoke all on function public.read_spatial_geology_evidence(text[], integer)
  from public, anon, authenticated;
grant execute on function public.read_spatial_geology_evidence(text[], integer)
  to service_role;

comment on function public.read_spatial_geology_evidence(text[], integer) is
  'Reads display-only geology, including official dominant-unit lithology, for at most 1,000 requested cell IDs without exposing side tables publicly.';
