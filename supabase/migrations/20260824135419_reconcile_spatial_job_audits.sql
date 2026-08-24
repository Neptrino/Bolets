-- Keep the durable shard state and its human-facing audit run consistent when
-- an Edge Function is terminated after its lease expires. The retry that
-- ultimately completes a shard closes older attempts as superseded, and the
-- current attempt is made successful atomically with the job. The ordinary
-- finishRun call may still refine that successful audit to partial and attach
-- the complete safe metadata immediately afterwards.

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
  completed_job_kind text;
  completed_attempt_count integer;
  completed_expected_points integer;
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
  returning
    snapshot_date,
    job_kind,
    attempt_count,
    expected_points
  into
    completed_snapshot_date,
    completed_job_kind,
    completed_attempt_count,
    completed_expected_points;

  if completed_snapshot_date is null then
    raise exception 'Spatial atmosphere job lease is no longer valid';
  end if;

  update public.ingestion_runs run
  set
    status = case
      when (run.metadata ->> 'attempt')::integer < completed_attempt_count then 'skipped'
      else 'succeeded'
    end,
    completed_at = now(),
    rows_read = case
      when (run.metadata ->> 'attempt')::integer = completed_attempt_count
        then completed_expected_points
      else run.rows_read
    end,
    rows_written = case
      when (run.metadata ->> 'attempt')::integer = completed_attempt_count
        then case
          when completed_job_kind = 'precipitation-fallback' then completed_expected_points
          else p_rows_written
        end
      else run.rows_written
    end,
    error_message = case
      when (run.metadata ->> 'attempt')::integer < completed_attempt_count
        then 'Superseded by a successful retry of the same spatial shard'
      else null
    end,
    metadata = case
      when (run.metadata ->> 'attempt')::integer < completed_attempt_count
        then pg_catalog.jsonb_set(run.metadata, '{reason}', '"superseded-retry"'::jsonb, true)
      else run.metadata
    end
  where run.pipeline = 'spatial-atmosphere'
    and run.status = 'running'
    and run.metadata ->> 'jobId' = p_job_id::text
    and run.metadata ->> 'attempt' ~ '^[0-9]{1,9}$'
    and (run.metadata ->> 'attempt')::integer <= completed_attempt_count;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('spatial-atmosphere-complete:' || completed_snapshot_date::text, 0)
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

-- Repair audit rows left behind before the atomic completion behavior above
-- was installed. A succeeded durable job is the source of truth.
update public.ingestion_runs run
set
  status = case
    when (run.metadata ->> 'attempt')::integer < job.attempt_count then 'skipped'
    else 'succeeded'
  end,
  completed_at = coalesce(job.completed_at, now()),
  rows_read = case
    when (run.metadata ->> 'attempt')::integer = job.attempt_count
      then job.expected_points
    else run.rows_read
  end,
  rows_written = case
    when (run.metadata ->> 'attempt')::integer = job.attempt_count
      then case
        when job.job_kind = 'precipitation-fallback' then job.expected_points
        else job.rows_written
      end
    else run.rows_written
  end,
  error_message = case
    when (run.metadata ->> 'attempt')::integer < job.attempt_count
      then 'Superseded by a successful retry of the same spatial shard'
    else null
  end,
  metadata = case
    when (run.metadata ->> 'attempt')::integer < job.attempt_count
      then pg_catalog.jsonb_set(run.metadata, '{reason}', '"superseded-retry"'::jsonb, true)
    else run.metadata
  end
from public.spatial_atmosphere_jobs job
where run.pipeline = 'spatial-atmosphere'
  and run.status = 'running'
  and job.status = 'succeeded'
  and run.metadata ->> 'jobId' = job.id::text
  and run.metadata ->> 'attempt' ~ '^[0-9]{1,9}$'
  and (run.metadata ->> 'attempt')::integer <= job.attempt_count;

-- Legacy, pre-shard workers cannot be tied to a durable job. Once they are
-- well beyond the execution window, close them truthfully instead of showing
-- an endlessly running process in the operations UI.
update public.ingestion_runs run
set
  status = 'failed',
  completed_at = run.started_at + interval '10 minutes',
  error_message = 'Worker ended before recording completion'
where run.pipeline = 'spatial-atmosphere'
  and run.status = 'running'
  and not (run.metadata ? 'jobId')
  and run.started_at < statement_timestamp() - interval '10 minutes';

comment on function public.complete_spatial_atmosphere_job(bigint, uuid, integer) is
  'Atomically completes a leased atmosphere shard and reconciles its audited attempts.';
