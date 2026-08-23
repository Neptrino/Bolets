#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer as root" >&2
  exit 77
fi

if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  echo "Usage: $0 /path/to/github-actions.pub" >&2
  exit 64
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
public_key_file=$1
deploy_user=bolets-deploy
receiver=/usr/local/sbin/bolets-receive-release

if [ "$(wc -l < "$public_key_file")" -ne 1 ] ||
   ! ssh-keygen -l -f "$public_key_file" >/dev/null 2>&1; then
  echo "The deploy public key is invalid" >&2
  exit 65
fi

key_type=$(awk '{ print $1 }' "$public_key_file")
if [ "$key_type" != ssh-ed25519 ]; then
  echo "The deploy key must be Ed25519" >&2
  exit 65
fi

if ! id "$deploy_user" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/sh "$deploy_user"
fi
passwd --lock "$deploy_user" >/dev/null

install -o root -g root -m 755 "$script_dir/receive-release.sh" "$receiver"

home_dir=$(getent passwd "$deploy_user" | cut -d: -f6)
install -d -o "$deploy_user" -g "$deploy_user" -m 700 "$home_dir/.ssh"
{
  printf 'restrict,command="sudo -n %s" ' "$receiver"
  cat "$public_key_file"
} > "$home_dir/.ssh/authorized_keys"
chown "$deploy_user:$deploy_user" "$home_dir/.ssh/authorized_keys"
chmod 600 "$home_dir/.ssh/authorized_keys"

sudoers_file=/etc/sudoers.d/bolets-deploy
printf '%s ALL=(root) NOPASSWD: %s\n' "$deploy_user" "$receiver" > "$sudoers_file"
chmod 440 "$sudoers_file"
visudo -cf "$sudoers_file" >/dev/null

echo "Installed the forced-command GitHub deployment identity"
