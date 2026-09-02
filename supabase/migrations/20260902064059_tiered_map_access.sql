-- Resolution-scoped detailed-map access:
--   * a qualifying public finding opens 1 km for seven days;
--   * a reviewed contribution opens 1 km and 250 m for thirty days.
-- Existing contributor_access.active_until values remain valid as full-detail
-- grants, so this migration does not shorten previously approved access.

alter table public.contributor_access
  alter column active_until drop not null,
  add column one_km_active_until timestamptz,
  add column last_finding_id uuid references public.user_findings(id) on delete set null;

create index contributor_access_one_km_active_idx
  on public.contributor_access (one_km_active_until desc)
  where revoked_at is null;

create table public.finding_access_grants (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  finding_id uuid unique references public.user_findings(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text check (revoke_reason is null or char_length(revoke_reason) <= 1000),
  created_at timestamptz not null default now(),
  constraint finding_access_grant_window_check check (ends_at > starts_at),
  constraint finding_access_grant_revocation_check check (
    (revoked_at is null and revoked_by is null and revoke_reason is null)
    or (revoked_at is not null and revoked_by is not null)
  )
);

create index finding_access_grants_user_idx
  on public.finding_access_grants (user_id, created_at desc);

alter table public.finding_access_grants enable row level security;
revoke all on table public.finding_access_grants from public, anon, authenticated;
grant select, insert, update, delete on table public.finding_access_grants to service_role;

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
    select 1
    from public.user_findings finding
    where finding.id = p_finding_id
      and finding.owner_id = p_user_id
      and finding.visibility = 'public'
      and finding.publication_state = 'published'
      and exists (
        select 1
        from public.user_finding_photos photo
        where photo.finding_id = finding.id
          and photo.is_public
      )
  ) then
    return null;
  end if;

  -- Serialize grants for one account so the rolling limit and stacked window
  -- remain correct when publication and privacy changes race.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  select grant_row.ends_at into existing_end
  from public.finding_access_grants grant_row
  where grant_row.finding_id = p_finding_id;
  if found then return existing_end; end if;

  if exists (
    select 1
    from public.finding_access_grants grant_row
    where grant_row.user_id = p_user_id
      and grant_row.created_at > now() - interval '30 days'
  ) then
    return null;
  end if;

  select * into access_row
  from public.contributor_access access
  where access.user_id = p_user_id
  for update;

  -- An administrative revocation requires a later reviewed approval; an
  -- automatic finding grant must not silently undo it.
  if found and access_row.revoked_at is not null then return null; end if;

  grant_start := greatest(
    now(),
    coalesce(access_row.active_until, '-infinity'::timestamptz),
    coalesce(access_row.one_km_active_until, '-infinity'::timestamptz)
  );
  grant_end := grant_start + interval '7 days';

  insert into public.finding_access_grants (
    user_id, finding_id, starts_at, ends_at
  ) values (
    p_user_id, p_finding_id, grant_start, grant_end
  );

  insert into public.contributor_access (
    user_id, one_km_active_until, last_finding_id
  ) values (
    p_user_id, grant_end, p_finding_id
  )
  on conflict (user_id) do update set
    one_km_active_until = excluded.one_km_active_until,
    last_finding_id = excluded.last_finding_id,
    updated_at = now();

  return grant_end;
end;
$$;

