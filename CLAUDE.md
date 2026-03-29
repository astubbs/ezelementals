# CLAUDE.md

Guidance for Claude Code when working in this repository.
Architecture and design are documented in README.md — read that first for context.

## Rules

- **Keep documentation in sync.** Any change to CLI flags, defaults, behaviour, or architecture must be reflected in README.md in the same commit. Never leave docs describing something that no longer matches the code.
- **Follow the spec.** README.md is the authoritative design doc. Before implementing, check it. If the spec and the code diverge, flag it rather than silently picking one.
- **Be DRY.** Don't duplicate content between files. CLAUDE.md is for Claude-specific guidance only — architecture, design decisions, and milestones live in README.md.

## Current status

M0 spike is implemented and working. The full pipeline exists:
`extract.py` → `classify.py` → `compress.py` → `pipeline.py` → `.3fx`

`ha_client.py` is a stub. `--stub-llm` mode works for local testing without Ollama.
50 tests passing. CI runs on Python 3.11 and 3.12.

## Key implementation guidance

- **LLM output schema** — the classifier returns `wind`, `wind_direction`, `water`, `water_type`, `heat_ambient`, `heat_radiant`, `confidence` (0–1). `wind_direction` and `water_type` are dropped at the compress step intentionally — `.3fx` carries intensity only for now. Raw classifications are preserved in `PipelineResult`.
- **Graceful degradation** — classifier failures and low-confidence results are flagged, never silently dropped. This is intentional throughout.
- **Test corpus** — use tagged film segments for manual validation: Fury Road sandstorm, Dunkirk beach, The Perfect Storm. Real sustained effects, not trailers.
- **Branding** — effect format: `.3fx` (ElementFX), community library: iWASDb, authoring tool: iWASDbDesigner.
