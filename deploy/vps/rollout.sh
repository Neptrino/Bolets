#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 /absolute/path/to/bolets /absolute/path/to/supabase-project" >&2
  exit 64
fi

app_dir=$1
supabase_dir=$2
override_file="$app_dir/deploy/vps/compose.yaml"

if [ ! -f "$app_dir/Dockerfile" ] || [ ! -f "$supabase_dir/docker-compose.yml" ] ||
   [ ! -f "$supabase_dir/.env" ] || [ ! -f "$override_file" ]; then
  echo "Bolets or Supabase deployment directory is invalid" >&2
  exit 66
fi

# The official stack reads its default from /opt/bolets/supabase/.env. Override
# it per release so a candidate can be built and health-checked before the
# stable /opt/bolets/app symlink moves.
export BOLETS_APP_DIR=$app_dir

"$app_dir/deploy/vps/sync-functions.sh" "$app_dir" "$supabase_dir"

cd "$supabase_dir"
docker compose -f docker-compose.yml -f "$override_file" config --quiet
docker compose -f docker-compose.yml -f "$override_file" build app
docker compose -f docker-compose.yml -f "$override_file" up -d --wait
# Function code is mounted and loaded per request, but restart once so no old
# worker remains alive across a rollout.
docker compose -f docker-compose.yml -f "$override_file" restart functions

echo "Bolets rollout completed"
