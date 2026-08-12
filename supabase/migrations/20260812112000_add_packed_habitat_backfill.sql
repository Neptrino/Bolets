create or replace function public.backfill_spatial_habitat_cover_counts(
  p_rows jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_rows integer;
begin
  if pg_catalog.jsonb_typeof(p_rows) <> 'array'
    or pg_catalog.jsonb_array_length(p_rows) < 1
    or pg_catalog.jsonb_array_length(p_rows) > 5000 then
    raise exception 'Provide between 1 and 5,000 cover rows';
  end if;

  update public.spatial_cells cells
  set habitat_cover_counts = incoming.packed
  from pg_catalog.jsonb_to_recordset(p_rows) as incoming(cell_id text, packed bigint)
  where cells.cell_id = incoming.cell_id
    and incoming.cell_id ~ '^[a-zA-Z0-9:_-]{3,120}$'
    and incoming.packed between 1 and 35184372088831
    and cells.habitat_cover_counts is distinct from incoming.packed;

  get diagnostics updated_rows = row_count;
  return updated_rows;
end;
$$;

revoke all on function public.backfill_spatial_habitat_cover_counts(jsonb)
  from public, anon, authenticated;
grant execute on function public.backfill_spatial_habitat_cover_counts(jsonb)
  to service_role;

comment on function public.backfill_spatial_habitat_cover_counts(jsonb) is
  'Updates packed ICGC cover samples for existing spatial cells only; used by the authenticated static importer.';
