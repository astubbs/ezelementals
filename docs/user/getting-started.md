# Getting Started

## Prerequisites

- Python 3.11 or 3.12
- [uv](https://docs.astral.sh/uv/) package manager
- [Ollama](https://ollama.ai/) with Qwen2.5-VL model (or use `--stub-llm` for testing)
- Node.js (for building the web UI)

## Install

```sh
git clone https://github.com/astubbs/ezElementals.git
cd ezElementals
uv sync
```

## Quick Start

### Generate a .3fx track via CLI

```sh
# With Ollama running locally:
bin/generate-track.sh movie.mkv

# Without Ollama (random stub values for testing):
bin/generate-track.sh movie.mkv --stub-llm

# Specify output path:
bin/generate-track.sh movie.mkv /path/to/output.3fx
```

### Launch the Studio UI

```sh
# Build the frontend (first run only):
cd ui && npm install && npm run build && cd ..

# Start the server:
uv run ezelementals-ui
# Opens browser at http://localhost:8765
```

## What happens during generation

1. **Extract** — ffmpeg pulls frames at 0.5fps and generates 2-second audio spectrograms
2. **Classify** — each frame+spectrogram pair is sent to Qwen2.5-VL via Ollama, which returns a semantic description and structured elemental fields
3. **Export** — results are run-length encoded into a `.3fx` elemental effects track

The output is a bundle containing the semantic timeline and derived export files.

## Next steps

- [CLI Reference](cli-reference.md) — all available flags
- [Studio UI](studio-ui.md) — using the web interface
- [Device Setup](device-setup.md) — connecting physical devices via Home Assistant
