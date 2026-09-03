alter table public.backlink_prospects
  add column manual_decision text
    check (manual_decision is null or manual_decision in ('approved', 'excluded')),
  add column manual_note text
    check (manual_note is null or char_length(manual_note) between 3 and 500),
  add column manual_decided_at timestamptz,
  add column manual_decided_by uuid references auth.users(id) on delete set null;

create table public.backlink_prospect_actions (
  id uuid primary key default extensions.gen_random_uuid(),
  prospect_id uuid not null references public.backlink_prospects(id) on delete cascade,
  action text not null check (
    action in ('manual_approve', 'manual_exclude', 'restore_automatic', 'contact_update')
  ),
  note text not null check (char_length(note) between 3 and 500),
  previous_status text not null check (
    previous_status in ('discovered', 'ready', 'sent', 'linked', 'lost', 'suppressed', 'failed')
  ),
  next_status text not null check (
    next_status in ('discovered', 'ready', 'sent', 'linked', 'lost', 'suppressed', 'failed')
  ),
  previous_contact_email text
    check (previous_contact_email is null or char_length(previous_contact_email) <= 254),
  next_contact_email text
    check (next_contact_email is null or char_length(next_contact_email) <= 254),
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index backlink_prospect_actions_prospect_idx
  on public.backlink_prospect_actions (prospect_id, created_at desc);

alter table public.backlink_prospect_actions enable row level security;
revoke all on table public.backlink_prospect_actions from public, anon, authenticated;
grant select, insert on table public.backlink_prospect_actions to service_role;

comment on column public.backlink_prospects.manual_decision is
  'Administrator override of the numeric eligibility decision; hard safety gates remain mandatory.';
comment on table public.backlink_prospect_actions is
  'Private immutable-style audit trail for administrator decisions and pre-send contact corrections.';
