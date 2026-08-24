-- Stop one throttled public egress IP from burning the shared Open-Meteo
-- ledger while the other independently leased lanes remain healthy.

create table public.open_meteo_egress_lanes (
  lane text primary key check (lane in ('direct', 'cloudflare', 'aws')),
  blocked_until timestamptz,
  consecutive_rate_limits integer not null default 0
    check (consecutive_rate_limits >= 0),
  last_http_status smallint check (last_http_status between 100 and 599),
  last_retry_after_seconds integer
    check (last_retry_after_seconds between 1 and 86400),
  last_error text,
  last_rate_limited_at timestamptz,
  last_success_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.open_meteo_egress_lanes enable row level security;
revoke all on table public.open_meteo_egress_lanes from public, anon, authenticated;
grant select on table public.open_meteo_egress_lanes to service_role;

insert into public.open_meteo_egress_lanes (lane)
values ('direct'), ('cloudflare'), ('aws');

create or replace function public.defer_open_meteo_egress_lane(
  p_lane text,
  p_http_status integer,
  p_retry_after_seconds integer,
  p_error text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  failure_count integer;
  cooldown_seconds integer;
  result timestamptz;
begin
  if p_lane not in ('direct', 'cloudflare', 'aws')
    or p_http_status <> 429
    or (p_retry_after_seconds is not null
      and (p_retry_after_seconds < 1 or p_retry_after_seconds > 86400)) then
    raise exception 'Invalid Open-Meteo egress deferral';
  end if;

  insert into public.open_meteo_egress_lanes (
    lane,
    consecutive_rate_limits,
    last_http_status,
    last_retry_after_seconds,
    last_error,
    last_rate_limited_at,
    updated_at
  ) values (
    p_lane,
    1,
    p_http_status,
    p_retry_after_seconds,
    left(p_error, 500),
    statement_timestamp(),
    statement_timestamp()
  )
  on conflict (lane) do update set
    consecutive_rate_limits = public.open_meteo_egress_lanes.consecutive_rate_limits + 1,
    last_http_status = excluded.last_http_status,
    last_retry_after_seconds = excluded.last_retry_after_seconds,
    last_error = excluded.last_error,
    last_rate_limited_at = excluded.last_rate_limited_at,
    updated_at = excluded.updated_at
  returning consecutive_rate_limits into failure_count;

  -- Retry-After wins when supplied. Otherwise back off the public IP for
  -- 5m, 10m, 20m, 40m, 80m, 160m and then at most six hours.
  cooldown_seconds := greatest(
    coalesce(p_retry_after_seconds, 0),
    least(
      21600,
      (300 * power(2::numeric, least(failure_count - 1, 6)))::integer
    )
  );

  update public.open_meteo_egress_lanes lane_state
  set
    blocked_until = greatest(
      coalesce(lane_state.blocked_until, '-infinity'::timestamptz),
      statement_timestamp() + make_interval(secs => cooldown_seconds)
    ),
    updated_at = statement_timestamp()
  where lane_state.lane = p_lane
  returning lane_state.blocked_until into result;

  return result;
end;
$$;

revoke all on function public.defer_open_meteo_egress_lane(text, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.defer_open_meteo_egress_lane(text, integer, integer, text)
  to service_role;

create or replace function public.record_open_meteo_egress_success(p_lane text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_lane not in ('direct', 'cloudflare', 'aws') then
    raise exception 'Invalid Open-Meteo egress lane';
  end if;

  insert into public.open_meteo_egress_lanes (
    lane,
    blocked_until,
    consecutive_rate_limits,
    last_http_status,
    last_retry_after_seconds,
    last_error,
    last_success_at,
    updated_at
  ) values (
    p_lane,
    null,
    0,
    200,
    null,
    null,
    statement_timestamp(),
    statement_timestamp()
  )
  on conflict (lane) do update set
    blocked_until = null,
    consecutive_rate_limits = 0,
    last_http_status = 200,
    last_retry_after_seconds = null,
    last_error = null,
    last_success_at = excluded.last_success_at,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.record_open_meteo_egress_success(text)
  from public, anon, authenticated;
grant execute on function public.record_open_meteo_egress_success(text)
  to service_role;

-- Preserve the already-tested shard allocator as a private implementation and
-- put the lane-health check in a small, auditable wrapper.
alter function public.claim_spatial_atmosphere_job(date, text, integer, integer)
  rename to claim_spatial_atmosphere_job_without_egress_guard;

revoke all on function public.claim_spatial_atmosphere_job_without_egress_guard(date, text, integer, integer)
  from public, anon, authenticated, service_role;

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
begin
  if exists (
    select 1
    from public.open_meteo_egress_lanes lane_state
    where lane_state.lane = p_egress_lane
      and lane_state.blocked_until > statement_timestamp()
  ) then
    return;
  end if;

  return query
  select
    claimed.job_id,
    claimed.job_kind,
    claimed.first_point_id,
    claimed.last_point_id,
    claimed.expected_points,
    claimed.lease_token,
    claimed.attempt_count
  from public.claim_spatial_atmosphere_job_without_egress_guard(
    p_snapshot_date,
    p_egress_lane,
    p_shard_size,
    p_lease_seconds
  ) claimed;
end;
$$;

revoke all on function public.claim_spatial_atmosphere_job(date, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_spatial_atmosphere_job(date, text, integer, integer)
  to service_role;

comment on table public.open_meteo_egress_lanes is
  'Private circuit-breaker state for the three approved Open-Meteo egress lanes.';
comment on function public.defer_open_meteo_egress_lane(text, integer, integer, text) is
  'Service-role-only atomic rate-limit backoff for one approved Open-Meteo egress lane.';
comment on function public.record_open_meteo_egress_success(text) is
  'Service-role-only reset after a successful Open-Meteo response on one approved egress lane.';
