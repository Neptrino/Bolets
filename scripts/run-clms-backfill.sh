#!/bin/zsh
# One-shot CLMS history backfill: walks every date from 2025-07-14 (first
# spatial-shift-corrected SWI V2.1.1 product) to two days ago, fetching from
# CDSE where the local archive lacks the date and importing with
# --history-only so dates older than the four-date preview window land in
# the append-only clms_soil_history archive. Already-imported dates are
# skipped via a state marker, so the script is safe to re-run after any
# interruption. Pass a start date to resume later (default 2025-07-14).
set -e
cd "$(dirname "$0")/.."
source "$HOME/bolets-private/cdse.env"
source "$HOME/bolets-private/clms.env"
source "$HOME/bolets-private/supabase.env"
export CDSE_S3_ACCESS_KEY CDSE_S3_SECRET_KEY CLMS_SOIL_IMPORT_TOKEN SUPABASE_URL SUPABASE_ANON_KEY

ARCHIVE="$HOME/bolets-private/clms-archive"
POINTS="$HOME/bolets-private/clms-points.json"
LOG="$HOME/bolets-private/clms-history-backfill.log"
START="${1:-2025-07-14}"
END=$(date -u -v-2d +%Y-%m-%d)

ok=0; fail=0; skip=0
day="$START"
echo "=== clms history backfill $START..$END $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
while [ "$day" \< "$END" ] || [ "$day" = "$END" ]; do
  if grep -q '"history": true' "$ARCHIVE/$day/state.json" 2>/dev/null; then
    skip=$((skip + 1))
  else
    if [ ! -f "$ARCHIVE/$day/clms-manifest.json" ]; then
      node scripts/fetch-clms-soil.mjs --output-dir="$ARCHIVE/$day" --date="$day" >> "$LOG" 2>&1 || true
      sleep 2
    fi
    if [ -f "$ARCHIVE/$day/clms-manifest.json" ]; then
      if node scripts/import-clms-soil.mjs \
          --manifest="$ARCHIVE/$day/clms-manifest.json" \
          --asset-dir="$ARCHIVE/$day" \
          --points="$POINTS" \
          --history-only >> "$LOG" 2>&1; then
        echo '{"history": true}' > "$ARCHIVE/$day/state.json"
        ok=$((ok + 1))
        echo "$day OK" >> "$LOG"
      else
        fail=$((fail + 1))
        echo "$day IMPORT FAILED" >> "$LOG"
      fi
    else
      fail=$((fail + 1))
      echo "$day FETCH FAILED (no product?)" >> "$LOG"
    fi
  fi
  day=$(date -u -j -v+1d -f %Y-%m-%d "$day" +%Y-%m-%d)
done
echo "HISTORY BACKFILL COMPLETE ok=$ok fail=$fail skip=$skip" >> "$LOG"
echo "HISTORY BACKFILL COMPLETE ok=$ok fail=$fail skip=$skip"
