#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /absolute/path/to/bolets" >&2
  exit 64
fi

app_dir=$1
migration_dir="$app_dir/supabase/migrations"
baseline_verifier="$app_dir/deploy/vps/verify-restored-migration-baseline.sql"
db_container=${BOLETS_DB_CONTAINER:-supabase-db}
db_name=${BOLETS_DB_NAME:-postgres}

# The final managed-project restore and the former manual installer were
# verified through this migration. This fixed boundary is used exactly once to
# adopt the restored schema into the standard Supabase migration ledger.
restored_baseline_version=20260901151545
restored_baseline_count=121

if [ ! -d "$migration_dir" ] || [ ! -f "$baseline_verifier" ]; then
  echo "The database migration directory or restored-schema verifier is missing" >&2
  exit 66
fi

if ! docker inspect "$db_container" >/dev/null 2>&1; then
  echo "The Supabase database container is not running" >&2
  exit 69
fi

psql_query() {
  docker exec "$db_container" psql \
    --username postgres \
    --dbname "$db_name" \
    --tuples-only \
    --no-align \
    --set ON_ERROR_STOP=1 \
    --command "$1"
}

psql_input() {
  docker exec -i "$db_container" psql \
    --username postgres \
    --dbname "$db_name" \
    --set ON_ERROR_STOP=1
}

migration_files=$(find "$migration_dir" -maxdepth 1 -type f -name '*.sql' -print | LC_ALL=C sort)
if [ -z "$migration_files" ]; then
  echo "No database migrations were found" >&2
  exit 66
fi

migration_count=0
previous_version=
for migration in $migration_files; do
  filename=$(basename "$migration")
  version=${filename%%_*}
  name=${filename#*_}
  name=${name%.sql}

  if ! printf '%s\n' "$version" | grep -Eq '^[0-9]{14}$' ||
     ! printf '%s\n' "$name" | grep -Eq '^[a-z0-9_]+$'; then
    echo "Invalid database migration filename: $filename" >&2
    exit 65
  fi
  if [ -n "$previous_version" ] && [ "$version" -le "$previous_version" ]; then
    echo "Database migration versions must be unique and increasing" >&2
    exit 65
  fi

  previous_version=$version
  migration_count=$((migration_count + 1))
done

# Match the table used by the Supabase CLI so `migration list`, `repair`, and
# `db push` see the same authoritative production history.
psql_input <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

ledger_shape=$(psql_query "
  select count(*)
  from information_schema.columns
  where table_schema = 'supabase_migrations'
    and table_name = 'schema_migrations'
    and (
      (column_name = 'version' and data_type = 'text')
      or (column_name = 'statements' and data_type = 'ARRAY')
      or (column_name = 'name' and data_type = 'text')
    );")
if [ "$ledger_shape" -ne 3 ]; then
  echo "The Supabase migration ledger has an unexpected shape" >&2
  exit 70
fi

baseline_recorded=$(psql_query "
  select exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '$restored_baseline_version'
  );")
restore_marker_count=$(psql_query "
  select
    (to_regclass('public.environment_snapshots') is not null)::integer
    + (to_regclass('public.weather_grid_snapshots') is not null)::integer
    + (to_regclass('public.coarse_species_habitat_cells') is not null)::integer;")

if [ "$baseline_recorded" != "t" ] && [ "$restore_marker_count" -eq 3 ]; then
  # A physical restore contains the application schema but may have an empty
  # or historical CLI ledger. Verify the known post-restore contracts before
  # filling the fixed baseline; never infer it from a single table.
  psql_input < "$baseline_verifier"

  baseline_count=0
  for migration in $migration_files; do
    filename=$(basename "$migration")
    version=${filename%%_*}
    if [ "$version" -le "$restored_baseline_version" ]; then
      baseline_count=$((baseline_count + 1))
    fi
  done
  if [ "$baseline_count" -ne "$restored_baseline_count" ]; then
    echo "The restored migration baseline inventory has changed" >&2
    exit 70
  fi

  {
    printf '%s\n' 'begin;'
    printf "%s\n" "select pg_advisory_xact_lock(hashtextextended('bolets-schema-migrations', 0));"
    for migration in $migration_files; do
      filename=$(basename "$migration")
      version=${filename%%_*}
      name=${filename#*_}
      name=${name%.sql}
      if [ "$version" -le "$restored_baseline_version" ]; then
        printf "insert into supabase_migrations.schema_migrations (version, statements, name) values ('%s', array[]::text[], '%s') on conflict (version) do nothing;\n" \
          "$version" "$name"
      fi
    done
    printf '%s\n' 'commit;'
  } | psql_input
  echo "Recorded verified restored migration baseline through $restored_baseline_version"
elif [ "$baseline_recorded" != "t" ] && [ "$restore_marker_count" -ne 0 ]; then
  echo "The database has a partial untracked Bolets schema; refusing to guess its migration history" >&2
  exit 70
fi

applied_versions=$(psql_query "select version from supabase_migrations.schema_migrations order by version;")

version_is_applied() {
  printf '%s\n' "$applied_versions" | grep -Fxq "$1"
}

# Remote-only versions indicate edited or deleted migration history. Stop
# before changing the schema so the mismatch can be reconciled deliberately.
for applied_version in $applied_versions; do
  matching_files=$(find "$migration_dir" -maxdepth 1 -type f -name "${applied_version}_*.sql" -print | wc -l | tr -d ' ')
  if [ "$matching_files" -ne 1 ]; then
    echo "Production records migration $applied_version, but the repository does not contain exactly one matching file" >&2
    exit 70
  fi
done

# Applied history must be a contiguous prefix. This prevents a restored or
# manually repaired database from replaying an old migration underneath newer
# schema changes.
missing_seen=false
for migration in $migration_files; do
  filename=$(basename "$migration")
  version=${filename%%_*}
  if version_is_applied "$version"; then
    if [ "$missing_seen" = true ]; then
      echo "The Supabase migration ledger is non-contiguous before $version" >&2
      exit 70
    fi
  else
    missing_seen=true
  fi
done

for migration in $migration_files; do
  filename=$(basename "$migration")
  version=${filename%%_*}
  name=${filename#*_}
  name=${name%.sql}

  if version_is_applied "$version"; then
    continue
  fi

  echo "Applying database migration $filename"
  {
    printf '%s\n' '\set ON_ERROR_STOP on'
    printf '%s\n' 'begin;'
    printf "%s\n" "select pg_advisory_xact_lock(hashtextextended('bolets-schema-migrations', 0));"
    printf "%s\n" "select not exists (select 1 from supabase_migrations.schema_migrations where version = '$version') as migration_missing \\gset"
    printf '%s\n' '\if :migration_missing'
    cat "$migration"
    printf "\ninsert into supabase_migrations.schema_migrations (version, statements, name) values ('%s', array[]::text[], '%s');\n" \
      "$version" "$name"
    printf '%s\n' '\else'
    printf '%s\n' "\echo Migration $version was applied by another rollout"
    printf '%s\n' '\endif'
    printf '%s\n' 'commit;'
  } | psql_input

  applied_versions="${applied_versions}
${version}"
done

final_count=$(psql_query "select count(*) from supabase_migrations.schema_migrations;")
if [ "$final_count" -ne "$migration_count" ]; then
  echo "The production migration ledger does not match the repository inventory" >&2
  exit 70
fi

echo "Database migrations are synchronized ($final_count applied)"
