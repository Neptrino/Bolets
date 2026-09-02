create function public.moderate_finding_abuse_signal(
  p_signal_id uuid,
  p_action text,
  p_moderator_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_signal public.finding_abuse_signals%rowtype;
  target_owner uuid;
  abuse_count integer;
begin
  if p_action not in ('hide', 'dismiss') then raise exception 'Invalid moderation action'; end if;
  if not exists (
    select 1 from public.finding_moderators moderator where moderator.user_id = p_moderator_id
  ) and not exists (
    select 1 from auth.users account where account.id = p_moderator_id
      and account.raw_app_meta_data ->> 'app_role' = 'admin'
  ) then raise exception 'Moderator role required'; end if;

  select signal.* into target_signal from public.finding_abuse_signals signal
  where signal.id = p_signal_id and signal.status = 'open' for update;
  if not found or target_signal.finding_id is null then return false; end if;

  select finding.owner_id into target_owner from public.user_findings finding
  where finding.id = target_signal.finding_id for update;

  if p_action = 'dismiss' then
    if target_signal.kind = 'near_duplicate' then
      update public.user_finding_photos photo set duplicate_review_state = 'clear'
      where photo.finding_id = target_signal.finding_id
        and photo.duplicate_review_state = 'near';
      if target_owner is not null then
        perform public.grant_finding_map_access(target_signal.finding_id, target_owner);
      end if;
    end if;
    update public.finding_abuse_signals signal set status = 'dismissed', resolved_at = now()
    where signal.id = p_signal_id;
    return true;
  end if;

  if target_owner is not null then
    perform public.revoke_finding_map_access(
      target_signal.finding_id,
      p_moderator_id,
      'Finding hidden after duplicate review'
    );
  end if;
  update public.user_findings finding set publication_state = 'hidden', updated_at = now()
  where finding.id = target_signal.finding_id;

  if target_owner is not null then
    insert into public.finding_profiles (user_id, confirmed_abuse_count)
    values (target_owner, 1)
    on conflict (user_id) do update set
      confirmed_abuse_count = public.finding_profiles.confirmed_abuse_count + 1,
      updated_at = now()
    returning confirmed_abuse_count into abuse_count;

    if abuse_count >= 2 then
      update public.finding_profiles profile set
        publication_cooldown_until = greatest(
          coalesce(profile.publication_cooldown_until, '-infinity'::timestamptz),
          now() + case when abuse_count >= 3 then interval '30 days' else interval '7 days' end
        ),
        updated_at = now()
      where profile.user_id = target_owner;
    end if;
  end if;

  update public.user_finding_flags flag set status = 'resolved', resolved_at = now()
  where flag.finding_id = target_signal.finding_id and flag.status = 'open';
  update public.finding_abuse_signals signal set status = 'resolved', resolved_at = now()
  where signal.finding_id = target_signal.finding_id and signal.status = 'open';
  return true;
end;
$$;

revoke all on function public.moderate_finding_abuse_signal(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.moderate_finding_abuse_signal(uuid, text, uuid)
  to service_role;
