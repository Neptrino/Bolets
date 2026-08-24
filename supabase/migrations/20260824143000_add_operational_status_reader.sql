-- Give the private operations UI one deliberately narrow, read-only boundary.
-- The function remains security invoker so it can only see what the calling
-- service-role is already allowed to read; it is never executable by browser
-- roles.

create or replace function public.read_operational_status()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with latest_weather as (
    select max(snapshot_date) as snapshot_date
    from public.weather_grid_snapshots
  )
  select jsonb_build_object(
    'generatedAt', statement_timestamp(),
    'currentDate', current_date,
    'sources', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'sourceId', source.source_id,
          'title', source.title,
          'sourceKind', source.source_kind,
          'refreshCadence', source.refresh_cadence,
          'enabled', source.enabled,
          'status', source.status,
          'statusDetail', source.status_detail,
          'checkedAt', source.checked_at
        )
        order by source.enabled desc, source.status, source.title
      )
      from public.pipeline_sources source
    ), '[]'::jsonb),
    'cursors', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'pipeline', cursor.pipeline,
          'snapshotDate', cursor.snapshot_date,
          'lastCellId', cursor.last_cell_id,
          'updatedAt', cursor.updated_at
        )
        order by cursor.pipeline
      )
      from public.pipeline_cursors cursor
    ), '[]'::jsonb),
    'jobs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'snapshotDate', grouped.snapshot_date,
          'jobKind', grouped.job_kind,
          'status', grouped.status,
          'egressLane', grouped.egress_lane,
          'shards', grouped.shards,
          'expectedPoints', grouped.expected_points,
          'rowsWritten', grouped.rows_written,
          'maxAttemptCount', grouped.max_attempt_count,
          'lastError', grouped.last_error,
          'updatedAt', grouped.updated_at
        )
        order by grouped.snapshot_date desc, grouped.job_kind, grouped.status, grouped.egress_lane nulls first
      )
      from (
        select
          job.snapshot_date,
          job.job_kind,
          job.status,
          job.egress_lane,
          count(*)::integer as shards,
          coalesce(sum(job.expected_points), 0)::integer as expected_points,
          coalesce(sum(job.rows_written), 0)::integer as rows_written,
          max(job.attempt_count)::integer as max_attempt_count,
          left(max(job.last_error) filter (where job.last_error is not null), 500) as last_error,
          max(job.updated_at) as updated_at
        from public.spatial_atmosphere_jobs job
        where job.snapshot_date >= current_date - 2
        group by job.snapshot_date, job.job_kind, job.status, job.egress_lane
      ) grouped
    ), '[]'::jsonb),
    'budgets', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'provider', budget.provider,
          'consumer', budget.consumer,
          'windowKind', budget.window_kind,
          'windowStart', budget.window_start,
          'estimatedUnits', budget.estimated_units,
          'updatedAt', budget.updated_at
        )
        order by budget.window_kind, budget.consumer
      )
      from public.provider_budget_windows budget
      where budget.window_start = case budget.window_kind
        when 'minute' then date_trunc('minute', statement_timestamp())
        when 'hour' then date_trunc('hour', statement_timestamp())
        when 'day' then date_trunc('day', statement_timestamp())
      end
    ), '[]'::jsonb),
    'rollingStates', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stream', grouped.stream,
          'stateCount', grouped.state_count,
          'coverageStart', grouped.coverage_start,
          'oldestLastHour', grouped.oldest_last_hour,
          'newestLastHour', grouped.newest_last_hour,
          'updatedAt', grouped.updated_at
        )
        order by grouped.stream
      )
      from (
        select
          state.stream,
          count(*)::integer as state_count,
          min(state.first_hour) as coverage_start,
          min(state.last_hour) as oldest_last_hour,
          max(state.last_hour) as newest_last_hour,
          max(state.updated_at) as updated_at
        from public.open_meteo_hourly_states state
        group by state.stream
      ) grouped
    ), '[]'::jsonb),
    'weatherSnapshot', coalesce((
      select jsonb_build_object(
        'latestDate', latest.snapshot_date,
        'rowCount', count(snapshot.id)::integer,
        'staleCount', count(snapshot.id) filter (where snapshot.stale)::integer,
        'observedAt', max(snapshot.observed_at),
        'createdAt', max(snapshot.created_at)
      )
      from latest_weather latest
      left join public.weather_grid_snapshots snapshot
        on snapshot.snapshot_date = latest.snapshot_date
      group by latest.snapshot_date
    ), '{}'::jsonb),
    'recentRuns', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', recent.id,
          'pipeline', recent.pipeline,
          'triggerType', recent.trigger_type,
          'status', recent.status,
          'snapshotDate', recent.snapshot_date,
          'startedAt', recent.started_at,
          'completedAt', recent.completed_at,
          'rowsRead', recent.rows_read,
          'rowsWritten', recent.rows_written,
          'errorMessage', left(recent.error_message, 500)
        )
        order by recent.started_at desc
      )
      from (
        select ranked.*
        from (
          select
            run.*,
            row_number() over (
              partition by run.pipeline, run.status
              order by run.started_at desc
            ) as status_rank
          from public.ingestion_runs run
          where run.started_at >= statement_timestamp() - interval '30 days'
        ) ranked
        where ranked.status_rank <= 3
        order by ranked.started_at desc
        limit 40
      ) recent
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.read_operational_status()
  from public, anon, authenticated;
grant execute on function public.read_operational_status()
  to service_role;

comment on function public.read_operational_status() is
  'Private, service-role-only operational summary v3 for the Bolets status page and metrics collector.';
