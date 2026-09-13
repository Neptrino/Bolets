-- Run only in a disposable empty database with pg_cron available and
-- cron.launch_active_jobs=off. The fixture replaces the expensive aggregation.
\set ON_ERROR_STOP on
create extension if not exists pg_cron;
create extension if not exists dblink;
create table public.pipeline_cursors (
  pipeline text primary key, snapshot_date date, last_cell_id text, updated_at timestamptz
);
create table public.publication_test_calls (resolution integer);
create table public.publication_test_failure (enabled boolean);
insert into public.publication_test_failure values (false);
create function public.refresh_spatial_level_conditions(integer, date) returns integer
language plpgsql as $$
begin
  if $1 = 1000 and (select enabled from public.publication_test_failure) then
    raise exception 'injected territorial failure';
  end if;
  insert into public.publication_test_calls values ($1);
  return 1;
end;
$$;
\ir ../../supabase/migrations/20260823180823_refresh_condition_caches_after_same_day_reingestion.sql
\ir ../../supabase/migrations/20260824141111_schedule_condition_cache_publication.sql
-- Preserve restore pause state through migration.
select cron.alter_job(jobid, active := false) from cron.job;
\ir ../../supabase/migrations/20260913204140_separate_condition_publication_jobs.sql

do $$ begin
  if (select count(*) from cron.job) <> 2 or exists(select 1 from cron.job where active) then
    raise exception 'Migration lost paused state or left a legacy job';
  end if;
end $$;
-- The rollout gate must reject a disabled job.
\set ON_ERROR_STOP off
\ir ../../deploy/vps/verify-condition-publication.sql
\if :ERROR
\else
  \quit 1
\endif
\set ON_ERROR_STOP on
select cron.alter_job(jobid, active := true) from cron.job;
\ir ../../deploy/vps/verify-condition-publication.sql
-- Missing/wrong jobs also fail closed.
update cron.job set command = 'select 1' where jobname = 'refresh-spatial-condition-territorial';
\set ON_ERROR_STOP off
\ir ../../deploy/vps/verify-condition-publication.sql
\if :ERROR
\else
  \quit 1
\endif
\set ON_ERROR_STOP on
update cron.job set command = 'select public.refresh_territorial_level_conditions_after_ingestion(current_date);'
where jobname = 'refresh-spatial-condition-territorial';

-- Incomplete ingestion must not publish, including one completed stream.
select public.refresh_spatial_level_conditions_after_ingestion(current_date);
insert into public.pipeline_cursors values ('spatial-atmosphere', current_date, '__complete__', now() - interval '1 hour');
select public.refresh_territorial_level_conditions_after_ingestion(current_date);
do $$ begin
  if exists(select 1 from public.publication_test_calls) then raise exception 'Published incomplete input'; end if;
end $$;
insert into public.pipeline_cursors values ('spatial-soil', current_date, '__complete__', now() - interval '1 hour');

-- Execute each scheduled command separately, as independent cron jobs do.
select command from cron.job where jobname = 'refresh-spatial-condition-coarse' \gexec
update public.publication_test_failure set enabled = true;
\set ON_ERROR_STOP off
select command from cron.job where jobname = 'refresh-spatial-condition-territorial' \gexec
\if :ERROR
\else
  \quit 1
\endif
\set ON_ERROR_STOP on
do $$ begin
  if (select count(*) from public.publication_test_calls) <> 3
    or not exists(select 1 from public.pipeline_cursors where pipeline = 'spatial-condition-coarse')
    or exists(select 1 from public.pipeline_cursors where pipeline = 'spatial-condition-territorial') then
    raise exception 'Territorial failure corrupted independent coarse publication';
  end if;
end $$;
update public.publication_test_failure set enabled = false;
select command from cron.job order by jobname \gexec
select command from cron.job order by jobname \gexec
do $$ begin
  if (select count(*) from public.publication_test_calls) <> 4 then raise exception 'Publication retry is not idempotent'; end if;
end $$;
-- A same-day changed generation republishes both groups.
update public.pipeline_cursors set updated_at = clock_timestamp() where pipeline = 'spatial-atmosphere';
select command from cron.job order by jobname \gexec
do $$ begin
  if (select count(*) from public.publication_test_calls) <> 8 then raise exception 'Same-day generation did not republish'; end if;
end $$;
-- The common lock prevents overlapping heavy work in a separate session.
select dblink_connect('publication_lock', 'dbname=postgres user=postgres');
select * from dblink('publication_lock', 'select 1 from pg_advisory_lock(91600347)') as locked(ok integer);
update public.pipeline_cursors set updated_at = clock_timestamp() where pipeline = 'spatial-atmosphere';
select command from cron.job order by jobname \gexec
do $$ begin
  if (select count(*) from public.publication_test_calls) <> 8 then raise exception 'Publication ignored the shared work lock'; end if;
end $$;
select dblink_disconnect('publication_lock');
select command from cron.job order by jobname \gexec
do $$ begin
  if (select count(*) from public.publication_test_calls) <> 12 then raise exception 'Publication did not recover after contention'; end if;
  if has_function_privilege('anon', 'public.refresh_territorial_level_conditions_after_ingestion(date)', 'execute')
    or has_function_privilege('authenticated', 'public.refresh_territorial_level_conditions_after_ingestion(date)', 'execute')
    or not has_function_privilege('service_role', 'public.refresh_territorial_level_conditions_after_ingestion(date)', 'execute') then
    raise exception 'Publication RPC privileges changed';
  end if;
end $$;

-- Also exercise an active installation, not just the paused restore path.
\ir ../../supabase/migrations/20260823180823_refresh_condition_caches_after_same_day_reingestion.sql
select cron.unschedule(jobid) from cron.job;
\ir ../../supabase/migrations/20260824141111_schedule_condition_cache_publication.sql
\ir ../../supabase/migrations/20260913204140_separate_condition_publication_jobs.sql
\ir ../../deploy/vps/verify-condition-publication.sql
