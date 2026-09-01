#!/bin/sh
set -eu

publication_kind=${1:-}
case "$publication_kind" in
  education|weekend) ;;
  *)
    echo "Expected publication kind: education or weekend" >&2
    exit 64
    ;;
esac

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

docker exec -i -e BOLETS_INSTAGRAM_PUBLICATION_KIND="$publication_kind" "$app_container" node --input-type=module - <<'NODE'
const secret = process.env.INSTAGRAM_PUBLISH_SECRET;
const kind = process.env.BOLETS_INSTAGRAM_PUBLICATION_KIND;
if (!secret || !kind) {
  console.error("Instagram publication environment is incomplete");
  process.exit(78);
}

const response = await fetch("http://127.0.0.1:3000/api/internal/instagram/growth", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ kind }),
  signal: AbortSignal.timeout(90_000),
});
const body = await response.text();
console.log(body);
if (!response.ok) process.exit(1);
NODE
