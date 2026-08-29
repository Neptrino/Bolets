-- PostgREST serializes geography values as EWKB. Convert the private point to
-- numeric coordinates inside PostgreSQL so only the authenticated owner's
-- server route handles an exact location.

create or replace function public.read_owner_finding_private_details(p_owner_id uuid)
returns table (
  finding_id uuid,
  exact_longitude double precision,
  exact_latitude double precision,
  location_accuracy_m double precision,
  quantity_band text,
  private_notes text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    details.finding_id,
    case
      when details.exact_location is null then null
      else extensions.st_x(details.exact_location::extensions.geometry)
    end as exact_longitude,
    case
      when details.exact_location is null then null
      else extensions.st_y(details.exact_location::extensions.geometry)
    end as exact_latitude,
    details.location_accuracy_m,
    details.quantity_band,
    details.private_notes
  from public.user_finding_private_details details
  join public.user_findings findings on findings.id = details.finding_id
  where findings.owner_id = p_owner_id;
$$;

revoke all on function public.read_owner_finding_private_details(uuid)
  from public, anon, authenticated;
grant execute on function public.read_owner_finding_private_details(uuid)
  to service_role;

comment on function public.read_owner_finding_private_details(uuid) is
  'Returns exact coordinates and private notes only to the server-side service client for one owner.';
