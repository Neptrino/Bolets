-- Abuse controls for public findings. Private drafts remain deliberately more
-- permissive; publication, grants and moderation are serialized server-side.

alter table public.user_finding_photos
  add column content_sha256 text,
  add column perceptual_hash text,
  add column duplicate_review_state text not null default 'clear'
    check (duplicate_review_state in ('clear', 'exact_self', 'near')),
  add constraint user_finding_photos_sha256_check
    check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  add constraint user_finding_photos_phash_check
    check (perceptual_hash is null or perceptual_hash ~ '^[0-9a-f]{16}$');

create index user_finding_photos_sha256_idx
  on public.user_finding_photos (content_sha256)
  where content_sha256 is not null;

create index user_finding_photos_phash_idx
  on public.user_finding_photos (perceptual_hash)
  where perceptual_hash is not null;

alter table public.finding_profiles
  add column confirmed_abuse_count integer not null default 0 check (confirmed_abuse_count >= 0),
  add column publication_cooldown_until timestamptz;

create table public.finding_abuse_signals (
  id uuid primary key default extensions.gen_random_uuid(),
  finding_id uuid references public.user_findings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('near_duplicate', 'repeated_content', 'report_priority', 'rate_limit')),
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint finding_abuse_signals_resolution_check check (
    (status = 'open' and resolved_at is null) or
    (status <> 'open' and resolved_at is not null)
  )
);

create unique index finding_abuse_signals_open_finding_kind_idx
  on public.finding_abuse_signals (finding_id, kind)
  where finding_id is not null and status = 'open';

create index finding_abuse_signals_user_open_idx
  on public.finding_abuse_signals (user_id, created_at desc)
  where status = 'open';

create table public.abuse_rate_limit_buckets (
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  scope text not null check (scope ~ '^[a-z0-9:_-]{3,80}$'),
  window_start timestamptz not null,
  hit_count integer not null check (hit_count > 0),
  expires_at timestamptz not null,
  primary key (subject_hash, scope, window_start),
  constraint abuse_rate_limit_window_check check (expires_at > window_start)
);

create index abuse_rate_limit_expiry_idx on public.abuse_rate_limit_buckets (expires_at);

alter table public.finding_abuse_signals enable row level security;
alter table public.abuse_rate_limit_buckets enable row level security;
revoke all on table public.finding_abuse_signals from public, anon, authenticated;
revoke all on table public.abuse_rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on table public.finding_abuse_signals to service_role;
grant select, insert, update, delete on table public.abuse_rate_limit_buckets to service_role;

create or replace function public.consume_abuse_rate_limit(
  p_subject_hash text,
  p_scope text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket_start timestamptz;
  next_count integer;
begin
  if p_subject_hash !~ '^[0-9a-f]{64}$'
    or p_scope !~ '^[a-z0-9:_-]{3,80}$'
    or p_window_seconds not between 60 and 86400
    or p_limit not between 1 and 1000 then
    raise exception 'invalid rate limit parameters';
  end if;

  delete from public.abuse_rate_limit_buckets bucket
  where bucket.subject_hash = p_subject_hash
    and bucket.scope = p_scope
    and bucket.expires_at < now();

  bucket_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.abuse_rate_limit_buckets (
    subject_hash, scope, window_start, hit_count, expires_at
  ) values (
    p_subject_hash, p_scope, bucket_start, 1,
    bucket_start + make_interval(secs => p_window_seconds * 2)
  )
  on conflict (subject_hash, scope, window_start) do update
  set hit_count = public.abuse_rate_limit_buckets.hit_count + 1
  returning hit_count into next_count;

  return next_count <= p_limit;
end;
$$;

create or replace function public.requires_finding_turnstile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not exists (
      select 1 from public.user_findings finding
      where finding.owner_id = p_user_id
        and finding.visibility = 'public'
        and finding.publication_state = 'published'
    )
    or exists (
      select 1 from public.finding_abuse_signals signal
      where signal.user_id = p_user_id and signal.status = 'open'
    )
    or exists (
      select 1 from public.finding_profiles profile
      where profile.user_id = p_user_id
        and (
          profile.confirmed_abuse_count > 0
          or profile.publication_cooldown_until > now()
        )
    )
    or 3 <= (
      select count(*) from public.user_findings finding
      where finding.owner_id = p_user_id
        and finding.visibility = 'public'
        and finding.publication_state = 'published'
        and finding.updated_at >= now() - interval '24 hours'
    );
$$;

create or replace function public.inspect_finding_photo_fingerprint(
  p_owner_id uuid,
  p_content_sha256 text
)
returns table (exact_other boolean, exact_self boolean, perceptual_hashes text[])
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(bool_or(finding.owner_id is distinct from p_owner_id), false) as exact_other,
    coalesce(bool_or(finding.owner_id = p_owner_id), false) as exact_self,
    coalesce((
      select array_agg(recent.perceptual_hash)
      from (
        select photo.perceptual_hash
        from public.user_finding_photos photo
        join public.user_findings owner_finding on owner_finding.id = photo.finding_id
        where photo.perceptual_hash is not null
          and owner_finding.publication_state <> 'hidden'
        order by photo.created_at desc
        limit 5000
      ) recent
    ), array[]::text[]) as perceptual_hashes
  from public.user_finding_photos photo
  join public.user_findings finding on finding.id = photo.finding_id
  where photo.content_sha256 = p_content_sha256;
$$;

create or replace function public.validate_user_finding_photo_fingerprint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  incoming_owner uuid;
  duplicate_owner uuid;
begin
  if new.content_sha256 is null then return new; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.content_sha256, 0)
  );

  select finding.owner_id into incoming_owner
  from public.user_findings finding
  where finding.id = new.finding_id;

  select finding.owner_id into duplicate_owner
  from public.user_finding_photos photo
  join public.user_findings finding on finding.id = photo.finding_id
  where photo.content_sha256 = new.content_sha256
    and photo.id <> new.id
  limit 1;

  if duplicate_owner is not null and duplicate_owner is distinct from incoming_owner then
    raise exception 'This image was already published by another account';
  end if;
  if duplicate_owner = incoming_owner then
    new.duplicate_review_state := 'exact_self';
  end if;
  return new;
