#!/usr/bin/env sh
set -e

if [ -n "$DOPPLER_TOKEN" ]; then
  echo "[entrypoint] DOPPLER_TOKEN detected — installing Doppler CLI and running under doppler run"
  curl -sLf https://cli.doppler.com/install.sh | sh
  exec doppler run -- "$@"
else
  echo "[entrypoint] DOPPLER_TOKEN not set — running directly"
  exec "$@"
fi
