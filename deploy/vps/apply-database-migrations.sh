#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /absolute/path/to/bolets" >&2
  exit 64
fi

app_dir=$1
rolling_migration="$app_dir/supabase/migrations/20260824061712_add_open_meteo_rolling_history.sql"
parallel_migration="$app_dir/supabase/migrations/20260824074556_parallel_spatial_ingestion.sql"
aws_lane_migration="$app_dir/supabase/migrations/20260824113000_add_aws_ingestion_lane.sql"
egress_circuit_migration="$app_dir/supabase/migrations/20260824114320_add_open_meteo_egress_circuit_breaker.sql"
unlimited_usage_migration="$app_dir/supabase/migrations/20260824125832_disable_local_open_meteo_limits.sql"
operational_status_migration="$app_dir/supabase/migrations/20260824143000_add_operational_status_reader.sql"
audit_reconciliation_migration="$app_dir/supabase/migrations/20260824135419_reconcile_spatial_job_audits.sql"
condition_cache_cron_migration="$app_dir/supabase/migrations/20260824141111_schedule_condition_cache_publication.sql"

if [ ! -f "$rolling_migration" ] || [ ! -f "$parallel_migration" ] ||
   [ ! -f "$aws_lane_migration" ] || [ ! -f "$egress_circuit_migration" ] ||
   [ ! -f "$unlimited_usage_migration" ] || [ ! -f "$operational_status_migration" ] ||
   [ ! -f "$audit_reconciliation_migration" ] || [ ! -f "$condition_cache_cron_migration" ]; then
  echo "A required ingestion migration is missing" >&2
  exit 66
fi

if ! docker inspect supabase-db >/dev/null 2>&1; then
  echo "The Supabase database container is not running" >&2
  exit 69
fi

# The managed-project restore predates a local migration ledger. Use one
# additive object from each migration as its marker instead of replaying the
# historical migration set that already exists in the restored schema.
apply_if_missing() {
  marker=$1
  migration=$2
  label=$3
  installed=$(docker exec supabase-db psql \
    --username postgres \
    --dbname postgres \
    --tuples-only \
    --no-align \
    --command "select coalesce(to_regclass('public.$marker')::text, '');")

  if [ "$installed" = "$marker" ]; then
    echo "$label database migration is already installed"
    return
  fi

  docker exec -i supabase-db psql \
    --username postgres \
    --dbname postgres \
    --set ON_ERROR_STOP=1 \
    --single-transaction \
    < "$migration"
  echo "Applied $label database migration"
}

apply_if_missing open_meteo_hourly_states "$rolling_migration" rolling-ingestion
apply_if_missing spatial_atmosphere_jobs "$parallel_migration" parallel-ingestion

aws_lane_installed=$(docker exec supabase-db psql \
  --username postgres \
  --dbname postgres \
  --tuples-only \
  --no-align \
  --command "select coalesce(pg_get_constraintdef(oid), '') from pg_constraint where conname = 'spatial_atmosphere_jobs_egress_lane_check';")

case "$aws_lane_installed" in
  *"'aws'"*)
    echo "AWS ingestion-lane database migration is already installed"
    ;;
  *)
    docker exec -i supabase-db psql \
      --username postgres \
      --dbname postgres \
      --set ON_ERROR_STOP=1 \
      --single-transaction \
      < "$aws_lane_migration"
    echo "Applied AWS ingestion-lane database migration"
    ;;
esac

apply_if_missing open_meteo_egress_lanes "$egress_circuit_migration" egress-circuit-breaker

usage_recorder_installed=$(docker exec supabase-db psql \
  --username postgres \
  --dbname postgres \
  --tuples-only \
  --no-align \
  --command "select coalesce(to_regprocedure('public.record_provider_usage(text,text,integer)')::text, '');")

if [ "$usage_recorder_installed" = "record_provider_usage(text,text,integer)" ]; then
  echo "Unlimited provider-usage recorder is already installed"
else
  docker exec -i supabase-db psql \
    --username postgres \
    --dbname postgres \
    --set ON_ERROR_STOP=1 \
    --single-transaction \
    < "$unlimited_usage_migration"
  echo "Applied unlimited provider-usage recorder"
fi

# Reapply the idempotent function replacement on every rollout. Its bounded
# cleanup also repairs abandoned audit rows left by workers from older builds.
docker exec -i supabase-db psql \
  --username postgres \
  --dbname postgres \
  --set ON_ERROR_STOP=1 \
  --single-transaction \
  < "$audit_reconciliation_migration"
echo "Applied spatial audit reconciliation"

# Recreate this one cheap database-local job on every rollout so scheduling
# changes are not hidden behind a restored cron catalogue.
docker exec -i supabase-db psql \
  --username postgres \
  --dbname postgres \
  --set ON_ERROR_STOP=1 \
  --single-transaction \
  < "$condition_cache_cron_migration"
echo "Applied condition-cache publication schedule"

# This migration is deliberately idempotent and contains only CREATE OR
# REPLACE plus grants. Reapply it so query-shape and redaction improvements are
# not hidden behind the function's existence on restored databases.
docker exec -i supabase-db psql \
  --username postgres \
  --dbname postgres \
  --set ON_ERROR_STOP=1 \
  --single-transaction \
  < "$operational_status_migration"
echo "Applied operational-status database boundary"
