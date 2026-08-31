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
app_container=$1

# Caddy intentionally blocks /api/internal/* from the public internet. Run the
# authenticated request inside the app container, where the root-only env file
# has already been loaded by Compose.
docker exec -i "$app_container" node --input-type=module - <<'NODE'
const secret = process.env.INSTAGRAM_PUBLISH_SECRET;
if (!secret) {
  console.error("INSTAGRAM_PUBLISH_SECRET is missing from the app container");
  process.exit(78);
}

const response = await fetch("http://127.0.0.1:3000/api/internal/instagram/daily", {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(90_000),
});
const body = await response.text();
console.log(body);
if (!response.ok) process.exit(1);
NODE
