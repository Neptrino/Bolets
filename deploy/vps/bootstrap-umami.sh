#!/bin/sh
set -eu
umask 077

: "${UMAMI_WEBSITE_ID:?UMAMI_WEBSITE_ID is required}"
: "${UMAMI_ADMIN_PASSWORD:?UMAMI_ADMIN_PASSWORD is required}"

if ! printf '%s\n' "$UMAMI_WEBSITE_ID" |
  grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'; then
  echo "UMAMI_WEBSITE_ID must be a lowercase UUID" >&2
  exit 65
fi

if [ "${#UMAMI_ADMIN_PASSWORD}" -lt 16 ]; then
  echo "UMAMI_ADMIN_PASSWORD must contain at least 16 characters" >&2
  exit 65
fi

umami_api_url=${UMAMI_API_URL:-http://127.0.0.1:${UMAMI_HTTP_PORT:-3001}}
response_file=$(mktemp)
cleanup() {
  rm -f -- "$response_file"
}
trap cleanup EXIT HUP INT TERM

login() {
  login_password=$1
  jq -nc --arg username admin --arg password "$login_password" \
    '{username: $username, password: $password}' |
    curl --silent --show-error \
      --header 'Content-Type: application/json' \
      --data-binary @- \
      "$umami_api_url/api/auth/login" |
    jq -er '.token'
}

token=$(login "$UMAMI_ADMIN_PASSWORD" 2>/dev/null || true)
if [ -z "$token" ]; then
  token=$(login umami 2>/dev/null || true)
  if [ -z "$token" ]; then
    echo "Could not authenticate with either the configured or bootstrap Umami password" >&2
    exit 77
  fi

  jq -nc --arg currentPassword umami --arg newPassword "$UMAMI_ADMIN_PASSWORD" \
    '{currentPassword: $currentPassword, newPassword: $newPassword}' |
    curl --fail-with-body --silent --show-error \
      --header 'Content-Type: application/json' \
      --header "Authorization: Bearer $token" \
      --data-binary @- \
      "$umami_api_url/api/me/password" >/dev/null

  token=$(login "$UMAMI_ADMIN_PASSWORD")
fi

status_code=$(curl --silent --show-error \
  --output "$response_file" \
  --write-out '%{http_code}' \
  --header "Authorization: Bearer $token" \
  "$umami_api_url/api/websites/$UMAMI_WEBSITE_ID")

if [ "$status_code" = 200 ] &&
   jq -e --arg id "$UMAMI_WEBSITE_ID" --arg domain bolets.app \
     '.id == $id and .domain == $domain' "$response_file" >/dev/null; then
  echo "Umami administrator and Bolets website are configured"
  exit 0
fi

if [ "$status_code" != 404 ] && ! jq -e '. == null' "$response_file" >/dev/null 2>&1; then
  echo "Unexpected response while checking the Umami website: HTTP $status_code" >&2
  exit 69
fi

jq -nc --arg id "$UMAMI_WEBSITE_ID" --arg name Bolets --arg domain bolets.app \
  '{id: $id, name: $name, domain: $domain}' |
  curl --fail-with-body --silent --show-error \
    --header 'Content-Type: application/json' \
    --header "Authorization: Bearer $token" \
    --data-binary @- \
    "$umami_api_url/api/websites" >/dev/null

echo "Umami administrator and Bolets website are configured"
