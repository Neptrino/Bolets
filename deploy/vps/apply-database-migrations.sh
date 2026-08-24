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
operational_status_migration="$app_dir/supabase/migrations/20260824143000_add_operational_status_reader.sql"

if [ ! -f "$rolling_migration" ] || [ ! -f "$parallel_migration" ] ||
   [ ! -f "$aws_lane_migration" ] || [ ! -f "$operational_status_migration" ]; then
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

operational_status_installed=$(docker exec supabase-db psql \
  --username postgres \
  --dbname postgres \
  --tuples-only \
  --no-align \
  --command "select coalesce(to_regprocedure('public.read_operational_status()')::text, '');")

if [ "$operational_status_installed" = "read_operational_status()" ]; then
  echo "Operational-status database migration is already installed"
else
  docker exec -i supabase-db psql \
    --username postgres \
    --dbname postgres \
    --set ON_ERROR_STOP=1 \
    --single-transaction \
    < "$operational_status_migration"
  echo "Applied operational-status database migration"
fi
