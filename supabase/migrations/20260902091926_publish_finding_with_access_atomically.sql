-- Publication and its optional seven-day grant share one transaction. A
-- failed grant can no longer leave a published finding without its access.

drop function public.publish_user_finding(uuid, uuid);

create function public.publish_user_finding(
  p_finding_id uuid,
  p_owner_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.user_findings%rowtype;
  account_created_at timestamptz;
  public_limit integer;
  cooldown_until timestamptz;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text, 0)
  );

  select finding.* into target
  from public.user_findings finding
  where finding.id = p_finding_id and finding.owner_id = p_owner_id
  for update;
  if not found or target.publication_state <> 'draft' then
    raise exception 'Finding is not an editable draft';
  end if;

  if target.visibility = 'public' then
    select profile.publication_cooldown_until into cooldown_until
    from public.finding_profiles profile where profile.user_id = p_owner_id;
    if cooldown_until > now() then
      raise exception 'Public publishing is temporarily paused for this account';
    end if;

    select account.created_at into account_created_at
    from auth.users account where account.id = p_owner_id;
    public_limit := case when account_created_at > now() - interval '30 days' then 5 else 20 end;
    if public_limit <= (
      select count(*) from public.user_findings finding
      where finding.owner_id = p_owner_id
        and finding.visibility = 'public'
        and finding.publication_state = 'published'
        and finding.updated_at >= now() - interval '24 hours'
    ) then
      raise exception 'Daily public finding limit reached';
    end if;
  end if;

  update public.user_findings finding
  set publication_state = 'published', updated_at = now()
  where finding.id = p_finding_id and finding.owner_id = p_owner_id;

  if target.visibility = 'public' then
    return public.grant_finding_map_access(p_finding_id, p_owner_id);
  end if;
  return null;
end;
$$;

revoke all on function public.publish_user_finding(uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_user_finding(uuid, uuid) to service_role;
