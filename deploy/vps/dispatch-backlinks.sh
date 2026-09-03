#!/bin/sh
set -eu

backlink_env_file=${BOLETS_BACKLINK_ENV_FILE:-/opt/bolets/secrets/backlink.env}
if [ ! -f "$backlink_env_file" ]; then
  echo "Backlink automation environment file is missing" >&2
  exit 66
fi
if find "$backlink_env_file" -perm /077 -print -quit | grep -q .; then
  echo "The backlink environment file must not be accessible by group or other users" >&2
  exit 77
fi

app_containers=$(docker ps \
  --filter label=com.docker.compose.project=supabase \
  --filter label=com.docker.compose.service=app \
  --filter status=running \
  --format '{{.ID}}')
set -- $app_containers
if [ "$#" -ne 1 ]; then
  echo "Expected exactly one running Bolets app container" >&2
  exit 69
fi

docker exec -i "$1" node --input-type=module - <<'NODE'
const token = process.env.STATUS_INTERNAL_TOKEN;
if (!token) {
  console.error("STATUS_INTERNAL_TOKEN is missing from the app container");
  process.exit(78);
}
const response = await fetch("http://127.0.0.1:3000/api/internal/backlinks", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(1_200_000),
});
console.log(await response.text());
if (!response.ok) process.exit(1);
NODE
