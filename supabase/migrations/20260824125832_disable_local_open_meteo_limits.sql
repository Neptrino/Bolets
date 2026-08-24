-- Keep conservative usage observability, but never reject an Open-Meteo call
-- locally. The provider response and the per-egress circuit breaker are the
-- only throttling mechanism.

create or replace function public.record_provider_usage(
  p_provider text,
  p_consumer text,
  p_estimated_units integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_at timestamptz := clock_timestamp();
  minute_start timestamptz := date_trunc('minute', current_at);
  hour_start timestamptz := date_trunc('hour', current_at);
  day_start timestamptz := date_trunc('day', current_at);
begin
  if p_provider !~ '^[a-z0-9-]{1,40}$'
    or p_consumer !~ '^[a-z0-9-]{1,60}$'
    or p_estimated_units <= 0 then
    raise exception 'Invalid provider usage record';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('provider-budget:' || p_provider, 0));

  delete from public.provider_budget_windows
  where window_start < day_start - interval '8 days';

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
end;
$$;

revoke all on function public.record_provider_usage(text, text, integer)
  from public, anon, authenticated;
grant execute on function public.record_provider_usage(text, text, integer)
  to service_role;

-- Retain the previous RPC signature during rolling deploys. Old workers record
-- usage through it, but its limit parameters are deliberately ignored.
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
begin
  perform public.record_provider_usage(
    p_provider,
    p_consumer,
    p_estimated_units
  );
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

update public.spatial_atmosphere_jobs
set
  next_attempt_at = statement_timestamp(),
  updated_at = statement_timestamp()
where status = 'pending'
  and last_error like 'Open-Meteo % budget is exhausted';

comment on function public.record_provider_usage(text, text, integer) is
  'Service-role-only Open-Meteo usage accounting; it records estimates and never enforces a local limit.';
comment on function public.reserve_provider_budget(text, text, integer, integer, integer, integer, integer) is
  'Compatibility usage recorder. Limit arguments are ignored; provider 429 responses control egress backoff.';
