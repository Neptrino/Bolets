#!/bin/zsh
# Daily CLMS SWI/SSM shadow import: fetches the newest available product day
# from CDSE (S3, SigV4) and pushes decoded samples to the import-clms-soil
# edge function, which writes the four-date hot preview plus the append-only
# history archive. Also retries the two most recent days so product latency
# or a sleeping laptop cannot leave gaps. Credentials stay in
# ~/bolets-private/*.env (never in the repository).
set -e
cd "$(dirname "$0")/.."
source "$HOME/bolets-private/cdse.env"
source "$HOME/bolets-private/clms.env"
source "$HOME/bolets-private/supabase.env"
export CDSE_S3_ACCESS_KEY CDSE_S3_SECRET_KEY CLMS_SOIL_IMPORT_TOKEN SUPABASE_URL SUPABASE_ANON_KEY

ARCHIVE="$HOME/bolets-private/clms-archive"
POINTS="$HOME/bolets-private/clms-points.json"
LOG="$HOME/bolets-private/clms-daily.log"

echo "=== clms daily $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
for offset in 3 2; do
  day=$(date -u -v-${offset}d +%Y-%m-%d)
  if [ -f "$ARCHIVE/$day/clms-manifest.json" ] && grep -q '"imported": true' "$ARCHIVE/$day/state.json" 2>/dev/null; then
    continue
  fi
  if node scripts/fetch-clms-soil.mjs --output-dir="$ARCHIVE/$day" --date="$day" >> "$LOG" 2>&1; then
    if node scripts/import-clms-soil.mjs \
        --manifest="$ARCHIVE/$day/clms-manifest.json" \
        --asset-dir="$ARCHIVE/$day" \
        --points="$POINTS" >> "$LOG" 2>&1; then
      echo '{"imported": true}' > "$ARCHIVE/$day/state.json"
      echo "$day imported" >> "$LOG"
    else
      echo "$day import FAILED" >> "$LOG"
    fi
  else
    echo "$day fetch unavailable (product latency?)" >> "$LOG"
  fi
done
