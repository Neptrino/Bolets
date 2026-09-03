-- Administrators may grant temporary resolution-scoped map access without
-- fabricating a contribution request. Every grant remains service-role-only,
-- records its operator and reason, and participates in the existing global
-- revocation path.

create table public.manual_map_access_grants (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_level text not null check (access_level in ('finding', 'contributor')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  grant_reason text not null check (
    grant_reason = btrim(grant_reason)
    and char_length(grant_reason) between 3 and 1000
  ),
  granted_by uuid not null references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text check (revoke_reason is null or char_length(revoke_reason) <= 1000),
  created_at timestamptz not null default now(),
  constraint manual_map_access_grant_window_check check (ends_at > starts_at),
  constraint manual_map_access_grant_revocation_check check (
    (revoked_at is null and revoked_by is null and revoke_reason is null)
    or (revoked_at is not null and revoked_by is not null)
  )
);

create index manual_map_access_grants_user_idx
  on public.manual_map_access_grants (user_id, ends_at desc);

alter table public.manual_map_access_grants enable row level security;
revoke all on table public.manual_map_access_grants from public, anon, authenticated;
grant select, insert, update, delete on table public.manual_map_access_grants to service_role;

create function public.grant_manual_map_access(
  p_user_id uuid,
  p_access_level text,
  p_duration_days integer,
  p_reason text,
  p_reviewer_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  access_row public.contributor_access%rowtype;
  grant_start timestamptz;
  grant_end timestamptz;
begin
  if p_access_level not in ('finding', 'contributor') then
    raise exception 'invalid map access level';
  end if;
  if p_duration_days not between 1 and 365 then
    raise exception 'invalid map access duration';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 or char_length(p_reason) > 1000 then
    raise exception 'a grant reason is required';
  end if;
  if not exists (
    select 1 from auth.users reviewer
    where reviewer.id = p_reviewer_id
      and reviewer.raw_app_meta_data ->> 'app_role' = 'admin'
  ) then
    raise exception 'administrator role required';
  end if;
  if not exists (select 1 from auth.users account where account.id = p_user_id) then
    raise exception 'target account not found';
  end if;
  if exists (
    select 1 from auth.users account
    where account.id = p_user_id
      and account.raw_app_meta_data ->> 'app_role' = 'admin'
  ) then
    raise exception 'administrator access does not expire';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  select * into access_row
  from public.contributor_access access
  where access.user_id = p_user_id
  for update;

  grant_start := case
    when not found or access_row.revoked_at is not null then now()
    when p_access_level = 'contributor' then greatest(
      now(),
      coalesce(access_row.active_until, '-infinity'::timestamptz)
    )
    else greatest(
      now(),
      coalesce(access_row.active_until, '-infinity'::timestamptz),
      coalesce(access_row.one_km_active_until, '-infinity'::timestamptz)
    )
  end;
  grant_end := grant_start + pg_catalog.make_interval(days => p_duration_days);

  insert into public.manual_map_access_grants (
    user_id, access_level, starts_at, ends_at, grant_reason, granted_by
  ) values (
    p_user_id, p_access_level, grant_start, grant_end, btrim(p_reason), p_reviewer_id
  );

  if p_access_level = 'contributor' then
    insert into public.contributor_access (
      user_id, active_until, one_km_active_until, updated_by
    ) values (
      p_user_id, grant_end, grant_end, p_reviewer_id
    )
    on conflict (user_id) do update set
      active_until = excluded.active_until,
      one_km_active_until = greatest(
        coalesce(public.contributor_access.one_km_active_until, '-infinity'::timestamptz),
        excluded.one_km_active_until
      ),
      updated_by = excluded.updated_by,
      revoked_at = null,
      revoke_reason = null,
      updated_at = now();
  else
    insert into public.contributor_access (
      user_id, one_km_active_until, updated_by
    ) values (
      p_user_id, grant_end, p_reviewer_id
    )
    on conflict (user_id) do update set
      one_km_active_until = excluded.one_km_active_until,
      updated_by = excluded.updated_by,
      revoked_at = null,
      revoke_reason = null,
      updated_at = now();
  end if;

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
    select 1 from auth.users reviewer
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

  update public.manual_map_access_grants
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

revoke all on function public.grant_manual_map_access(uuid, text, integer, text, uuid)
  from public, anon, authenticated;
grant execute on function public.grant_manual_map_access(uuid, text, integer, text, uuid)
  to service_role;

comment on table public.manual_map_access_grants is
  'Immutable audit trail for administrator-issued temporary 1 km or full-detail map access.';
