-- Withdraw an already-published finding or delete a private/draft finding in
-- one database transaction. Storage objects are removed by the server route
-- using the paths returned here; the table rows cannot be left half-cleaned.

create or replace function public.remove_owner_finding(
  p_finding_id uuid,
  p_owner_id uuid
)
returns table (
  storage_paths text[],
  removal_mode text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_finding public.user_findings%rowtype;
  removed_paths text[];
  resolved_mode text;
begin
  select findings.* into target_finding
  from public.user_findings findings
  where findings.id = p_finding_id
    and findings.owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'Finding not found';
  end if;

  select coalesce(array_agg(photos.storage_path order by photos.position), array[]::text[])
    into removed_paths
  from public.user_finding_photos photos
  where photos.finding_id = p_finding_id;

  if target_finding.visibility = 'public'
    and target_finding.publication_state = 'published' then
    update public.user_findings findings
    set publication_state = 'hidden', updated_at = now()
    where findings.id = p_finding_id
      and findings.owner_id = p_owner_id;

    delete from public.user_finding_private_details details
    where details.finding_id = p_finding_id;

    delete from public.user_finding_photos photos
    where photos.finding_id = p_finding_id;

    resolved_mode := 'withdrawn';
  else
    delete from public.user_findings findings
    where findings.id = p_finding_id
      and findings.owner_id = p_owner_id;

    resolved_mode := 'deleted';
  end if;

  return query select removed_paths, resolved_mode;
end;
$$;

revoke all on function public.remove_owner_finding(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.remove_owner_finding(uuid, uuid)
  to service_role;

comment on function public.remove_owner_finding(uuid, uuid) is
  'Atomically withdraws a published owner finding or deletes a private/draft one, returning final photo paths for Storage cleanup.';
