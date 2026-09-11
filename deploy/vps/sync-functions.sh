#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 /absolute/path/to/bolets /absolute/path/to/supabase-project" >&2
  exit 64
fi

app_dir=$1
supabase_dir=$2
source_dir="$app_dir/supabase/functions"
target_dir="$supabase_dir/volumes/functions"

if [ ! -d "$source_dir" ] || [ ! -f "$target_dir/main/index.ts" ]; then
  echo "Expected Bolets functions and the upstream self-hosted main router" >&2
  exit 66
fi

# Preserve the upstream main router. It is versioned with the self-hosted
# Supabase release, while every other function is owned by this repository.
find "$target_dir" -mindepth 1 -maxdepth 1 ! -name main -exec rm -rf -- {} +
cp -R "$source_dir"/. "$target_dir"/

# Bolets cron calls allow up to 120 seconds. The self-hosted runtime defaults
# to 60 seconds, so keep a small completion margin. Fail closed after an
# upstream update if the documented tuning point changes shape.
main_router="$target_dir/main/index.ts"
# Give the spatial reader room for full-network frozen station windows. Bound
# request concurrency in the function too; raising this alone cannot stop bursts.
# Leave ingestion and every other worker at the upstream 150 MiB limit.
memory_tuning='  const memoryLimitMb = service_name === "read-spatial-environment" ? 512 : 150'
if grep -q '^  const memoryLimitMb = 150$' "$main_router" &&
   grep -Fq 'const service_name = path_parts[1]' "$main_router"; then
  sed -i.bak "s/^  const memoryLimitMb = 150\$/$memory_tuning/" "$main_router"
  rm "$main_router.bak"
elif ! grep -Fxq "$memory_tuning" "$main_router"; then
  echo "Review the upstream Edge Runtime memory limit before synchronizing functions" >&2
  exit 65
fi

if grep -q 'const workerTimeoutMs = 1 \* 60 \* 1000' "$main_router"; then
  sed -i.bak 's/const workerTimeoutMs = 1 \* 60 \* 1000/const workerTimeoutMs = 150 * 1000/' "$main_router"
  rm "$main_router.bak"
elif ! grep -q 'const workerTimeoutMs = 150 \* 1000' "$main_router"; then
  echo "Review the upstream Edge Runtime timeout before synchronizing functions" >&2
  exit 65
fi

# The runtime's default CPU limits (about 2 seconds hard) are sized for
# multi-tenant hosting; station-corrected batch chaining accumulates more CPU
# per worker than that on this single-tenant server. Raise them alongside the
# wall-clock tune, and fail closed if the upstream worker options change shape.
if ! grep -q 'cpuTimeSoftLimitMs' "$main_router"; then
  sed -i.bak \
    -e 's/  const workerTimeoutMs = 150 \* 1000/  const workerTimeoutMs = 150 * 1000\n  const cpuTimeSoftLimitMs = 5 * 1000\n  const cpuTimeHardLimitMs = 10 * 1000/' \
    -e 's/      workerTimeoutMs,/      workerTimeoutMs,\n      cpuTimeSoftLimitMs,\n      cpuTimeHardLimitMs,/' \
    "$main_router"
  rm "$main_router.bak"
fi
if ! grep -q 'cpuTimeHardLimitMs,' "$main_router"; then
  echo "Review the upstream Edge Runtime worker options before synchronizing functions" >&2
  exit 65
fi

echo "Synchronized Bolets Edge Functions into $target_dir"
