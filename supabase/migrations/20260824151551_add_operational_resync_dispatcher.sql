-- Queue authenticated ingestion functions from the private admin surface
-- without copying the ingestion token into the Next.js container. Spatial
-- targets reset only completed cursors; an incomplete generation is resumed.

create or replace function public.dispatch_operational_resync(
  p_target text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  anon_key text;
  ingestion_token text;
  request_headers jsonb;
  request_ids bigint[] := array[]::bigint[];
  reset_pipelines text[] := array[]::text[];
  atmosphere_complete boolean := false;
  soil_complete boolean := false;
  forecast_complete boolean := false;
  lane text;
begin
  if p_target not in (
    'all',
    'regional-environment',
    'station-rain',
    'spatial-atmosphere',
    'soil-forecast',
    'condition-caches'
  ) then
    raise exception 'Unknown operational resync target'
      using errcode = '22023';
  end if;

  if not pg_try_advisory_xact_lock(
    hashtextextended('bolets-operational-resync', 0)
  ) then
    return jsonb_build_object(
      'accepted', false,
      'target', p_target,
      'reason', 'another-resync-is-being-prepared'
    );
  end if;

  select
    max(decrypted_secret) filter (where name = 'bolets_project_url'),
    max(decrypted_secret) filter (where name = 'bolets_legacy_anon_key'),
    max(decrypted_secret) filter (where name = 'bolets_ingestion_token')
  into project_url, anon_key, ingestion_token
  from vault.decrypted_secrets
  where name in (
    'bolets_project_url',
    'bolets_legacy_anon_key',
    'bolets_ingestion_token'
  );

  if project_url is null or anon_key is null or ingestion_token is null then
    raise exception 'Operational resync secrets are not configured';
  end if;

  request_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || anon_key,
    'apikey', anon_key,
    'x-ingestion-token', ingestion_token
  );

  if p_target in ('all', 'spatial-atmosphere') then
    select exists (
      select 1
      from public.pipeline_cursors
      where pipeline = 'spatial-atmosphere'
        and snapshot_date = current_date
        and last_cell_id = '__complete__'
    ) into atmosphere_complete;

    if atmosphere_complete then
      if exists (
        select 1
        from public.spatial_atmosphere_jobs
        where snapshot_date = current_date
          and status = 'running'
          and lease_expires_at > now()
      ) then
        return jsonb_build_object(
          'accepted', false,
          'target', p_target,
          'reason', 'spatial-atmosphere-is-running'
        );
      end if;

      perform pg_advisory_xact_lock(
        hashtextextended('spatial-atmosphere-jobs:' || current_date::text, 0)
      );
      delete from public.spatial_atmosphere_jobs
      where snapshot_date = current_date;
      delete from public.pipeline_cursors
      where pipeline = 'spatial-atmosphere'
        and snapshot_date = current_date;
      reset_pipelines := array_append(reset_pipelines, 'spatial-atmosphere');
    end if;
  end if;

  if p_target in ('all', 'soil-forecast') then
    select exists (
      select 1
      from public.pipeline_cursors
      where pipeline = 'spatial-soil'
        and snapshot_date = current_date
        and last_cell_id = '__complete__'
    ) into soil_complete;
    select exists (
      select 1
      from public.pipeline_cursors
      where pipeline = 'spatial-forecast-v2'
        and snapshot_date = current_date
        and last_cell_id = '__complete__'
    ) into forecast_complete;

    if soil_complete and forecast_complete then
      if not pg_try_advisory_xact_lock(91600348) then
        return jsonb_build_object(
          'accepted', false,
          'target', p_target,
          'reason', 'soil-or-forecast-publication-is-running'
        );
      end if;

      delete from public.weather_grid_forecasts
      where snapshot_date = current_date;
      delete from public.weather_forecast_issues
      where snapshot_date = current_date;
      delete from public.pipeline_cursors
      where pipeline in ('spatial-soil', 'spatial-forecast-v2')
        and snapshot_date = current_date;
      reset_pipelines := array_append(reset_pipelines, 'spatial-soil');
      reset_pipelines := array_append(reset_pipelines, 'spatial-forecast-v2');
    end if;
  end if;

  if p_target in ('all', 'condition-caches') then
    if not pg_try_advisory_xact_lock(91600347)
      or not pg_try_advisory_xact_lock(91600348)
    then
      return jsonb_build_object(
        'accepted', false,
        'target', p_target,
        'reason', 'condition-cache-publication-is-running'
      );
    end if;

    delete from public.pipeline_cursors
    where pipeline in ('spatial-condition-coarse', 'spatial-condition-territorial')
      and snapshot_date = current_date;
    reset_pipelines := array_append(reset_pipelines, 'spatial-condition-coarse');
    reset_pipelines := array_append(reset_pipelines, 'spatial-condition-territorial');
  end if;

  if p_target in ('all', 'regional-environment') then
    request_ids := array_append(request_ids, net.http_post(
      url := project_url || '/functions/v1/refresh-environment',
      headers := request_headers,
      body := '{"trigger":"manual"}'::jsonb,
      timeout_milliseconds := 120000
    ));
  end if;

  if p_target in ('all', 'station-rain') then
    request_ids := array_append(request_ids, net.http_post(
      url := project_url || '/functions/v1/import-xema-rain',
      headers := request_headers,
      body := '{"trigger":"manual","hours":48}'::jsonb,
      timeout_milliseconds := 120000
    ));
  end if;

  if p_target in ('all', 'spatial-atmosphere') then
    foreach lane in array array['direct', 'cloudflare', 'aws'] loop
      request_ids := array_append(request_ids, net.http_post(
        url := project_url || '/functions/v1/refresh-spatial-environment',
        headers := request_headers,
        body := jsonb_build_object('trigger', 'manual', 'lane', lane),
        timeout_milliseconds := 120000
      ));
    end loop;
  end if;

  if p_target in ('all', 'soil-forecast') then
    request_ids := array_append(request_ids, net.http_post(
      url := project_url || '/functions/v1/refresh-spatial-soil',
      headers := request_headers,
      body := '{"trigger":"manual"}'::jsonb,
      timeout_milliseconds := 120000
    ));
  end if;

  return jsonb_build_object(
    'accepted', true,
    'target', p_target,
    'requestIds', to_jsonb(request_ids),
    'resetPipelines', to_jsonb(reset_pipelines)
  );
end;
$$;

revoke all on function public.dispatch_operational_resync(text)
  from public, anon, authenticated;
grant execute on function public.dispatch_operational_resync(text)
  to service_role;

comment on function public.dispatch_operational_resync(text) is
  'Private admin dispatcher that resumes incomplete ingestion or resets completed selected pipelines before queueing authenticated Edge Function calls through pg_net.';
