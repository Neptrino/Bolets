#!/bin/sh
set -eu

# Validate syntax without requiring a release at its production filesystem path.
unit_dir=$(mktemp -d)
trap 'rm -rf "$unit_dir"' EXIT HUP INT TERM
sed 's|^ExecStart=.*|ExecStart=/bin/true|' \
  deploy/vps/bolets-map-cache.service > "$unit_dir/bolets-map-cache.service"
cp deploy/vps/bolets-map-cache.timer "$unit_dir/bolets-map-cache.timer"
if ! systemd-analyze verify "$unit_dir/bolets-map-cache.service" \
  "$unit_dir/bolets-map-cache.timer" > "$unit_dir/validation.log" 2>&1; then
  cat "$unit_dir/validation.log" >&2
  exit 1
fi
# Unknown directives can be warnings with a successful exit status. Ignore
# diagnostics from unrelated host units pulled in by the dependency graph.
if grep -E "(^|/)bolets-map-cache\.(service|timer)(:| )" "$unit_dir/validation.log"; then
  cat "$unit_dir/validation.log" >&2
  exit 1
fi
