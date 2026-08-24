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
  with product_models(model, stream, cursor_pipeline) as (
    values
      ('arome_france'::text, 'atmosphere'::text, 'spatial-atmosphere'::text),
      ('best_match'::text, 'soil'::text, 'spatial-soil'::text)
  ), product_dates as materialized (
    select
      product.model,
      product.stream,
      product.cursor_pipeline,
      (
        select max(snapshot.snapshot_date)
        from public.weather_grid_snapshots snapshot
        join public.weather_grid_points point
          on point.point_id = snapshot.point_id
        where point.model = product.model
      ) as snapshot_date
    from product_models product
  ), observed_publications as (
    select
      product.stream,
      product.snapshot_date,
      count(point.point_id)::integer as expected_point_count,
      count(snapshot.id)::integer as point_count,
      count(snapshot.id) filter (where snapshot.stale)::integer as stale_count,
      max(snapshot.observed_at) as observed_at,
      max(snapshot.created_at) as created_at,
      cursor.updated_at as completed_at,
      (
        product.snapshot_date is not null
        and cursor.snapshot_date = product.snapshot_date
        and cursor.last_cell_id = '__complete__'
        and count(point.point_id) > 0
        and count(snapshot.id) = count(point.point_id)
        and count(snapshot.id) filter (where snapshot.stale) = 0
      ) as complete
    from product_dates product
    left join public.weather_grid_points point
      on point.model = product.model
    left join public.weather_grid_snapshots snapshot
      on snapshot.point_id = point.point_id
      and snapshot.snapshot_date = product.snapshot_date
    left join public.pipeline_cursors cursor
      on cursor.pipeline = product.cursor_pipeline
    group by
      product.stream,
      product.snapshot_date,
      cursor.snapshot_date,
      cursor.last_cell_id,
      cursor.updated_at
  ), latest_forecast_issue as (
    select issue.snapshot_date, issue.generated_at, issue.completed_at
    from public.weather_forecast_issues issue
    order by issue.generated_at desc
    limit 1
  ), forecast_publication as (
    select
      issue.snapshot_date,
      issue.generated_at,
      issue.completed_at,
      count(forecast.point_id)::integer as row_count,
      count(distinct forecast.point_id)::integer as point_count,
      expected.point_count as expected_point_count,
      count(distinct forecast.horizon_hours)::integer as horizon_count,
      count(distinct forecast.horizon_hours)
        filter (where forecast.horizon_hours > 0)::integer as future_horizon_count,
      min(forecast.valid_at)
        filter (where forecast.horizon_hours = 0) as baseline_valid_at,
      min(forecast.valid_at)
        filter (where forecast.horizon_hours > 0) as valid_from,
      max(forecast.valid_at) as valid_through,
      (
        issue.completed_at is not null
        and cursor.snapshot_date = issue.snapshot_date
        and cursor.last_cell_id = '__complete__'
        and expected.point_count > 0
        and count(forecast.point_id) = expected.point_count * 6
        and count(distinct forecast.point_id) = expected.point_count
        and count(distinct forecast.horizon_hours) = 6
      ) as complete
    from latest_forecast_issue issue
    left join public.weather_grid_forecasts forecast
      on forecast.snapshot_date = issue.snapshot_date
      and forecast.generated_at = issue.generated_at
    left join public.pipeline_cursors cursor
      on cursor.pipeline = 'spatial-forecast-v2'
    cross join lateral (
      select count(*)::integer as point_count
      from public.weather_grid_points point
      where point.model = 'best_match'
    ) expected
    group by
      issue.snapshot_date,
      issue.generated_at,
      issue.completed_at,
      cursor.snapshot_date,
      cursor.last_cell_id,
      expected.point_count
  ), latest_weather as (
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
    'egressLanes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'lane', lane_state.lane,
          'blockedUntil', lane_state.blocked_until,
          'consecutiveRateLimits', lane_state.consecutive_rate_limits,
          'lastHttpStatus', lane_state.last_http_status,
          'lastRateLimitedAt', lane_state.last_rate_limited_at,
          'lastSuccessAt', lane_state.last_success_at,
          'updatedAt', lane_state.updated_at
        )
        order by case lane_state.lane
          when 'direct' then 1
          when 'cloudflare' then 2
          when 'aws' then 3
        end
      )
      from public.open_meteo_egress_lanes lane_state
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
    'observedPublications', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stream', publication.stream,
          'snapshotDate', publication.snapshot_date,
          'complete', publication.complete,
          'pointCount', publication.point_count,
          'expectedPointCount', publication.expected_point_count,
          'staleCount', publication.stale_count,
          'observedAt', publication.observed_at,
          'createdAt', publication.created_at,
          'completedAt', publication.completed_at
        )
        order by case publication.stream when 'atmosphere' then 1 else 2 end
      )
      from observed_publications publication
    ), '[]'::jsonb),
    'forecastPublication', coalesce((
      select jsonb_build_object(
        'snapshotDate', publication.snapshot_date,
        'complete', publication.complete,
        'rowCount', publication.row_count,
        'pointCount', publication.point_count,
        'expectedPointCount', publication.expected_point_count,
        'horizonCount', publication.horizon_count,
        'futureHorizonCount', publication.future_horizon_count,
        'generatedAt', publication.generated_at,
        'completedAt', publication.completed_at,
        'baselineValidAt', publication.baseline_valid_at,
        'validFrom', publication.valid_from,
        'validThrough', publication.valid_through
      )
      from forecast_publication publication
    ), 'null'::jsonb),
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
          'errorMessage', left(recent.error_message, 500),
          'egressLane', case
            when recent.metadata ->> 'egressLane' in ('direct', 'cloudflare', 'aws')
              then recent.metadata ->> 'egressLane'
            else null
          end,
          'reason', case
            when recent.metadata ->> 'reason' in ('provider-budget', 'egress-rate-limit', 'job-failed', 'superseded-retry')
              then recent.metadata ->> 'reason'
            else null
          end,
          'jobId', job.id,
          'jobKind', job.job_kind,
          'shardNumber', job.shard_index + 1,
          'shardTotal', job_generation.shard_total,
          'expectedPoints', job.expected_points,
          'attempt', case
            when recent.metadata ->> 'attempt' ~ '^[0-9]{1,9}$'
              then (recent.metadata ->> 'attempt')::integer
            else null
          end
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
      left join public.spatial_atmosphere_jobs job
        on job.id = case
          when recent.metadata ->> 'jobId' ~ '^[0-9]{1,18}$'
            then (recent.metadata ->> 'jobId')::bigint
          else null
        end
      left join lateral (
        select count(*)::integer as shard_total
        from public.spatial_atmosphere_jobs sibling
        where sibling.snapshot_date = job.snapshot_date
          and sibling.job_kind = job.job_kind
      ) job_generation on job.id is not null
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.read_operational_status()
  from public, anon, authenticated;
grant execute on function public.read_operational_status()
  to service_role;

comment on function public.read_operational_status() is
  'Private, service-role-only operational summary v6 for the Bolets status page and metrics collector, including explicit observed and forecast publication readiness.';
