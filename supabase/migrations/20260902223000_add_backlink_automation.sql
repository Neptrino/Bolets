create table public.backlink_automation_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  auto_send boolean not null default true,
  daily_send_limit smallint not null default 5 check (daily_send_limit between 1 and 25),
  minimum_score smallint not null default 82 check (minimum_score between 60 and 100),
  domain_cooldown_days smallint not null default 90 check (domain_cooldown_days between 30 and 365),
  follow_up_delay_days smallint not null default 14 check (follow_up_delay_days between 7 and 30),
  campaign_cursor integer not null default 0 check (campaign_cursor >= 0),
  lease_token uuid,
  lease_until timestamptz not null default to_timestamp(0),
  last_run_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.backlink_automation_settings (singleton) values (true);

create table public.backlink_prospects (
  id uuid primary key default extensions.gen_random_uuid(),
  campaign_id text not null check (char_length(campaign_id) between 2 and 80),
  search_query text not null check (char_length(search_query) between 2 and 400),
  page_url text not null unique check (char_length(page_url) between 8 and 2048),
  domain text not null check (char_length(domain) between 3 and 255),
  page_title text not null check (char_length(page_title) between 1 and 500),
  snippet text not null default '' check (char_length(snippet) <= 2000),
  organization text not null check (char_length(organization) between 1 and 300),
  contact_email text check (contact_email is null or char_length(contact_email) <= 254),
  contact_source_url text check (contact_source_url is null or char_length(contact_source_url) <= 2048),
  target_url text not null check (char_length(target_url) between 8 and 2048),
  target_title text not null check (char_length(target_title) between 1 and 300),
  score smallint not null default 0 check (score between 0 and 100),
  status text not null default 'discovered' check (
    status in ('discovered', 'ready', 'sent', 'linked', 'lost', 'suppressed', 'failed')
  ),
  status_reason text check (status_reason is null or char_length(status_reason) <= 500),
  existing_link boolean not null default false,
  link_rel text check (link_rel is null or char_length(link_rel) <= 200),
  link_anchor text check (link_anchor is null or char_length(link_anchor) <= 500),
  send_count smallint not null default 0 check (send_count between 0 and 2),
  next_action_at timestamptz,
  first_sent_at timestamptz,
  last_sent_at timestamptz,
  linked_at timestamptz,
  lost_at timestamptz,
  last_checked_at timestamptz,
  discovered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index backlink_prospects_action_idx
  on public.backlink_prospects (status, next_action_at, score desc);
create index backlink_prospects_domain_idx
  on public.backlink_prospects (domain, last_sent_at desc);

create table public.backlink_outbox (
  id uuid primary key default extensions.gen_random_uuid(),
  prospect_id uuid not null references public.backlink_prospects(id) on delete cascade,
  message_kind text not null check (message_kind in ('initial', 'follow_up')),
  recipient text not null check (char_length(recipient) between 3 and 254),
  subject text not null check (char_length(subject) between 1 and 300),
  body_text text not null check (char_length(body_text) between 20 and 8000),
  dedupe_key text not null unique check (char_length(dedupe_key) between 8 and 220),
  deliver_after timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 5),
  provider_message_id text check (provider_message_id is null or char_length(provider_message_id) <= 300),
  last_error text check (last_error is null or char_length(last_error) <= 500),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prospect_id, message_kind)
);

create index backlink_outbox_pending_idx
  on public.backlink_outbox (deliver_after, created_at)
  where status = 'pending';

create table public.backlink_suppressions (
  id uuid primary key default extensions.gen_random_uuid(),
  kind text not null check (kind in ('email', 'domain')),
  value text not null check (char_length(value) between 3 and 255),
  reason text not null default 'opt_out' check (char_length(reason) between 2 and 100),
  created_at timestamptz not null default now(),
  unique (kind, value)
);

create table public.backlink_automation_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  status text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'failed', 'disabled')),
  discovered_count integer not null default 0 check (discovered_count >= 0),
  inspected_count integer not null default 0 check (inspected_count >= 0),
  queued_count integer not null default 0 check (queued_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  linked_count integer not null default 0 check (linked_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  detail text check (detail is null or char_length(detail) <= 1000),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index backlink_automation_runs_started_idx
  on public.backlink_automation_runs (started_at desc);

alter table public.backlink_automation_settings enable row level security;
alter table public.backlink_prospects enable row level security;
alter table public.backlink_outbox enable row level security;
alter table public.backlink_suppressions enable row level security;
alter table public.backlink_automation_runs enable row level security;

revoke all on table public.backlink_automation_settings from public, anon, authenticated;
revoke all on table public.backlink_prospects from public, anon, authenticated;
revoke all on table public.backlink_outbox from public, anon, authenticated;
revoke all on table public.backlink_suppressions from public, anon, authenticated;
revoke all on table public.backlink_automation_runs from public, anon, authenticated;

grant select, insert, update, delete on table public.backlink_automation_settings to service_role;
grant select, insert, update, delete on table public.backlink_prospects to service_role;
grant select, insert, update, delete on table public.backlink_outbox to service_role;
grant select, insert, update, delete on table public.backlink_suppressions to service_role;
grant select, insert, update, delete on table public.backlink_automation_runs to service_role;

comment on table public.backlink_automation_settings is
  'Private fail-closed controls for low-volume editorial backlink outreach.';
comment on table public.backlink_prospects is
  'Private public-web backlink opportunities; never exposed through anon or authenticated APIs.';
comment on table public.backlink_outbox is
  'Idempotent, rate-limited Resend delivery queue for backlink outreach.';
comment on table public.backlink_suppressions is
  'Permanent email and domain opt-outs checked before every outreach attempt.';
