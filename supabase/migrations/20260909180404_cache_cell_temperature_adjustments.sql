-- Lazy, species-independent derived values. Exact source/control hashes select
-- fresh entries automatically after publication; no provider reads or raw series.
create table public.cell_temperature_cache (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  values jsonb not null check (jsonb_typeof(values) = 'object'),
  created_at timestamptz not null default now()
);
alter table public.cell_temperature_cache enable row level security;
revoke all on public.cell_temperature_cache from public, anon, authenticated;
grant select, insert, update, delete on public.cell_temperature_cache to service_role;
create index cell_temperature_cache_retention on public.cell_temperature_cache(created_at);
comment on table public.cell_temperature_cache is
  'Private optional thermal patches keyed by exact frozen sources, cell coordinates/elevation, control fields and algorithm version; never full environmental snapshots.';
select cron.schedule('prune-cell-temperature-cache', '41 3 * * *', $schedule$
  delete from public.cell_temperature_cache where created_at < now() - interval '7 days';
$schedule$);
