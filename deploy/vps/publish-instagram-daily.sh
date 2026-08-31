#!/bin/sh
set -eu

instagram_env_file=${BOLETS_INSTAGRAM_ENV_FILE:-/opt/bolets/secrets/instagram.env}
if [ ! -f "$instagram_env_file" ]; then
  echo "Instagram environment file is missing" >&2
  exit 66
fi
if find "$instagram_env_file" -perm /077 -print -quit | grep -q .; then
  echo "The Instagram environment file must not be accessible by group or other users" >&2
  exit 77
fi

set -a
# This file is root-controlled and limited to simple KEY=value assignments.
# shellcheck disable=SC1090
. "$instagram_env_file"
set +a

: "${INSTAGRAM_PUBLISH_SECRET:?Set INSTAGRAM_PUBLISH_SECRET}"

curl \
  --fail-with-body \
  --silent \
  --show-error \
  --max-time 90 \
  --request POST \
  --header "Authorization: Bearer ${INSTAGRAM_PUBLISH_SECRET}" \
  https://bolets.app/api/internal/instagram/daily
printf '\n'
