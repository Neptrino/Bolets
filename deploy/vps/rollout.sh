#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 /absolute/path/to/bolets /absolute/path/to/supabase-project" >&2
  exit 64
fi

app_dir=$1
supabase_dir=$2
override_file="$app_dir/deploy/vps/compose.yaml"
observability_override_file="$app_dir/deploy/vps/compose.observability.yaml"
umami_env_file=${BOLETS_UMAMI_ENV_FILE:-/opt/bolets/secrets/umami.env}
status_env_file=${BOLETS_STATUS_ENV_FILE:-/opt/bolets/secrets/status.env}
observability_env_file=${BOLETS_OBSERVABILITY_ENV_FILE:-/opt/bolets/secrets/observability.env}

if [ ! -f "$app_dir/Dockerfile" ] || [ ! -f "$supabase_dir/docker-compose.yml" ] ||
   [ ! -f "$supabase_dir/.env" ] || [ ! -f "$override_file" ] ||
   [ ! -x "$app_dir/deploy/vps/apply-database-migrations.sh" ] ||
   [ ! -f "$umami_env_file" ] || [ ! -f "$status_env_file" ]; then
  echo "Bolets or Supabase deployment directory is invalid" >&2
  exit 66
fi

if find "$umami_env_file" -perm /077 -print -quit | grep -q .; then
  echo "The Umami environment file must not be accessible by group or other users" >&2
  exit 77
fi

if find "$status_env_file" -perm /077 -print -quit | grep -q .; then
  echo "The status environment file must not be accessible by group or other users" >&2
  exit 77
fi

set -a
# This file is root-controlled and limited to simple KEY=value assignments.
# shellcheck disable=SC1090
. "$umami_env_file"
# shellcheck disable=SC1090
. "$status_env_file"
set +a

: "${UMAMI_WEBSITE_ID:?Set UMAMI_WEBSITE_ID in the Umami environment file}"
: "${UMAMI_ADMIN_PASSWORD:?Set UMAMI_ADMIN_PASSWORD in the Umami environment file}"
: "${STATUS_USERNAME:?Set STATUS_USERNAME in the status environment file}"
: "${STATUS_PASSWORD_HASH:?Set STATUS_PASSWORD_HASH in the status environment file}"
: "${STATUS_INTERNAL_TOKEN:?Set STATUS_INTERNAL_TOKEN in the status environment file}"

compose_files="-f docker-compose.yml -f $override_file"
if [ -f "$observability_env_file" ]; then
  if [ ! -f "$observability_override_file" ]; then
    echo "The observability override is missing" >&2
    exit 66
  fi
  if find "$observability_env_file" -perm /077 -print -quit | grep -q .; then
    echo "The observability environment file must not be accessible by group or other users" >&2
    exit 77
  fi
  set -a
  # shellcheck disable=SC1090
  . "$observability_env_file"
  set +a
  : "${GRAFANA_CLOUD_PROMETHEUS_URL:?Set the Grafana Cloud Prometheus URL}"
  : "${GRAFANA_CLOUD_PROMETHEUS_USERNAME:?Set the Grafana Cloud Prometheus username}"
  : "${GRAFANA_CLOUD_LOKI_URL:?Set the Grafana Cloud Loki URL}"
  : "${GRAFANA_CLOUD_LOKI_USERNAME:?Set the Grafana Cloud Loki username}"
  : "${GRAFANA_CLOUD_API_TOKEN:?Set the Grafana Cloud access policy token}"
  compose_files="$compose_files -f $observability_override_file"
fi

# The official stack reads its default from /opt/bolets/supabase/.env. Override
# it per release so a candidate can be built and health-checked before the
# stable /opt/bolets/app symlink moves.
export BOLETS_APP_DIR=$app_dir

cd "$supabase_dir"
# compose_files is assembled only from the fixed, validated paths above.
# shellcheck disable=SC2086
docker compose $compose_files config --quiet
# shellcheck disable=SC2086
docker compose $compose_files build app
"$app_dir/deploy/vps/apply-database-migrations.sh" "$app_dir"
"$app_dir/deploy/vps/sync-functions.sh" "$app_dir" "$supabase_dir"
# shellcheck disable=SC2086
docker compose $compose_files up -d --wait
"$app_dir/deploy/vps/bootstrap-umami.sh"
# Function code is mounted and loaded per request, but restart once so no old
# worker remains alive across a rollout.
# shellcheck disable=SC2086
docker compose $compose_files restart functions

# The daily overview combines 33 bounded territorial reads on a cold Next.js
# data cache. Prime it in the candidate container so the first visitor after a
# deployment receives the ready board instead of paying that rebuild cost.
echo "Warming the daily overview cache"
docker compose -f docker-compose.yml -f "$override_file" exec -T app node -e '
  const signal = AbortSignal.timeout(90_000);
  fetch("http://127.0.0.1:3000/bolets-avui", { signal })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Daily overview returned ${response.status}`);
      await response.text();
    })
    .catch((error) => {
      console.error(`Daily overview cache warm failed: ${error.message}`);
      process.exit(1);
    });
'

echo "Bolets rollout completed"
