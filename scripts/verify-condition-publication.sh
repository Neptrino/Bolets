#!/bin/sh
set -eu

# No host port, production credentials, persistent volume, or running jobs.
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
container="bolets-condition-test-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT INT TERM
docker run -d --name "$container" \
  -e POSTGRES_PASSWORD=local-publication-test \
  --mount "type=bind,src=$root,target=/work,readonly" \
  public.ecr.aws/supabase/postgres:17.6.1.155 \
  postgres -c shared_preload_libraries=pg_cron \
  -c cron.database_name=postgres -c cron.launch_active_jobs=off >/dev/null
# The image's init server listens only on the Unix socket while its migrations
# run, so wait for TCP: it answers only once the final server has started.
attempt=0
until docker exec "$container" pg_isready -h 127.0.0.1 -U supabase_admin >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 90 ]; then echo "Test database did not start" >&2; exit 1; fi
  sleep 1
done
docker exec "$container" psql -U supabase_admin -d postgres \
  -f /work/tests/sql/condition-publication.sql
