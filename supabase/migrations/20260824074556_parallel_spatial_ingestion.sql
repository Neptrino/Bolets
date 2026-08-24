-- Run the observed atmospheric refresh as independently leased shards. The
-- production callers use different provider egress paths, but every call
-- still reserves from one shared Open-Meteo budget before leaving Postgres.

drop function if exists public.reserve_provider_daily_budget(text, integer, integer);
drop table if exists public.provider_daily_budgets;

create table public.provider_budget_windows (
  provider text not null,
  consumer text not null,
  window_kind text not null check (window_kind in ('minute', 'hour', 'day')),
  window_start timestamptz not null,
  estimated_units integer not null default 0 check (estimated_units >= 0),
  updated_at timestamptz not null default now(),
  primary key (provider, consumer, window_kind, window_start),
  check (provider ~ '^[a-z0-9-]{1,40}$'),
  check (consumer = '*' or consumer ~ '^[a-z0-9-]{1,60}$')
);

create index provider_budget_windows_retention_idx
  on public.provider_budget_windows (window_start);

alter table public.provider_budget_windows enable row level security;
revoke all on table public.provider_budget_windows from public, anon, authenticated;
grant select on table public.provider_budget_windows to service_role;

create or replace function public.reserve_provider_budget(
  p_provider text,
  p_consumer text,
  p_estimated_units integer,
  p_minute_limit integer,
  p_hour_limit integer,
  p_day_limit integer,
  p_consumer_day_limit integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_at timestamptz := clock_timestamp();
  minute_start timestamptz := date_trunc('minute', current_at);
  hour_start timestamptz := date_trunc('hour', current_at);
  day_start timestamptz := date_trunc('day', current_at);
  used_units integer;
begin
  if p_provider !~ '^[a-z0-9-]{1,40}$'
    or p_consumer !~ '^[a-z0-9-]{1,60}$'
    or p_estimated_units <= 0
    or p_minute_limit <= 0
    or p_hour_limit <= 0
    or p_day_limit <= 0
    or p_consumer_day_limit <= 0
    or p_estimated_units > least(p_minute_limit, p_hour_limit, p_day_limit, p_consumer_day_limit) then
    raise exception 'Invalid provider budget reservation';
  end if;

  -- All windows for one provider are checked and incremented as one critical
  -- section. Separate Edge Function invocations therefore cannot both observe
  -- the same remaining capacity and oversubscribe it.
  perform pg_advisory_xact_lock(hashtextextended('provider-budget:' || p_provider, 0));

  delete from public.provider_budget_windows
  where window_start < day_start - interval '8 days';

  select coalesce(estimated_units, 0) into used_units
  from public.provider_budget_windows
  where provider = p_provider
    and consumer = '*'
    and window_kind = 'minute'
    and window_start = minute_start;
  if coalesce(used_units, 0) + p_estimated_units > p_minute_limit then
    return 'minute';
  end if;

  select coalesce(estimated_units, 0) into used_units
  from public.provider_budget_windows
  where provider = p_provider
    and consumer = '*'
    and window_kind = 'hour'
    and window_start = hour_start;
  if coalesce(used_units, 0) + p_estimated_units > p_hour_limit then
    return 'hour';
  end if;

  select coalesce(estimated_units, 0) into used_units
  from public.provider_budget_windows
  where provider = p_provider
    and consumer = '*'
    and window_kind = 'day'
    and window_start = day_start;
  if coalesce(used_units, 0) + p_estimated_units > p_day_limit then
    return 'day';
  end if;

  select coalesce(estimated_units, 0) into used_units
  from public.provider_budget_windows
  where provider = p_provider
    and consumer = p_consumer
    and window_kind = 'day'
    and window_start = day_start;
  if coalesce(used_units, 0) + p_estimated_units > p_consumer_day_limit then
    return 'consumer-day';
  end if;

  insert into public.provider_budget_windows (
    provider,
    consumer,
    window_kind,
    window_start,
    estimated_units,
    updated_at
  ) values
    (p_provider, '*', 'minute', minute_start, p_estimated_units, current_at),
    (p_provider, '*', 'hour', hour_start, p_estimated_units, current_at),
    (p_provider, '*', 'day', day_start, p_estimated_units, current_at),
    (p_provider, p_consumer, 'day', day_start, p_estimated_units, current_at)
  on conflict (provider, consumer, window_kind, window_start) do update set
    estimated_units = public.provider_budget_windows.estimated_units + excluded.estimated_units,
    updated_at = excluded.updated_at;

  return 'reserved';
end;
$$;

revoke all on function public.reserve_provider_budget(
  text,
  text,
  integer,
  integer,
  integer,
  integer,
  integer
) from public, anon, authenticated;
grant execute on function public.reserve_provider_budget(
  text,
  text,
  integer,
  integer,
  integer,
  integer,
  integer
) to service_role;

create table public.spatial_atmosphere_jobs (
  id bigint generated always as identity primary key,
  snapshot_date date not null,
  job_kind text not null check (job_kind in ('precipitation-fallback', 'atmosphere')),
  shard_index integer not null check (shard_index >= 0),
  first_point_id text not null,
  last_point_id text not null,
  expected_points smallint not null check (expected_points between 1 and 200),
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded')),
  egress_lane text check (egress_lane in ('direct', 'cloudflare')),
  lease_token uuid,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  rows_written integer not null default 0 check (rows_written >= 0),
  last_error text,
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snapshot_date, job_kind, shard_index),
  check (first_point_id <= last_point_id),
  check (
    (status = 'running' and lease_token is not null and lease_expires_at is not null and egress_lane is not null)
    or status <> 'running'
  )
);

