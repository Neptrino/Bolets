#!/bin/sh
set -eu
umask 077

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 /absolute/path/to/supabase-project /absolute/path/to/backup-directory" >&2
  exit 64
fi

supabase_dir=$1
backup_root=$2

if [ ! -f "$supabase_dir/docker-compose.yml" ] || [ ! -f "$supabase_dir/.env" ]; then
  echo "Supabase project directory is invalid" >&2
  exit 66
fi

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir="$backup_root/$timestamp"
mkdir -p "$backup_dir"

cd "$supabase_dir"
storage_stopped=false
restart_storage() {
  if [ "$storage_stopped" = true ]; then
    docker compose start storage >/dev/null
  fi
}
trap restart_storage EXIT INT TERM

# Freeze Storage briefly so its database metadata and local object tree do not
# change independently during the backup.
docker compose stop storage >/dev/null
storage_stopped=true

postgres_password=$(docker exec supabase-db printenv POSTGRES_PASSWORD)
postgres_db=$(docker exec supabase-db printenv POSTGRES_DB)

docker exec -e PGPASSWORD="$postgres_password" supabase-db \
  pg_dump --username postgres --dbname "$postgres_db" --format custom \
  --file "/tmp/bolets-$timestamp.dump"
docker cp "supabase-db:/tmp/bolets-$timestamp.dump" "$backup_dir/postgres.dump"
docker exec supabase-db rm "/tmp/bolets-$timestamp.dump"

tar -C "$supabase_dir" -czf "$backup_dir/storage.tar.gz" volumes/storage
sha256sum "$backup_dir/postgres.dump" "$backup_dir/storage.tar.gz" > "$backup_dir/SHA256SUMS"

docker compose start storage >/dev/null
storage_stopped=false
trap - EXIT INT TERM

echo "Created $backup_dir"
