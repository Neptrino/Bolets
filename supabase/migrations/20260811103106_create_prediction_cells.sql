create table if not exists public.prediction_cells (
  id uuid primary key default gen_random_uuid(),
  species_id text not null,
  cell_id text not null,
  observed_at timestamptz not null,
  grid_size_m integer not null check (grid_size_m >= 250),
  cell_bounds jsonb not null,
  score integer check (score between 0 and 100),
  label text check (label in ('molt favorable', 'favorable', 'mixta', 'poc favorable', 'sense dades')),
  factors jsonb not null default '{}'::jsonb,
  sources text[] not null default '{}',
  source_resolution_m integer not null check (source_resolution_m > 0),
  confidence text not null check (confidence in ('high', 'moderate', 'limited', 'unknown')),
  stale boolean not null default false,
  created_at timestamptz not null default now(),
  unique (species_id, cell_id, observed_at)
);

create index if not exists prediction_cells_species_observed_idx
  on public.prediction_cells (species_id, observed_at desc);

alter table public.prediction_cells enable row level security;

revoke all on table public.prediction_cells from anon, authenticated;
grant select, insert, update, delete on table public.prediction_cells to service_role;

comment on table public.prediction_cells is
  'Server-only 250 m prediction cells. Bounds represent model cells, never observation locations.';
