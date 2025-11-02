#!/usr/bin/env bash
# deploy-agent.sh — rootless Doppler download, validate tarball, run doppler run -> build & publish
# Usage: ./deploy-agent.sh
set -euo pipefail

cleanup() {
  rm -rf "${TMPDIR:-/tmp}/deploy-agent-$$"
}
trap cleanup EXIT

echo "Starting deploy agent..."

: "${DOPPLER_SERVICE_TOKEN:?Environment variable DOPPLER_SERVICE_TOKEN must be set}"
: "${CF_ACCOUNT_ID:?Environment variable CF_ACCOUNT_ID must be set}"
# CF_API_TOKEN is used by wrangler if needed; keep it in env if required

ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ] || [ "$ARCH" = "amd64" ]; then
  URL="https://github.com/DopplerHQ/cli/releases/latest/download/doppler_linux_amd64.tar.gz"
else
  URL="https://github.com/DopplerHQ/cli/releases/latest/download/doppler_linux_arm64.tar.gz"
fi

TMPDIR="${TMPDIR:-/tmp}/deploy-agent-$$"
mkdir -p "$TMPDIR"
TARBALL="$TMPDIR/doppler.tar.gz"

echo "Downloading Doppler from: $URL"
# curl -fsSL so HTTP errors fail; capture nonzero but still save file for debug
if ! curl -fsSL -o "$TARBALL" "$URL"; then
  HTTP_STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$URL" || echo "000")"
  echo "curl failed with HTTP status: $HTTP_STATUS"
  echo "---- Start of response (first 1KB) ----"
  head -c 1024 "$TARBALL" 2>/dev/null || true
  echo "---- End of response ----"
  exit 1
fi

# Validate tarball
if ! tar -tzf "$TARBALL" >/dev/null 2>&1; then
  echo "Downloaded file is not a valid gzip tarball. Showing first 1KB for debugging:"
  head -c 1024 "$TARBALL" | sed -n '1,200p' || true
  exit 1
fi

tar -xzf "$TARBALL" -C "$TMPDIR"
# doppler binary is expected at top-level 'doppler' after extraction
chmod +x "$TMPDIR/doppler" || true

echo "Running doppler to inject secrets and publish..."
# Use doppler run stateless approach. Wrap build/publish in bash -lc as before.
export PATH="$TMPDIR:$PATH"
"$TMPDIR/doppler" run --token "$DOPPLER_SERVICE_TOKEN" -- bash -lc "npm ci && npm run build && npx wrangler publish --account-id \"$CF_ACCOUNT_ID\""

echo "Deploy agent finished successfully."
