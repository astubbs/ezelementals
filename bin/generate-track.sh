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

# Auto-start Ollama unless running in stub mode
USE_STUB=0
for arg in "$@"; do
    if [ "$arg" = "--stub-llm" ]; then
        USE_STUB=1
        break
    fi
done

if [ "$USE_STUB" = "0" ]; then
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    "$SCRIPT_DIR/start-ollama.sh"
fi

uv run ezelementals-pipeline "$@"
