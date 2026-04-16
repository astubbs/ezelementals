# ReelDesc

> Semantic descriptions for video and playback.

An open-source pipeline that generates dense semantic understanding of any film — offline, locally, on consumer hardware. From that understanding, multiple output formats are derived: elemental effects tracks (.3fx), accessibility descriptions, visual description subtitles, and semantic search indexes. One generation pass, many consumers.

**Status:** M0.5 — architectural pivot complete. See [milestones](docs/internal/milestones.md).

## How it works

1. **Extract** — ffmpeg pulls frames at 0.5fps and generates 2-second audio spectrograms
2. **Classify** — each frame+spectrogram pair is sent to a VLM (Qwen2.5-VL via Ollama), which returns a semantic description and structured elemental fields
3. **Timeline** — results are written to `timeline.jsonl`, the core shared artifact
4. **Export** — configurable exporters derive output formats from the timeline (`.3fx` elemental effects first, AD subtitles and more planned)
5. **Bundle** — everything is packaged into a `.bundle` directory for sharing

## Quick start

```sh
uv sync

# Generate a bundle via CLI (requires local Ollama with Qwen2.5-VL)
bin/generate-track.sh movie.mkv

# Without Ollama (random stub values for testing)
bin/generate-track.sh movie.mkv --stub-llm

# Launch the Studio web UI
bin/ui.sh
```

## Pipeline

```
video.mkv
  ├─ Extract: ffmpeg frames + spectrograms
  ├─ Classify: VLM pass → timeline.jsonl (description + elemental fields)
  ├─ Export: --export elemental → RLE compress → elemental.3fx
  └─ Bundle: movie.bundle/
       ├── meta.json
       ├── timeline.jsonl    ← the core shared artifact
       └── elemental.3fx     ← derived export
```

## Project structure

```
src/reeldesc/
├── extractor.py          # ffmpeg frame + spectrogram extraction
├── runner.py             # Ollama VLM inference engine
├── timeline.py           # timeline.jsonl format: read/write/schema
├── bundle.py             # bundle directory format: create/read/validate
├── pipeline.py           # CLI orchestrator
├── profiles/             # VLM classification profiles (elemental first)
├── exporters/
│   └── threefx.py        # .3fx elemental effects exporter
└── studio/               # Web UI (FastAPI + React)
    ├── server.py          # FastAPI app
    ├── routes/            # REST API
    ├── ws/                # WebSocket encoder stream
    ├── jobs/              # async encode job manager
    └── adapters/
        └── haos.py        # Home Assistant playback + device control
```

## Documentation

- **Users:** [Getting Started](docs/user/getting-started.md) · [CLI Reference](docs/user/cli-reference.md) · [Studio UI](docs/user/studio-ui.md) · [Device Setup](docs/user/device-setup.md) · [Bundles](docs/user/bundles.md)
- **Developers:** [Architecture](docs/developer/architecture.md) · [Studio Architecture](docs/developer/studio-architecture.md) · [Timeline Format](docs/developer/timeline-format.md) · [Bundle Format](docs/developer/bundle-format.md) · [.3fx Format](docs/developer/threefx-format.md) · [Contributing](docs/developer/contributing.md)
- **Internal:** [Pivot Plan](docs/internal/pivot-semantic-media-database.md) · [Milestones](docs/internal/milestones.md) · [Naming](docs/internal/naming.md) · [Project Outline](docs/internal/project-outline.md)

## Related

- [HTFanControl](https://github.com/nicko88/HTFanControl) — prior art, wind-only, abandoned
- [ezBEQ](https://beqdesigner.readthedocs.io) — community model this project follows
- [SIGGRAPH Asia 2024](https://dl.acm.org/doi/10.1145/3681758.3698021) — multimodal 4D effect extraction paper
- [Shot-by-Shot (arXiv 2025)](https://arxiv.org/html/2504.01020) — film-grammar-aware AD generation
