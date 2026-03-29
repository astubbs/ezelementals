#!/usr/bin/env sh
# Ensure Ollama is running and the required model is pulled.
# Idempotent — safe to call even if Ollama is already running.
set -e

MODEL="qwen2.5vl:7b"

if ! command -v ollama > /dev/null 2>&1; then
    echo "error: ollama is not installed."
    echo ""
    echo "Install with Homebrew:"
    echo "  brew install ollama"
    echo ""
    echo "Or download from: https://ollama.com/download"
    exit 1
fi

if ! curl -sf http://localhost:11434/ > /dev/null 2>&1; then
    echo "  starting ollama..."
    ollama serve > /dev/null 2>&1 &
    printf "  waiting for ollama"
    while ! curl -sf http://localhost:11434/ > /dev/null 2>&1; do
        printf "."
        sleep 1
    done
    echo ""
fi

if ! ollama list 2>/dev/null | grep -q "$MODEL"; then
    echo "  pulling $MODEL  (this may take a while on first run)..."
    ollama pull "$MODEL"
fi

echo "  ollama ready  model=$MODEL"
