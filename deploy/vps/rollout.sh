#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 /absolute/path/to/bolets /absolute/path/to/supabase-project" >&2
  exit 64
fi

app_dir=$1
supabase_dir=$2
override_file="$app_dir/deploy/vps/compose.yaml"
umami_env_file=${BOLETS_UMAMI_ENV_FILE:-/opt/bolets/secrets/umami.env}

if [ ! -f "$app_dir/Dockerfile" ] || [ ! -f "$supabase_dir/docker-compose.yml" ] ||
   [ ! -f "$supabase_dir/.env" ] || [ ! -f "$override_file" ] ||
   [ ! -x "$app_dir/deploy/vps/apply-database-migrations.sh" ] ||
   [ ! -f "$umami_env_file" ]; then
  echo "Bolets or Supabase deployment directory is invalid" >&2
  exit 66
fi

if find "$umami_env_file" -perm /077 -print -quit | grep -q .; then
  echo "The Umami environment file must not be accessible by group or other users" >&2
  exit 77
fi

set -a
# This file is root-controlled and limited to simple KEY=value assignments.
# shellcheck disable=SC1090
. "$umami_env_file"
set +a

: "${UMAMI_WEBSITE_ID:?Set UMAMI_WEBSITE_ID in the Umami environment file}"
: "${UMAMI_ADMIN_PASSWORD:?Set UMAMI_ADMIN_PASSWORD in the Umami environment file}"

# The official stack reads its default from /opt/bolets/supabase/.env. Override
# it per release so a candidate can be built and health-checked before the
# stable /opt/bolets/app symlink moves.
export BOLETS_APP_DIR=$app_dir

cd "$supabase_dir"
docker compose -f docker-compose.yml -f "$override_file" config --quiet
docker compose -f docker-compose.yml -f "$override_file" build app
"$app_dir/deploy/vps/apply-database-migrations.sh" "$app_dir"
"$app_dir/deploy/vps/sync-functions.sh" "$app_dir" "$supabase_dir"
docker compose -f docker-compose.yml -f "$override_file" up -d --wait
"$app_dir/deploy/vps/bootstrap-umami.sh"
# Function code is mounted and loaded per request, but restart once so no old
# worker remains alive across a rollout.
docker compose -f docker-compose.yml -f "$override_file" restart functions

echo "Bolets rollout completed"
