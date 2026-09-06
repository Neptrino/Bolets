#!/bin/sh
set -eu
umask 077

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 /absolute/path/to/supabase-project /absolute/path/to/backup-directory" >&2
  exit 64
fi

supabase_dir=$1
backup_root=$2
app_dir=${BOLETS_APP_DIR:-/opt/bolets/app}
override_file="$app_dir/deploy/vps/compose.yaml"
umami_env_file=${BOLETS_UMAMI_ENV_FILE:-/opt/bolets/secrets/umami.env}

if [ ! -f "$supabase_dir/docker-compose.yml" ] || [ ! -f "$supabase_dir/.env" ] ||
   [ ! -f "$override_file" ] || [ ! -f "$umami_env_file" ]; then
  echo "Supabase project directory is invalid" >&2
  exit 66
fi

if find "$umami_env_file" -perm /077 -print -quit | grep -q .; then
  echo "The Umami environment file must not be accessible by group or other users" >&2
  exit 77
fi

set -a
# shellcheck disable=SC1090
. "$umami_env_file"
set +a
# shellcheck source=deploy/vps/load-release-image.sh
. "$app_dir/deploy/vps/load-release-image.sh"

compose() {
  docker compose -f docker-compose.yml -f "$override_file" "$@"
}

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir="$backup_root/$timestamp"
mkdir -p "$backup_dir"

cd "$supabase_dir"
storage_stopped=false
restart_storage() {
  if [ "$storage_stopped" = true ]; then
    compose start storage >/dev/null
  fi
}
trap restart_storage EXIT INT TERM

# Freeze Storage briefly so its database metadata and local object tree do not
# change independently during the backup.
compose stop storage >/dev/null
storage_stopped=true

postgres_password=$(docker exec supabase-db printenv POSTGRES_PASSWORD)
postgres_db=$(docker exec supabase-db printenv POSTGRES_DB)

docker exec -e PGPASSWORD="$postgres_password" supabase-db \
  pg_dump --username postgres --dbname "$postgres_db" --format custom \
  --file "/tmp/bolets-$timestamp.dump"
docker cp "supabase-db:/tmp/bolets-$timestamp.dump" "$backup_dir/postgres.dump"
docker exec supabase-db rm "/tmp/bolets-$timestamp.dump"

# Umami uses a dedicated PostgreSQL service so its schema cannot be exposed by
# the Supabase Data API. A custom-format dump keeps analytics independently
# restorable without copying the live database volume.
compose exec -T -e PGPASSWORD="$UMAMI_DATABASE_PASSWORD" umami-db \
  pg_dump --username umami --dbname umami --format custom \
  > "$backup_dir/umami.dump"

tar -C "$supabase_dir" -czf "$backup_dir/storage.tar.gz" volumes/storage
sha256sum "$backup_dir/postgres.dump" "$backup_dir/umami.dump" \
  "$backup_dir/storage.tar.gz" > "$backup_dir/SHA256SUMS"

compose start storage >/dev/null
storage_stopped=false
trap - EXIT INT TERM

echo "Created $backup_dir"
