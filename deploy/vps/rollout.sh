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
instagram_env_file=${BOLETS_INSTAGRAM_ENV_FILE:-/opt/bolets/secrets/instagram.env}
supabase_env_file="$supabase_dir/.env"

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

# These HMAC keys are local to this host: generate them once in the existing
# root-only environment instead of making a release depend on copied secrets.
ensure_local_status_secret() (
  key=$1
  count=$(grep -c "^${key}=" "$status_env_file" || true)
  if [ "$count" -gt 1 ]; then
    echo "The status environment must contain at most one ${key} entry" >&2
    exit 78
  fi
  if [ "$count" -eq 1 ]; then
    value=$(sed -n "s/^${key}=//p" "$status_env_file")
    if [ -z "$value" ]; then
      echo "The status environment contains an empty ${key} entry" >&2
      exit 78
    fi
    exit 0
  fi
  if ! command -v openssl >/dev/null 2>&1; then
    echo "OpenSSL is required to generate ${key}" >&2
    exit 69
  fi
  umask 077
  printf '%s=%s\n' "$key" "$(openssl rand -hex 32)" >> "$status_env_file"
  echo "Generated the missing host-local ${key}"
)

ensure_local_status_secret CONTRIBUTOR_ACCESS_SECRET
ensure_local_status_secret ABUSE_RATE_LIMIT_SECRET

if [ -f "$instagram_env_file" ] &&
   find "$instagram_env_file" -perm /077 -print -quit | grep -q .; then
  echo "The Instagram environment file must not be accessible by group or other users" >&2
  exit 77
fi

read_supabase_env() {
  key=$1
  count=$(grep -c "^${key}=" "$supabase_env_file" || true)
  if [ "$count" -ne 1 ]; then
    echo "The Supabase environment must contain exactly one ${key} entry" >&2
    exit 78
  fi
  sed -n "s/^${key}=//p" "$supabase_env_file"
}

app_domain=$(read_supabase_env APP_DOMAIN)
api_domain=$(read_supabase_env API_DOMAIN)
site_url=$(read_supabase_env SITE_URL)
api_external_url=$(read_supabase_env API_EXTERNAL_URL)
redirect_urls=$(read_supabase_env ADDITIONAL_REDIRECT_URLS)

if [ "$site_url" != "https://${app_domain}" ]; then
  echo "SITE_URL must match the production application domain" >&2
  exit 78
fi

if [ "$api_external_url" != "https://${api_domain}/auth/v1" ]; then
  echo "API_EXTERNAL_URL must include the production /auth/v1 path" >&2
  exit 78
fi

for callback_url in "$site_url/auth/callback" "https://www.${app_domain}/auth/callback"; do
  case ",$redirect_urls," in
    *",$callback_url,"*) ;;
    *)
      echo "ADDITIONAL_REDIRECT_URLS must allow $callback_url" >&2
      exit 78
      ;;
  esac
done

if [ "$(read_supabase_env DISABLE_SIGNUP)" != "false" ]; then
  echo "DISABLE_SIGNUP must be false for Google and passwordless accounts" >&2
  exit 78
fi

if [ "$(read_supabase_env ENABLE_EMAIL_SIGNUP)" != "true" ]; then
  echo "ENABLE_EMAIL_SIGNUP must be true for passwordless accounts" >&2
  exit 78
fi

google_enabled=$(read_supabase_env GOOGLE_ENABLED)
if [ "$google_enabled" = "true" ]; then
  if [ -z "$(read_supabase_env GOOGLE_CLIENT_ID)" ] ||
     [ -z "$(read_supabase_env GOOGLE_SECRET)" ]; then
    echo "Google OAuth credentials are required when GOOGLE_ENABLED=true" >&2
    exit 78
  fi
elif [ "$google_enabled" != "false" ]; then
  echo "GOOGLE_ENABLED must be true or false" >&2
  exit 78
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
: "${STATUS_INTERNAL_TOKEN:?Set STATUS_INTERNAL_TOKEN in the status environment file}"
: "${CONTRIBUTOR_ACCESS_SECRET:?Set CONTRIBUTOR_ACCESS_SECRET in the status environment file}"
: "${TURNSTILE_SITE_KEY:?Set TURNSTILE_SITE_KEY in the status environment file}"
: "${TURNSTILE_SECRET_KEY:?Set TURNSTILE_SECRET_KEY in the status environment file}"
: "${ABUSE_RATE_LIMIT_SECRET:?Set ABUSE_RATE_LIMIT_SECRET in the status environment file}"

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

if [ -f "$instagram_env_file" ]; then
  install -m 644 "$app_dir/deploy/vps/bolets-instagram-growth@.service" /etc/systemd/system/
  install -m 644 "$app_dir/deploy/vps/bolets-instagram-education.timer" /etc/systemd/system/
  install -m 644 "$app_dir/deploy/vps/bolets-instagram-species.timer" /etc/systemd/system/
  install -m 644 "$app_dir/deploy/vps/bolets-instagram-weekend.timer" /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable --now \
    bolets-instagram-education.timer \
    bolets-instagram-species.timer \
    bolets-instagram-weekend.timer
fi

echo "Bolets rollout completed"
