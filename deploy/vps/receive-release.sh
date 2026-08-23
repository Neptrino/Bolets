#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "The release receiver must run as root" >&2
  exit 77
fi

deploy_root=/opt/bolets
release_root="$deploy_root/releases"
app_path="$deploy_root/app"
supabase_dir="$deploy_root/supabase"
archive_limit=268435456

install -d -m 755 "$release_root"

# Serialize releases even if a workflow is retried while another run is still
# completing. GitHub's concurrency setting is an additional guard, not the
# lock's source of truth.
exec 9>/run/lock/bolets-deploy.lock
if ! flock -n 9; then
  echo "Another Bolets deployment is in progress" >&2
  exit 75
fi

IFS= read -r revision
if ! printf '%s\n' "$revision" | grep -Eq '^[0-9a-f]{40}$'; then
  echo "The release revision must be a 40-character lowercase Git SHA" >&2
  exit 65
fi

archive=$(mktemp "$release_root/.archive-$revision.XXXXXX")
staging="$release_root/.incoming-$revision"
release="$release_root/$revision"

cleanup() {
  rm -f -- "$archive"
  rm -rf -- "$staging"
}
trap cleanup EXIT HUP INT TERM

# Read one byte beyond the limit so an oversized stream is rejected rather
# than silently truncated.
head -c "$((archive_limit + 1))" > "$archive"
archive_size=$(wc -c < "$archive")
if [ "$archive_size" -gt "$archive_limit" ]; then
  echo "The release archive exceeds the 256 MiB limit" >&2
  exit 65
fi

if ! gzip -t "$archive"; then
  echo "The release archive is not valid gzip data" >&2
  exit 65
fi

tar -tzf "$archive" | while IFS= read -r member; do
  case "$member" in
    "" | /* | .. | ../* | */.. | */../*)
      echo "Unsafe path in release archive: $member" >&2
      exit 65
      ;;
  esac
done

if tar -tvzf "$archive" | awk '
  substr($1, 1, 1) == "l" || substr($1, 1, 1) == "h" { found = 1 }
  END { exit found ? 0 : 1 }
'; then
  echo "Release archives may not contain symbolic or hard links" >&2
  exit 65
fi

current_release=
if [ -L "$app_path" ]; then
  current_release=$(readlink -f "$app_path")
elif [ -d "$app_path" ]; then
  current_release=$app_path
fi

if [ "$current_release" = "$release" ]; then
  echo "Redeploying existing release $revision"
else
  rm -rf -- "$staging"
  install -d -m 755 "$staging"
  tar -xzf "$archive" --no-same-owner --no-same-permissions -C "$staging"

  if [ ! -x "$staging/deploy/vps/rollout.sh" ] ||
     [ ! -f "$staging/deploy/vps/compose.yaml" ] ||
     [ ! -f "$staging/Dockerfile" ]; then
    echo "The release does not contain a deployable Bolets application" >&2
    exit 66
  fi

  rm -rf -- "$release"
  mv -- "$staging" "$release"
fi

rollback() {
  echo "Release $revision failed; restoring the previous application" >&2
  if [ -n "$current_release" ] && [ -x "$current_release/deploy/vps/rollout.sh" ]; then
    "$current_release/deploy/vps/rollout.sh" "$current_release" "$supabase_dir" || true
  fi
}

if ! "$release/deploy/vps/rollout.sh" "$release" "$supabase_dir"; then
  rollback
  exit 70
fi

if ! curl --fail --silent --show-error --retry 5 --retry-all-errors \
  --resolve bolets.app:443:127.0.0.1 \
  https://bolets.app/api/health >/dev/null; then
  rollback
  exit 70
fi

if [ "$current_release" != "$release" ]; then
  next_link="$deploy_root/.app-$revision"
  rm -f -- "$next_link"
  ln -s "$release" "$next_link"

  if [ -d "$app_path" ] && [ ! -L "$app_path" ]; then
    bootstrap="$release_root/bootstrap-$(date -u +%Y%m%dT%H%M%SZ)"
    mv -- "$app_path" "$bootstrap"
    if ! mv -Tf -- "$next_link" "$app_path"; then
      mv -- "$bootstrap" "$app_path"
      rollback
      exit 70
    fi
  elif ! mv -Tf -- "$next_link" "$app_path"; then
    rollback
    exit 70
  fi
fi

echo "Bolets release $revision is healthy and active"