create or replace function public.review_contribution_request(
  p_request_id uuid,
  p_decision text,
  p_review_note text,
  p_reviewer_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.contribution_requests%rowtype;
  access_row public.contributor_access%rowtype;
  had_active_access boolean := false;
  grant_start timestamptz;
  grant_end timestamptz;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid contribution decision';
  end if;
  if p_review_note is not null and char_length(p_review_note) > 1000 then
    raise exception 'review note is too long';
  end if;
  if not exists (
    select 1
    from auth.users reviewer
    where reviewer.id = p_reviewer_id
      and reviewer.raw_app_meta_data ->> 'app_role' = 'admin'
  ) then
    raise exception 'administrator role required';
  end if;

  select * into request_row
  from public.contribution_requests request
  where request.id = p_request_id
  for update;
  if not found then raise exception 'contribution request not found'; end if;
  if request_row.status <> 'pending' then
    raise exception 'contribution request was already reviewed';
  end if;

  update public.contribution_requests
  set
    status = p_decision,
    review_note = nullif(btrim(p_review_note), ''),
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  if p_decision = 'rejected' then
    insert into public.contribution_email_outbox (
      user_id, request_id, event, dedupe_key, payload
    ) values (
      request_row.user_id,
      p_request_id,
      'rejected',
      'contribution-rejected:' || p_request_id::text,
      jsonb_build_object('reviewNote', nullif(btrim(p_review_note), ''))
    );
    return null;
  end if;

  select * into access_row
  from public.contributor_access access
  where access.user_id = request_row.user_id
  for update;

  had_active_access := found
    and access_row.revoked_at is null
    and access_row.active_until is not null
    and access_row.active_until > now();

  grant_start := case
    when had_active_access then access_row.active_until
    else now()
  end;
  grant_end := grant_start + interval '30 days';

  insert into public.contributor_access_grants (
    user_id, request_id, granted_by, starts_at, ends_at
  ) values (
    request_row.user_id, p_request_id, p_reviewer_id, grant_start, grant_end
  );

  insert into public.contributor_access (
    user_id, active_until, last_request_id, updated_by
  ) values (
    request_row.user_id, grant_end, p_request_id, p_reviewer_id
  )
  on conflict (user_id) do update set
    active_until = excluded.active_until,
    last_request_id = excluded.last_request_id,
    updated_by = excluded.updated_by,
    revoked_at = null,
    revoke_reason = null,
    updated_at = now();

  insert into public.contribution_email_outbox (
    user_id, request_id, event, dedupe_key, payload
  ) values (
    request_row.user_id,
    p_request_id,
    'approved',
    'contribution-approved:' || p_request_id::text,
    jsonb_build_object(
      'activeUntil', grant_end,
      'reviewNote', nullif(btrim(p_review_note), '')
    )
  );

  return grant_end;
end;
$$;

create or replace function public.revoke_contributor_access(
  p_user_id uuid,
  p_reason text,
  p_reviewer_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 3 or char_length(p_reason) > 1000 then
    raise exception 'a revocation reason is required';
  end if;
  if not exists (
    select 1
    from auth.users reviewer
    where reviewer.id = p_reviewer_id
      and reviewer.raw_app_meta_data ->> 'app_role' = 'admin'
  ) then
    raise exception 'administrator role required';
  end if;

  update public.contributor_access
  set
    revoked_at = now(),
    revoke_reason = btrim(p_reason),
    updated_by = p_reviewer_id,
    updated_at = now()
  where user_id = p_user_id and revoked_at is null;
  if not found then return false; end if;

  update public.contributor_access_grants
  set
    revoked_at = now(),
    revoked_by = p_reviewer_id,
    revoke_reason = btrim(p_reason)
  where user_id = p_user_id and revoked_at is null and ends_at > now();

  update public.finding_access_grants
  set
    revoked_at = now(),
    revoked_by = p_reviewer_id,
    revoke_reason = btrim(p_reason)
  where user_id = p_user_id and revoked_at is null and ends_at > now();

  insert into public.contribution_email_outbox (
    user_id, event, dedupe_key, payload
  ) values (
    p_user_id,
    'revoked',
    'contribution-revoked:' || p_user_id::text || ':' || extensions.gen_random_uuid()::text,
    jsonb_build_object('reason', btrim(p_reason))
  );
  return true;
end;
$$;

revoke all on function public.grant_finding_map_access(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.review_contribution_request(uuid, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.revoke_contributor_access(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.grant_finding_map_access(uuid, uuid)
  to service_role;
grant execute on function public.review_contribution_request(uuid, text, text, uuid)
  to service_role;
grant execute on function public.revoke_contributor_access(uuid, text, uuid)
  to service_role;

comment on table public.contributor_access is
  'Current resolution-scoped map access. active_until opens 250 m; one_km_active_until opens 1 km.';
comment on table public.contributor_access_grants is
  'Immutable audit trail for reviewed thirty-day full-detail grants.';
comment on table public.finding_access_grants is
  'Immutable audit trail for rate-limited seven-day 1 km grants from public findings with photos.';
