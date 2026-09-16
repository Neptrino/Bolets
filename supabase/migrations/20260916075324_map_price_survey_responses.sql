-- First-party survey receipts. No account, IP address or browser fingerprint.
create table public.map_price_survey_responses (
  id uuid not null default gen_random_uuid() unique,
  survey_version text not null check (survey_version = 'map-price-v8'),
  respondent_hash text not null check (respondent_hash ~ '^[0-9a-f]{64}$'),
  answer text not null check (answer in ('299', '499', '999', 'contribute', 'no')),
  created_at timestamptz not null default now(),
  primary key (survey_version, respondent_hash)
);

create index map_price_survey_responses_admin_idx
  on public.map_price_survey_responses (survey_version, created_at desc, id desc);

alter table public.map_price_survey_responses enable row level security;
revoke all on public.map_price_survey_responses from public, anon, authenticated, service_role;
grant select, insert on public.map_price_survey_responses to service_role;
comment on table public.map_price_survey_responses is
  'Private annual-price survey receipts. One immutable answer per survey and random browser identity; server-only access.';
