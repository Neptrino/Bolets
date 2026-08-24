-- Keep the exact 30-day provider history server-side so the daily observed
-- refresh only downloads a short overlap. One bounded JSONB row per provider
-- point is materially smaller than storing millions of relational hourly rows
-- and still preserves gap detection and provider revisions.

create table public.open_meteo_hourly_states (
  stream text not null check (stream in ('arome-atmosphere', 'seamless-precipitation')),
  point_id text not null references public.weather_grid_points(point_id) on delete cascade,
  first_hour timestamptz not null,
  last_hour timestamptz not null,
  hour_count smallint not null check (hour_count = 720),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (stream, point_id),
  check (last_hour = first_hour + interval '719 hours')
);

create index open_meteo_hourly_states_last_hour_idx
  on public.open_meteo_hourly_states (stream, last_hour desc);

alter table public.open_meteo_hourly_states enable row level security;
revoke all on table public.open_meteo_hourly_states from public, anon, authenticated;
grant select, insert, update, delete on table public.open_meteo_hourly_states to service_role;

-- The first 30-day bootstrap costs more than an incremental request. Reserve
-- estimated quota atomically before each spatial batch so a fresh deployment
-- initializes over several days instead of crossing the hobby-project limit.
create table public.provider_daily_budgets (
  provider text not null,
  usage_date date not null default current_date,
  estimated_units integer not null default 0 check (estimated_units >= 0),
  updated_at timestamptz not null default now(),
  primary key (provider, usage_date)
);

alter table public.provider_daily_budgets enable row level security;
revoke all on table public.provider_daily_budgets from public, anon, authenticated;
grant select on table public.provider_daily_budgets to service_role;

create or replace function public.reserve_provider_daily_budget(
  p_provider text,
  p_estimated_units integer,
  p_daily_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved boolean := false;
begin
  if p_provider !~ '^[a-z0-9-]{1,40}$'
    or p_estimated_units <= 0
    or p_daily_limit <= 0
    or p_estimated_units > p_daily_limit then
    raise exception 'Invalid provider budget reservation';
  end if;

  delete from public.provider_daily_budgets
  where usage_date < current_date - 7;

  insert into public.provider_daily_budgets (provider, usage_date)
  values (p_provider, current_date)
  on conflict (provider, usage_date) do nothing;

  update public.provider_daily_budgets
  set
    estimated_units = estimated_units + p_estimated_units,
    updated_at = now()
  where provider = p_provider
    and usage_date = current_date
    and estimated_units + p_estimated_units <= p_daily_limit
  returning true into reserved;

  return coalesce(reserved, false);
end;
$$;

revoke all on function public.reserve_provider_daily_budget(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_provider_daily_budget(text, integer, integer)
  to service_role;

insert into public.pipeline_sources (
  source_id,
  title,
  source_url,
  source_kind,
  native_resolution_m,
  refresh_cadence,
  license,
  enabled,
  status,
  status_detail
) values (
  'meteofrance-seamless-precipitation',
  'Météo-France seamless precipitation fallback via Open-Meteo',
  'https://open-meteo.com/en/docs/meteofrance-api',
  'weather',
  9000,
  'daily rolling overlap',
  'CC BY 4.0 (Open-Meteo) / Licence Ouverte (Météo-France)',
  true,
  'active',
  'The station-rain-v1 fallback is sampled on the existing 9 km provider lattice and retained as an exact bounded 720-hour rolling series.'
)
on conflict (source_id) do update set
  title = excluded.title,
  source_url = excluded.source_url,
  source_kind = excluded.source_kind,
  native_resolution_m = excluded.native_resolution_m,
  refresh_cadence = excluded.refresh_cadence,
  license = excluded.license,
  enabled = excluded.enabled,
  status = excluded.status,
  status_detail = excluded.status_detail,
  checked_at = now(),
  updated_at = now();

-- The existing atmosphere cursor is deliberately preserved so rolling this
-- additive migration back to the previous application cannot restart its
-- expensive legacy full-history loop. The new function detects missing state
-- itself and bootstraps it under the daily budget.
delete from public.pipeline_cursors
where pipeline = 'spatial-precipitation-fallback';

comment on table public.open_meteo_hourly_states is
  'Private bounded Open-Meteo hourly state used to preserve exact 30-day scoring windows while fetching only a short daily overlap.';

comment on column public.open_meteo_hourly_states.payload is
  'Validated Open-Meteo location payload with an exact 720-hour UTC axis; never exposed through a public policy.';

comment on table public.provider_daily_budgets is
  'Private conservative quota reservations; failed requests remain charged so retries cannot exceed the configured provider ceiling.';
