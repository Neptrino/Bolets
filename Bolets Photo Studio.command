#!/bin/zsh
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  print "Cal Node.js 24 o superior per obrir l’estudi."
  read "?Prem retorn per tancar."
  exit 1
fi
node scripts/instagram-photo-studio.mjs