create unique index spatial_atmosphere_jobs_running_lane_idx
  on public.spatial_atmosphere_jobs (egress_lane)
  where status = 'running';

create index spatial_atmosphere_jobs_claim_idx
  on public.spatial_atmosphere_jobs (snapshot_date, status, next_attempt_at, job_kind, shard_index);

alter table public.spatial_atmosphere_jobs enable row level security;
revoke all on table public.spatial_atmosphere_jobs from public, anon, authenticated;
grant select on table public.spatial_atmosphere_jobs to service_role;
grant usage, select on sequence public.spatial_atmosphere_jobs_id_seq to service_role;

create or replace function public.claim_spatial_atmosphere_job(
  p_snapshot_date date,
  p_egress_lane text,
  p_shard_size integer,
  p_lease_seconds integer
)
returns table (
  job_id bigint,
  job_kind text,
  first_point_id text,
  last_point_id text,
  expected_points integer,
  lease_token uuid,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_job_id bigint;
  selected_lease_token uuid;
begin
  if p_snapshot_date < current_date - 1
    or p_snapshot_date > current_date + 1
    or p_egress_lane not in ('direct', 'cloudflare')
    or p_shard_size < 25
    or p_shard_size > 200
    or p_lease_seconds < 30
    or p_lease_seconds > 300 then
    raise exception 'Invalid spatial atmosphere job claim';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('spatial-atmosphere-jobs:' || p_snapshot_date::text, 0)
  );

  delete from public.spatial_atmosphere_jobs
  where snapshot_date < current_date - 7;

  update public.spatial_atmosphere_jobs
  set
    status = 'pending',
    lease_token = null,
    lease_expires_at = null,
    next_attempt_at = now(),
    last_error = 'Worker lease expired before completion',
    updated_at = now()
  where status = 'running'
    and lease_expires_at <= now();

  with ordered as (
    select
      point_id,
      ((row_number() over (order by point_id) - 1) / p_shard_size)::integer as shard_index
    from public.weather_grid_points
    where model = 'best_match'
  ), grouped as (
    select
      ordered.shard_index,
      min(ordered.point_id) as first_point_id,
      max(ordered.point_id) as last_point_id,
      count(*)::smallint as expected_points
    from ordered
    group by ordered.shard_index
  )
  insert into public.spatial_atmosphere_jobs (
    snapshot_date,
    job_kind,
    shard_index,
    first_point_id,
    last_point_id,
    expected_points
  )
  select
    p_snapshot_date,
    'precipitation-fallback',
    grouped.shard_index,
    grouped.first_point_id,
    grouped.last_point_id,
    grouped.expected_points
  from grouped
  on conflict on constraint spatial_atmosphere_jobs_snapshot_date_job_kind_shard_index_key
    do nothing;

  with ordered as (
    select
      point_id,
      ((row_number() over (order by point_id) - 1) / p_shard_size)::integer as shard_index
    from public.weather_grid_points
    where model = 'arome_france'
  ), grouped as (
    select
      ordered.shard_index,
      min(ordered.point_id) as first_point_id,
      max(ordered.point_id) as last_point_id,
      count(*)::smallint as expected_points
    from ordered
    group by ordered.shard_index
  )
  insert into public.spatial_atmosphere_jobs (
    snapshot_date,
    job_kind,
    shard_index,
    first_point_id,
    last_point_id,
    expected_points
  )
  select
    p_snapshot_date,
    'atmosphere',
    grouped.shard_index,
    grouped.first_point_id,
    grouped.last_point_id,
    grouped.expected_points
  from grouped
  on conflict on constraint spatial_atmosphere_jobs_snapshot_date_job_kind_shard_index_key
    do nothing;

  if exists (
    select 1
    from public.spatial_atmosphere_jobs
    where status = 'running'
      and egress_lane = p_egress_lane
  ) then
    return;
  end if;

  select candidate.id into selected_job_id
  from public.spatial_atmosphere_jobs candidate
  where candidate.snapshot_date = p_snapshot_date
    and candidate.status = 'pending'
    and candidate.next_attempt_at <= now()
    and (
      candidate.job_kind = 'precipitation-fallback'
      or not exists (
        select 1
        from public.spatial_atmosphere_jobs dependency
        where dependency.snapshot_date = p_snapshot_date
          and dependency.job_kind = 'precipitation-fallback'
          and dependency.status <> 'succeeded'
      )
    )
  order by
    case candidate.job_kind when 'precipitation-fallback' then 0 else 1 end,
    candidate.shard_index
  limit 1
  for update skip locked;

  if selected_job_id is null then
    return;
  end if;

  selected_lease_token := gen_random_uuid();

  return query
  update public.spatial_atmosphere_jobs job
  set
    status = 'running',
    egress_lane = p_egress_lane,
    lease_token = selected_lease_token,
    lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    attempt_count = job.attempt_count + 1,
    claimed_at = now(),
    completed_at = null,
    last_error = null,
    updated_at = now()
  where job.id = selected_job_id
  returning
    job.id,
    job.job_kind,
    job.first_point_id,
    job.last_point_id,
    job.expected_points::integer,
    job.lease_token,
    job.attempt_count;
