#!/bin/sh
set -eu
containers=$(docker ps --filter label=com.docker.compose.project=supabase \
  --filter label=com.docker.compose.service=app --filter status=running --format '{{.ID}}')
set -- $containers
if [ "$#" -ne 1 ]; then
  echo "Expected exactly one running Bolets app container" >&2
  exit 69
fi
docker exec -i "$1" node --input-type=module - <<'NODE'
const token = process.env.CACHE_WARM_SECRET;
if (!token) throw new Error("Internal warming credential is missing");
const response = await fetch("http://127.0.0.1:3000/api/internal/warm-map-cache", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(120_000),
});
if (!response.ok) throw new Error(`Map warming returned ${response.status}`);
const result = await response.json();
if (result.status !== "unchanged") console.log(JSON.stringify(result));
if (result.status === "incomplete") process.exitCode = 1;
NODE
