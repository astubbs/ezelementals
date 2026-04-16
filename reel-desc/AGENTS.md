# AGENTS.md

Guidance for AI agents (Claude Code, etc.) working in this repository.

These rules apply to any agent without requiring that they also have a global
config loaded. Synced from a global `~/.claude/CLAUDE.md` — project-specific
guidance is at the bottom.

## Git safety

- **Never commit or push without explicit user approval.** Wait for the user to
  say commit/push. This is the #1 rule.
- **Create new commits rather than amending** unless the user asks for an
  amend. After a pre-commit hook failure, the commit did not happen — amending
  modifies the PREVIOUS commit.
- Don't run destructive git commands (`reset --hard`, `push --force`, branch
  delete) unless explicitly requested.
- Don't skip hooks (`--no-verify`).

## Commit discipline

- **Never commit without tests and documentation.**
  - New code = new tests. Don't ask; write them.
  - Any feature change = update the relevant `docs/` pages in the same commit.
  - Run the full test suite before committing — not just the files you changed.
  - Don't commit and "fix docs/tests later".
- When you fix something or finish implementing something, record lessons
  learnt (in a diary entry or the relevant spec).

## Development discipline

- **Skateboard first.** Build the simplest end-to-end thing that works, then
  improve it. Before starting a feature, ask: "Is this blocking the next
  public milestone?" If not, flag it and move on.
- **Keep the user on track.** Call out bicycle/motorcycle features when the
  skateboard isn't shipped.
- **Never paper over the real problem.** Make the proper fix.
- **Don't propose workarounds that require user action** when the software has
  enough information to solve it.
- **Save data as soon as it's created.** Don't buffer in memory if it's
  eventually going to disk.

## Code quality

- **Be DRY.** Reuse existing functions. Refactor shared patterns.
- **Tooltips on every interactive control** with non-obvious behaviour.
- **Validate user input** at system boundaries. Fail loud, not silent.
- **Handle errors visibly.** Don't swallow exceptions.
- **Never weaken test assertions.** Classify exceptions instead of ignoring.
- **Meaningful names** that describe what things do. No generic names.

## UI discipline

- **Don't mutate adjacent UI in response to toggle state.** The control's
  visual state (checked, colour, focus) already shows on/off. Don't append
  "(active)" to labels or reveal helper text on toggle. Only change UI across
  genuinely different modes (e.g. "+ Add" vs "✓ In Library").

## Test discipline

- **Run the full default test suite before every commit.** Use this project's
  runners (see [contributing](docs/developer/contributing.md)):
  - `bin/test.sh` — Python
  - `cd ui && npm run test:run` — Vitest (frontend unit/acceptance)
  - `cd ui && npm run e2e` — Playwright (frontend E2E, real backend)
- Search for existing test harnesses before writing new ones.
- Maintain good high-level coverage. Only get detailed on particularly complex
  functions.

## CI and automation

- Always set up CI, code coverage, and automated dependency checks.
- Make scripts for common end-user needs with helpful CLI interfaces (see
  `reel-desc/bin/` for examples).

## Documentation

- **Keep documentation in sync.** Any change to CLI flags, defaults,
  behaviour, architecture, or plans must be reflected in the relevant `docs/`
  pages in the same commit. Never leave docs describing something that no
  longer matches the code or the planned direction.
- **Document plans too.** When architecture or direction changes, update both
  current-state docs and internal planning docs (`docs/internal/`).
- **Follow the spec.** The `docs/` site is the authoritative design reference.
  Before implementing, check it. If the spec and the code diverge, flag it
  rather than silently picking one.
- **Feature spec doubles as user guide.** `docs/user/studio-ui.md` lists
  every functional feature with implementation status. Use it to cross-check
  the implementation and as the spec for companion apps.
- **Diary of major plans and milestones** — add entries to
  `docs/internal/` when direction changes.
- **Developer-facing product specification** separate from user docs — see
  `docs/developer/` for architecture, format specs, and component guides.
- Keep the docs table of contents (`docs/index.md`) updated.

## Communication

- Use precise terminology. When this project defines specific terms, use them
  consistently (see Branding below).
- Don't write with em-dash characters.

## Rule sync

- Keep this file in sync with upstream/global agent rules. If a project-level
  rule drifts from the generic guidance, flag it in the PR.

---

## Project-specific guidance

### Current status

Pivoting from ezElementals to **ReelDesc** — semantic descriptions for video
and playback.

M0 spike (elemental effects pipeline) is implemented and working. The full
pipeline exists: `extract.py` → `classify.py` → `compress.py` → `pipeline.py`
→ `.3fx`.

Active refactor in progress: restructuring to the ReelDesc architecture with
timeline.jsonl as the canonical intermediate format and configurable export
pipeline.

See [pivot plan](docs/internal/pivot-semantic-media-database.md) for full
context.

### Key implementation guidance

- **LLM output schema** — the classifier returns `wind`, `wind_direction`,
  `water`, `water_type`, `heat_ambient`, `heat_radiant`, `confidence` (0–1).
  `wind_direction` and `water_type` are dropped at the compress step
  intentionally — `.3fx` carries intensity only for now. Raw classifications
  are preserved in `PipelineResult`. Post-pivot, the timeline also includes
  `description`, `audio`, `scene_type`, `motion`.
- **Graceful degradation** — classifier failures and low-confidence results
  are flagged, never silently dropped. This is intentional throughout.
- **Test corpus** — use tagged film segments for manual validation: Fury Road
  sandstorm, Dunkirk beach, The Perfect Storm. Real sustained effects, not
  trailers.
- **Branding** — project: ReelDesc, effect format: `.3fx` (ElementFX),
  community library: iWASDb, elemental effects module: ezElementals.
- **Studio UI** — runs via `bin/ui.sh`; listens on `0.0.0.0:8765`. Three test
  layers: Python (pytest), Vitest (frontend unit with mocked API), Playwright
  (frontend E2E against real FastAPI). See [contributing](docs/developer/contributing.md).