end;
$$;

revoke all on function public.claim_spatial_atmosphere_job(date, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_spatial_atmosphere_job(date, text, integer, integer)
  to service_role;

create or replace function public.complete_spatial_atmosphere_job(
  p_job_id bigint,
  p_lease_token uuid,
  p_rows_written integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed_snapshot_date date;
  generation_complete boolean;
begin
  if p_job_id <= 0 or p_rows_written < 0 then
    raise exception 'Invalid spatial atmosphere job completion';
  end if;

  update public.spatial_atmosphere_jobs
  set
    status = 'succeeded',
    rows_written = p_rows_written,
    lease_token = null,
    lease_expires_at = null,
    completed_at = now(),
    updated_at = now()
  where id = p_job_id
    and status = 'running'
    and lease_token = p_lease_token
  returning snapshot_date into completed_snapshot_date;

  if completed_snapshot_date is null then
    raise exception 'Spatial atmosphere job lease is no longer valid';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('spatial-atmosphere-complete:' || completed_snapshot_date::text, 0)
  );

  select not exists (
    select 1
    from public.spatial_atmosphere_jobs
    where snapshot_date = completed_snapshot_date
      and status <> 'succeeded'
  ) into generation_complete;

  if generation_complete then
    insert into public.pipeline_cursors (
      pipeline,
      snapshot_date,
      last_cell_id,
      updated_at
    ) values (
      'spatial-atmosphere',
      completed_snapshot_date,
      '__complete__',
      now()
    )
    on conflict (pipeline) do update set
      snapshot_date = excluded.snapshot_date,
      last_cell_id = excluded.last_cell_id,
      updated_at = excluded.updated_at;
  end if;

  return generation_complete;
end;
$$;

revoke all on function public.complete_spatial_atmosphere_job(bigint, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.complete_spatial_atmosphere_job(bigint, uuid, integer)
  to service_role;

create or replace function public.defer_spatial_atmosphere_job(
  p_job_id bigint,
  p_lease_token uuid,
  p_error text,
  p_delay_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deferred boolean := false;
begin
  if p_job_id <= 0
    or p_error is null
    or length(p_error) = 0
    or p_delay_seconds < 1
    or p_delay_seconds > 3600 then
    raise exception 'Invalid spatial atmosphere job deferral';
  end if;

  update public.spatial_atmosphere_jobs
  set
    status = 'pending',
    lease_token = null,
    lease_expires_at = null,
    next_attempt_at = now() + make_interval(secs => p_delay_seconds),
    last_error = left(p_error, 500),
    updated_at = now()
  where id = p_job_id
    and status = 'running'
    and lease_token = p_lease_token
  returning true into deferred;

  return coalesce(deferred, false);
end;
$$;

revoke all on function public.defer_spatial_atmosphere_job(bigint, uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.defer_spatial_atmosphere_job(bigint, uuid, text, integer)
  to service_role;

comment on table public.provider_budget_windows is
  'Private atomic estimated Open-Meteo usage ledger shared by every egress lane and ingestion consumer.';

comment on table public.spatial_atmosphere_jobs is
  'Private leased shards for parallel observed-atmosphere ingestion. Fallback shards must all succeed before atmospheric shards can be claimed.';
