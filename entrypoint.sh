#!/usr/bin/env sh
set -e

# If DOPPLER_TOKEN is present, install Doppler CLI and run the app under doppler run
if [ -n "$DOPPLER_TOKEN" ]; then
  echo "DOPPLER_TOKEN detected — installing Doppler CLI and running under doppler run"
  curl -sLf https://cli.doppler.com/install.sh | sh
  exec doppler run -- npm run start:web
else
  echo "DOPPLER_TOKEN not set — running without Doppler"
  exec npm run start:web
fi