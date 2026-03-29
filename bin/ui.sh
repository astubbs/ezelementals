#!/usr/bin/env bash
# Launch the ezElementals web UI.
# Builds the frontend if the static dir is missing, then starts the server.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v uv &>/dev/null; then
  echo "uv not found. Install it: https://docs.astral.sh/uv/getting-started/installation/"
  exit 1
fi

STATIC_DIR="src/ezelementals/ui/static"

if [ ! -d "$STATIC_DIR" ] || [ ! -f "$STATIC_DIR/index.html" ]; then
  echo "Frontend not built — building now…"
  if ! command -v npm &>/dev/null; then
    echo "npm not found. Install Node.js: https://nodejs.org/"
    exit 1
  fi
  cd ui
  npm install --silent
  npm run build
  cd ..
  echo "Frontend built."
fi

exec uv run ezelementals-ui "$@"
