-- Contribution requests and detailed-map grants remain service-role-only.
-- Users submit through authenticated same-origin routes; administrators review
-- through the signed Supabase application session and app_metadata role.

create table public.contribution_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'useful_finding',
    'catalogue_correction',
    'reusable_media'
  )),
  description text not null check (
    description = btrim(description)
    and char_length(description) between 20 and 1000
  ),
  evidence_url text check (
    evidence_url is null
    or (
      char_length(evidence_url) <= 500
      and evidence_url ~ '^https://'
    )
  ),
  finding_id uuid references public.user_findings(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contribution_request_review_state_check check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status = 'withdrawn' and reviewed_at is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
  )
);

create unique index contribution_requests_one_pending_per_user_idx
  on public.contribution_requests (user_id)
  where status = 'pending';

create index contribution_requests_review_queue_idx
  on public.contribution_requests (status, created_at desc);

create index contribution_requests_user_history_idx
  on public.contribution_requests (user_id, created_at desc);

create table public.contributor_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_until timestamptz not null,
  last_request_id uuid references public.contribution_requests(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoke_reason text check (revoke_reason is null or char_length(revoke_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contributor_access_revocation_check check (
    (revoked_at is null and revoke_reason is null)
    or revoked_at is not null
  )
);

create index contributor_access_active_idx
  on public.contributor_access (active_until desc)
  where revoked_at is null;

create table public.contributor_access_grants (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null unique references public.contribution_requests(id) on delete restrict,
  granted_by uuid references auth.users(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text check (revoke_reason is null or char_length(revoke_reason) <= 1000),
  created_at timestamptz not null default now(),
  constraint contributor_access_grant_window_check check (ends_at > starts_at),
  constraint contributor_access_grant_revocation_check check (
    (revoked_at is null and revoked_by is null and revoke_reason is null)
    or (revoked_at is not null and revoked_by is not null)
  )
);

create index contributor_access_grants_user_idx
  on public.contributor_access_grants (user_id, ends_at desc);

create table public.contribution_email_outbox (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.contribution_requests(id) on delete set null,
  event text not null check (event in ('approved', 'rejected', 'revoked', 'expiry_reminder')),
  dedupe_key text not null unique check (char_length(dedupe_key) between 8 and 220),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  deliver_after timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 10),
  last_error text check (last_error is null or char_length(last_error) <= 500),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contribution_email_outbox_pending_idx
  on public.contribution_email_outbox (deliver_after, created_at)
  where status = 'pending';

alter table public.contribution_requests enable row level security;
alter table public.contributor_access enable row level security;
alter table public.contributor_access_grants enable row level security;
alter table public.contribution_email_outbox enable row level security;

revoke all on table public.contribution_requests from public, anon, authenticated;
revoke all on table public.contributor_access from public, anon, authenticated;
revoke all on table public.contributor_access_grants from public, anon, authenticated;
revoke all on table public.contribution_email_outbox from public, anon, authenticated;

grant select, insert, update, delete on table public.contribution_requests to service_role;
grant select, insert, update, delete on table public.contributor_access to service_role;
grant select, insert, update, delete on table public.contributor_access_grants to service_role;
grant select, insert, update, delete on table public.contribution_email_outbox to service_role;

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
    and access_row.active_until > now();

  grant_start := case
    when had_active_access
      then access_row.active_until
    else now()
  end;
  grant_end := grant_start + interval '90 days';

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

revoke all on function public.review_contribution_request(uuid, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.revoke_contributor_access(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.review_contribution_request(uuid, text, text, uuid)
  to service_role;
grant execute on function public.revoke_contributor_access(uuid, text, uuid)
  to service_role;

comment on table public.contribution_requests is
  'Staff-reviewed, non-financial contributions. Identification-validation votes are intentionally excluded.';
comment on table public.contributor_access is
  'Current 90-day detailed-map access state, authoritative for issuing short-lived map capabilities.';
comment on table public.contributor_access_grants is
  'Immutable approval audit trail; a later revocation is recorded rather than deleting the grant.';
comment on table public.contribution_email_outbox is
  'Idempotent transactional notification queue for contribution decisions and access expiry.';
