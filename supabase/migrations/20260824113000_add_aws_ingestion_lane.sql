-- Add one independent AWS Lambda egress lane without changing the shared
-- Open-Meteo budget or allowing more than one running shard per lane.

alter table public.spatial_atmosphere_jobs
  drop constraint spatial_atmosphere_jobs_egress_lane_check;

alter table public.spatial_atmosphere_jobs
  add constraint spatial_atmosphere_jobs_egress_lane_check
  check (egress_lane in ('direct', 'cloudflare', 'aws'));

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
    or p_egress_lane not in ('direct', 'cloudflare', 'aws')
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
