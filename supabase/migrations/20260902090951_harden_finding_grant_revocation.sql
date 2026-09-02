-- Keep grant eligibility correct when privacy, moderation or photo state
-- changes. The trigger drops make this safe in development databases where
-- the preceding migration was rehearsed before these invariants were added.

create or replace function public.grant_finding_map_access(
  p_finding_id uuid,
  p_user_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  access_row public.contributor_access%rowtype;
  existing_end timestamptz;
  grant_start timestamptz;
  grant_end timestamptz;
begin
  if not exists (
    select 1 from public.user_findings finding
    where finding.id = p_finding_id
      and finding.owner_id = p_user_id
      and finding.visibility = 'public'
      and finding.publication_state = 'published'
      and finding.observed_on between
        (now() at time zone 'Europe/Madrid')::date - 30
        and (now() at time zone 'Europe/Madrid')::date
      and exists (
        select 1 from public.user_finding_photos photo
        where photo.finding_id = finding.id
          and photo.is_public
          and photo.duplicate_review_state = 'clear'
      )
  ) then return null; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  select grant_row.ends_at into existing_end
  from public.finding_access_grants grant_row
  where grant_row.finding_id = p_finding_id;
  if found then return case
    when exists (
      select 1 from public.finding_access_grants grant_row
      where grant_row.finding_id = p_finding_id and grant_row.revoked_at is null
    ) then existing_end else null end;
  end if;

  if exists (
    select 1 from public.finding_access_grants grant_row
    where grant_row.user_id = p_user_id
      and grant_row.created_at > now() - interval '7 days'
  ) then return null; end if;

  select * into access_row
  from public.contributor_access access
  where access.user_id = p_user_id for update;
  if found and access_row.revoked_at is not null then return null; end if;

  grant_start := greatest(
    now(),
    coalesce(access_row.active_until, '-infinity'::timestamptz),
    coalesce(access_row.one_km_active_until, '-infinity'::timestamptz)
  );
  grant_end := grant_start + interval '7 days';

  insert into public.finding_access_grants (user_id, finding_id, starts_at, ends_at)
  values (p_user_id, p_finding_id, grant_start, grant_end);

  insert into public.contributor_access (user_id, one_km_active_until, last_finding_id)
  values (p_user_id, grant_end, p_finding_id)
  on conflict (user_id) do update set
    one_km_active_until = excluded.one_km_active_until,
    last_finding_id = excluded.last_finding_id,
    updated_at = now();
  return grant_end;
end;
$$;

create or replace function public.prioritize_independent_finding_flags()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_owner uuid;
  open_count integer;
begin
  select count(distinct flag.reporter_id) into open_count
  from public.user_finding_flags flag
  where flag.finding_id = new.finding_id and flag.status = 'open';
  if open_count >= 2 then
    select finding.owner_id into target_owner from public.user_findings finding
    where finding.id = new.finding_id;
    if target_owner is not null then
      insert into public.finding_abuse_signals (finding_id, user_id, kind, metadata)
      values (new.finding_id, target_owner, 'report_priority', jsonb_build_object('reportCount', open_count))
      on conflict do nothing;
      update public.finding_abuse_signals signal
      set metadata = jsonb_build_object('reportCount', open_count)
      where signal.finding_id = new.finding_id
        and signal.kind = 'report_priority'
        and signal.status = 'open';
    end if;
  else
    update public.finding_abuse_signals signal
    set status = 'dismissed', resolved_at = now()
    where signal.finding_id = new.finding_id
      and signal.kind = 'report_priority'
      and signal.status = 'open';
  end if;
  return new;
end;
$$;

drop trigger if exists prioritize_independent_finding_flags on public.user_finding_flags;
create trigger prioritize_independent_finding_flags
after insert or update of status on public.user_finding_flags
for each row execute function public.prioritize_independent_finding_flags();

create or replace function public.revoke_ineligible_finding_grant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is not null then
    perform public.revoke_finding_map_access(new.id, new.owner_id, 'Finding is no longer public');
  end if;
  return new;
end;
$$;

drop trigger if exists revoke_ineligible_finding_grant on public.user_findings;
create trigger revoke_ineligible_finding_grant
after update of visibility, publication_state on public.user_findings
for each row
when (
  old.visibility = 'public'
  and old.publication_state = 'published'
  and (new.visibility <> 'public' or new.publication_state <> 'published')
)
execute function public.revoke_ineligible_finding_grant();

create or replace function public.revoke_grant_without_public_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_finding uuid;
  target_owner uuid;
begin
  target_finding := case when tg_op = 'DELETE' then old.finding_id else new.finding_id end;
  if not exists (
    select 1 from public.user_finding_photos photo
    where photo.finding_id = target_finding
      and photo.is_public
      and photo.duplicate_review_state = 'clear'
  ) then
    select finding.owner_id into target_owner from public.user_findings finding
    where finding.id = target_finding;
    if target_owner is not null then
      perform public.revoke_finding_map_access(target_finding, target_owner, 'Finding no longer has an eligible public photo');
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists revoke_grant_without_public_photo on public.user_finding_photos;
create trigger revoke_grant_without_public_photo
after delete or update of is_public, duplicate_review_state on public.user_finding_photos
for each row execute function public.revoke_grant_without_public_photo();

revoke all on function public.grant_finding_map_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.grant_finding_map_access(uuid, uuid) to service_role;
