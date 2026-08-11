create table if not exists public.environment_snapshots (
  id uuid primary key default gen_random_uuid(),
  region_id text not null check (region_id in (
    'pirineus', 'prepirineus', 'catalunya-central', 'serralades-costeres',
    'serralades-prelitorals', 'emporda', 'montseny', 'ports',
    'muntanyes-interiors', 'altres'
  )),
  observed_at timestamptz not null,
  sources text[] not null default '{}',
  confidence text not null check (confidence in ('high', 'moderate', 'limited', 'unknown')),
  stale boolean not null default false,
  unavailable_fields text[] not null default '{}',
  values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (region_id, observed_at)
);

create index if not exists environment_snapshots_region_observed_idx
  on public.environment_snapshots (region_id, observed_at desc);

alter table public.environment_snapshots enable row level security;

revoke all on table public.environment_snapshots from anon, authenticated;
grant select, insert, update, delete on table public.environment_snapshots to service_role;
