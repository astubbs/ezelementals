# AGENTS.md

Guidance for AI agents (Claude Code, etc.) working in this repository.

## Rules

- **Keep documentation in sync.** Any change to CLI flags, defaults, behaviour, architecture, or plans must be reflected in the relevant `docs/` pages in the same commit. Never leave docs describing something that no longer matches the code or the planned direction.
- **Document plans too.** When architecture or direction changes, update both the current-state docs and the internal planning docs (`docs/internal/`). Docs should reflect where we are AND where we're going.
- **Follow the spec.** The `docs/` site is the authoritative design reference. Before implementing, check it. If the spec and the code diverge, flag it rather than silently picking one.
- **Be DRY.** Don't duplicate content between files. AGENTS.md is for agent-specific guidance only — architecture, design decisions, format specs, and milestones live in `docs/`.

## Current status

Pivoting from ezElementals to **ReelDesc** — semantic descriptions for video and playback.

M0 spike (elemental effects pipeline) is implemented and working. The full pipeline exists:
`extract.py` → `classify.py` → `compress.py` → `pipeline.py` → `.3fx`

Active refactor in progress: restructuring to the ReelDesc architecture with timeline.jsonl as the canonical intermediate format and configurable export pipeline.

See [pivot plan](docs/internal/pivot-semantic-media-database.md) for full context.

## Key implementation guidance

- **LLM output schema** — the classifier returns `wind`, `wind_direction`, `water`, `water_type`, `heat_ambient`, `heat_radiant`, `confidence` (0–1). `wind_direction` and `water_type` are dropped at the compress step intentionally — `.3fx` carries intensity only for now. Raw classifications are preserved in `PipelineResult`. Post-pivot, the timeline will also include `description`, `audio`, `scene_type`, `motion`.
- **Graceful degradation** — classifier failures and low-confidence results are flagged, never silently dropped. This is intentional throughout.
- **Test corpus** — use tagged film segments for manual validation: Fury Road sandstorm, Dunkirk beach, The Perfect Storm. Real sustained effects, not trailers.
- **Branding** — project: ReelDesc, effect format: `.3fx` (ElementFX), community library: iWASDb, elemental effects module: ezElementals.
