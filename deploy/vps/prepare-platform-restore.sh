#!/bin/sh
set -eu
umask 077

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /absolute/path/to/platform-dump-directory" >&2
  exit 64
fi

dump_dir=$1
roles_source="$dump_dir/roles.sql"
data_source="$dump_dir/data.sql"
roles_restore="$dump_dir/roles.restore.sql"
data_restore="$dump_dir/data.restore.sql"

if [ ! -s "$roles_source" ] || [ ! -s "$dump_dir/schema.sql" ] || [ ! -s "$data_source" ]; then
  echo "The dump directory must contain non-empty roles.sql, schema.sql and data.sql" >&2
  exit 66
fi

roles_tmp=$(mktemp "$dump_dir/.roles.restore.XXXXXX")
data_tmp=$(mktemp "$dump_dir/.data.restore.XXXXXX")
cleanup() {
  rm -f "$roles_tmp" "$data_tmp"
}
trap cleanup EXIT INT TERM

# The self-hosted postgres login is deliberately not a superuser. These two
# platform role settings are already owned by the release-managed roles and
# cannot be replayed through that login.
awk '
  /^ALTER ROLE "supabase_admin" SET "statement_timeout" TO '\''0'\'';$/ {
    print "-- skipped for self-hosted reserved superuser: " $0
    altered_admin++
    next
  }
  /^GRANT SET ON PARAMETER "log_min_messages" TO "supabase_realtime_admin";$/ {
    print "-- skipped for self-hosted reserved parameter: " $0
    granted_parameter++
    next
  }
  { print }
  END {
    if (altered_admin != 1 || granted_parameter != 1) exit 42
  }
' "$roles_source" > "$roles_tmp"

# Managed Auth and Storage can lead the pinned self-hosted release by a few
# columns. It is safe to omit these COPY blocks only while they contain no
# rows. Fail closed if that ever changes so a release upgrade or an explicit
# data-preserving transform is required instead.
awk '
  function incompatible_copy(line) {
    return line ~ /^COPY "auth"\."custom_oauth_providers" / ||
           line ~ /^COPY "storage"\./
  }
  incompatible_copy($0) {
    block_header=$0
    block_rows=0
    skip=1
    skipped++
    next
  }
  skip && $0=="\\." {
    if (block_rows != 0) {
      print "Refusing to omit non-empty block: " block_header > "/dev/stderr"
      unsafe=1
    }
    skip=0
    next
  }
  skip {
    block_rows++
    next
  }
  { print }
  END {
    if (skip || skipped != 8 || unsafe) exit 43
  }
' "$data_source" > "$data_tmp"

mv "$roles_tmp" "$roles_restore"
mv "$data_tmp" "$data_restore"
chmod 600 "$roles_restore" "$data_restore"
trap - EXIT INT TERM

echo "Prepared $roles_restore and $data_restore"

