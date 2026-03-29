#!/usr/bin/env sh
set -e

if ! command -v uv > /dev/null 2>&1; then
    echo "Error: uv is not installed."
    echo ""
    echo "uv is a fast Python package and project manager (pip + virtualenv replacement)."
    echo ""
    echo "Install with Homebrew:"
    echo "  brew install uv"
    echo ""
    echo "Or see the full installation docs: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
fi

uv run ezelementals-pipeline "$@"
