-- One-time safety gate for adopting the physical managed-project restore into
-- the standard Supabase migration ledger. The former VPS installer verified
-- these post-restore contracts individually; keep this file fixed with the
-- restored baseline rather than extending it for future migrations.

do $baseline$
begin
  if to_regclass('public.open_meteo_hourly_states') is null
    or to_regclass('public.spatial_atmosphere_jobs') is null
    or to_regclass('public.open_meteo_egress_lanes') is null
    or to_regclass('public.user_findings') is null
    or to_regclass('public.user_forest_preferences') is null
  then
    raise exception 'The restored schema is missing a required post-restore table';
  end if;

  if to_regprocedure('public.record_provider_usage(text,text,integer)') is null
    or to_regprocedure('public.complete_spatial_atmosphere_job(bigint,uuid,integer)') is null
    or to_regprocedure('public.read_operational_status()') is null
    or to_regprocedure('public.reconcile_weather_forecast_issue(date,interval)') is null
    or to_regprocedure('public.dispatch_operational_resync(text)') is null
    or to_regprocedure('public.read_owner_finding_private_details(uuid)') is null
    or to_regprocedure('public.remove_owner_finding(uuid,uuid)') is null
  then
    raise exception 'The restored schema is missing a required post-restore function';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'spatial_atmosphere_jobs_egress_lane_check'
      and pg_catalog.pg_get_constraintdef(oid) like '%''aws''%'
  ) then
    raise exception 'The restored schema is missing the AWS ingestion lane';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'user_finding_photos_follow_finding_visibility'
  ) then
    raise exception 'The restored schema is missing unified finding-photo visibility';
  end if;

  if not exists (
    select 1
    from cron.job
    where jobname = 'refresh-spatial-condition-caches'
  ) then
    raise exception 'The restored schema is missing condition-cache publication';
  end if;

  if not exists (
    select 1
    from auth.users
    where lower(email) = 'aleix@ventayol.cat'
      and raw_app_meta_data ->> 'app_role' = 'admin'
  ) then
    raise exception 'The restored schema is missing the initial administrator role';
  end if;
end;
$baseline$;
