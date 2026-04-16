# ReelDesc Documentation

> Semantic descriptions for video and playback.

ReelDesc is an open-source pipeline that generates dense semantic understanding of any film — offline, locally, on consumer hardware. From that understanding, multiple output formats are derived: elemental effects tracks, accessibility descriptions, visual description subtitles, and semantic search indexes.

## For Users

- [Getting Started](user/getting-started.md) — install, first run, basic usage
- [CLI Reference](user/cli-reference.md) — command-line flags and options
- [Studio UI](user/studio-ui.md) — web interface guide
- [Device Setup](user/device-setup.md) — configuring fans, misters, heaters via Home Assistant
- [Bundles](user/bundles.md) — what's in a bundle, how to share

## For Developers

- [Architecture](developer/architecture.md) — pipeline flow, package structure, key abstractions
- [Studio Architecture](developer/studio-architecture.md) — web UI components, REST API, WebSocket protocol, known gaps
- [Timeline Format](developer/timeline-format.md) — `timeline.jsonl` schema and examples
- [Bundle Format](developer/bundle-format.md) — bundle directory specification
- [.3fx Format](developer/threefx-format.md) — elemental effects track specification
- [Writing Exporters](developer/exporters.md) — how to add a new export format
- [Writing Profiles](developer/profiles.md) — how to add a new VLM classification profile
- [Contributing](developer/contributing.md) — dev setup, testing, PR workflow

## Internal

- [Pivot Plan](internal/pivot-semantic-media-database.md) — architectural pivot from ezElementals to ReelDesc
- [Project Outline](internal/project-outline.md) — full vision document
- [Naming](internal/naming.md) — naming decisions and research
- [Milestones](internal/milestones.md) — M0–M7 milestone tracker
- [Development Diary](internal/diary/README.md) — chronological record of decisions, discoveries, and lessons