end;
$$;

create trigger validate_user_finding_photo_fingerprint
before insert or update of content_sha256 on public.user_finding_photos
for each row execute function public.validate_user_finding_photo_fingerprint();

create or replace function public.publish_user_finding(
  p_finding_id uuid,
  p_owner_id uuid
)
returns void
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
end;
$$;

create or replace function public.recompute_finding_map_access(p_user_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest_end timestamptz;
  latest_finding uuid;
begin
  select grant_row.ends_at, grant_row.finding_id
    into latest_end, latest_finding
  from public.finding_access_grants grant_row
  where grant_row.user_id = p_user_id
    and grant_row.revoked_at is null
    and grant_row.ends_at > now()
  order by grant_row.ends_at desc
  limit 1;

  update public.contributor_access access
  set one_km_active_until = latest_end,
      last_finding_id = latest_finding,
      updated_at = now()
  where access.user_id = p_user_id;
  return latest_end;
end;
$$;

create or replace function public.revoke_finding_map_access(
  p_finding_id uuid,
  p_actor_id uuid,
  p_reason text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  grant_owner uuid;
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 3 or char_length(p_reason) > 1000 then
    raise exception 'a revocation reason is required';
  end if;

  select grant_row.user_id into grant_owner
  from public.finding_access_grants grant_row
  where grant_row.finding_id = p_finding_id
  for update;
  if grant_owner is null then return null; end if;

  if p_actor_id is distinct from grant_owner and not exists (
    select 1 from public.finding_moderators moderator where moderator.user_id = p_actor_id
  ) and not exists (
    select 1 from auth.users account
    where account.id = p_actor_id
      and account.raw_app_meta_data ->> 'app_role' = 'admin'
  ) then
    raise exception 'not authorized to revoke this finding grant';
  end if;

  update public.finding_access_grants grant_row
  set revoked_at = now(), revoked_by = p_actor_id, revoke_reason = btrim(p_reason)
  where grant_row.finding_id = p_finding_id
    and grant_row.revoked_at is null;

  return public.recompute_finding_map_access(grant_owner);
end;
$$;

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

create or replace function public.update_owner_finding_privacy(
  p_finding_id uuid,
  p_owner_id uuid,
  p_visibility text,
  p_show_alias boolean
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.user_findings finding
  where finding.id = p_finding_id and finding.owner_id = p_owner_id
  for update;
  if not found then raise exception 'Finding not found'; end if;
  if p_visibility is not null and p_visibility not in ('private', 'public') then
    raise exception 'Invalid finding visibility';
  end if;

  update public.user_findings finding
  set visibility = coalesce(p_visibility, finding.visibility),
      show_alias = coalesce(p_show_alias, finding.show_alias),
      updated_at = now()
  where finding.id = p_finding_id;

  if p_visibility = 'private' then
    return public.revoke_finding_map_access(p_finding_id, p_owner_id, 'Finding made private');
  elsif p_visibility = 'public' then
    return public.grant_finding_map_access(p_finding_id, p_owner_id);
  end if;
  return null;
end;
$$;

create or replace function public.remove_owner_finding(
  p_finding_id uuid,
  p_owner_id uuid
)
returns table (storage_paths text[], removal_mode text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_finding public.user_findings%rowtype;
  removed_paths text[];
  resolved_mode text;
begin
  select finding.* into target_finding from public.user_findings finding
  where finding.id = p_finding_id and finding.owner_id = p_owner_id for update;
  if not found then raise exception 'Finding not found'; end if;

  select coalesce(array_agg(photo.storage_path order by photo.position), array[]::text[])
  into removed_paths from public.user_finding_photos photo
  where photo.finding_id = p_finding_id;

  perform public.revoke_finding_map_access(p_finding_id, p_owner_id, 'Finding withdrawn');

  if target_finding.visibility = 'public' and target_finding.publication_state = 'published' then
    update public.user_findings finding set publication_state = 'hidden', updated_at = now()
    where finding.id = p_finding_id;
    delete from public.user_finding_private_details detail where detail.finding_id = p_finding_id;
    delete from public.user_finding_photos photo where photo.finding_id = p_finding_id;
    resolved_mode := 'withdrawn';
  else
    delete from public.user_findings finding where finding.id = p_finding_id;
    resolved_mode := 'deleted';
  end if;
  return query select removed_paths, resolved_mode;
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

create trigger prioritize_independent_finding_flags
after insert or update of status on public.user_finding_flags
for each row execute function public.prioritize_independent_finding_flags();

create or replace function public.revoke_ineligible_finding_grant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_finding uuid;
  target_owner uuid;
begin
  target_finding := coalesce(new.id, old.id);
  target_owner := coalesce(new.owner_id, old.owner_id);
  if target_owner is not null and (
    coalesce(new.visibility, old.visibility) <> 'public'
    or coalesce(new.publication_state, old.publication_state) <> 'published'
  ) then
    perform public.revoke_finding_map_access(target_finding, target_owner, 'Finding is no longer public');
  end if;
  return new;
end;
$$;

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

create trigger revoke_grant_without_public_photo
after delete or update of is_public, duplicate_review_state on public.user_finding_photos
for each row execute function public.revoke_grant_without_public_photo();

create or replace function public.moderate_user_finding(
  p_flag_id uuid,
  p_action text,
  p_moderator_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_flag public.user_finding_flags%rowtype;
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

  select flag.* into target_flag from public.user_finding_flags flag
  where flag.id = p_flag_id and flag.status = 'open' for update;
  if not found then return false; end if;

  if p_action = 'dismiss' then
    update public.user_finding_flags flag set status = 'dismissed', resolved_at = now()
    where flag.id = p_flag_id;
    return true;
  end if;

  select finding.owner_id into target_owner from public.user_findings finding
  where finding.id = target_flag.finding_id for update;
  update public.user_findings finding set publication_state = 'hidden', updated_at = now()
  where finding.id = target_flag.finding_id;
  perform public.revoke_finding_map_access(target_flag.finding_id, p_moderator_id, 'Finding hidden by moderation');

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
  where flag.finding_id = target_flag.finding_id and flag.status = 'open';
  update public.finding_abuse_signals signal set status = 'resolved', resolved_at = now()
  where signal.finding_id = target_flag.finding_id and signal.status = 'open';
  return true;
end;
$$;

revoke all on function public.consume_abuse_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.requires_finding_turnstile(uuid) from public, anon, authenticated;
revoke all on function public.inspect_finding_photo_fingerprint(uuid, text) from public, anon, authenticated;
revoke all on function public.publish_user_finding(uuid, uuid) from public, anon, authenticated;
revoke all on function public.recompute_finding_map_access(uuid) from public, anon, authenticated;
revoke all on function public.revoke_finding_map_access(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.grant_finding_map_access(uuid, uuid) from public, anon, authenticated;
revoke all on function public.update_owner_finding_privacy(uuid, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.remove_owner_finding(uuid, uuid) from public, anon, authenticated;
revoke all on function public.moderate_user_finding(uuid, text, uuid) from public, anon, authenticated;

grant execute on function public.consume_abuse_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.requires_finding_turnstile(uuid) to service_role;
grant execute on function public.inspect_finding_photo_fingerprint(uuid, text) to service_role;
grant execute on function public.publish_user_finding(uuid, uuid) to service_role;
grant execute on function public.recompute_finding_map_access(uuid) to service_role;
grant execute on function public.revoke_finding_map_access(uuid, uuid, text) to service_role;
grant execute on function public.grant_finding_map_access(uuid, uuid) to service_role;
grant execute on function public.update_owner_finding_privacy(uuid, uuid, text, boolean) to service_role;
grant execute on function public.remove_owner_finding(uuid, uuid) to service_role;
grant execute on function public.moderate_user_finding(uuid, text, uuid) to service_role;

comment on table public.finding_abuse_signals is
  'Server-only moderation priority signals. Signals never auto-hide findings or grant access.';
comment on table public.abuse_rate_limit_buckets is
  'Short-lived server-only counters keyed by HMAC hashes; raw network addresses are never stored.';
