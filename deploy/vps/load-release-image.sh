#!/bin/sh
# Sourced by rollout and backup; never evaluate release metadata as shell code.
if [ ! -f "$app_dir/.release-image" ] || [ ! -f "$app_dir/.release-revision" ]; then
  echo "Release image metadata is missing; deploy an image through GitHub Actions" >&2
  exit 66
fi
BOLETS_APP_IMAGE=$(cat "$app_dir/.release-image")
BOLETS_RELEASE_REVISION=$(cat "$app_dir/.release-revision")
if ! printf '%s\n' "$BOLETS_APP_IMAGE" | grep -Eq '^ghcr\.io/neptrino/bolets@sha256:[0-9a-f]{64}$' ||
   ! printf '%s\n' "$BOLETS_RELEASE_REVISION" | grep -Eq '^[0-9a-f]{40}$' ||
   [ "${#BOLETS_APP_IMAGE}" -ne 95 ] || [ "${#BOLETS_RELEASE_REVISION}" -ne 40 ] ||
   [ "$(wc -l < "$app_dir/.release-image")" -ne 1 ] ||
   [ "$(wc -l < "$app_dir/.release-revision")" -ne 1 ]; then
  echo "Release image metadata is invalid" >&2
  exit 65
fi
export BOLETS_APP_IMAGE BOLETS_RELEASE_REVISION
