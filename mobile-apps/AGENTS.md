# AGENTS.md

Guidance for AI agents (Claude Code, etc.) working in the `mobile-apps/`
project.

## Rules

- **Keep a development diary.** For every major milestone scoping,
  significant project plan change, and interesting technical
  discovery, write a dated entry in
  `mobile-apps/docs/development/diary/`. Entries are backward-looking
  records of what was decided and *why* — not copies of planning
  documents. Naming: `YYYY-MM-DD-slug.md`. See the diary's own
  README for format details and when (not) to write an entry.
- **Specs are the source of truth.** `mobile-apps/specs/` holds the
  authoritative descriptions of state machines, protocols, and
  interaction models that both native apps implement. Any
  behavioural change lands in the spec *first*, then in both
  codebases. If the Swift and Kotlin implementations diverge from
  the spec, fix them or update the spec — never let them silently
  drift.
- **Dual-native parity.** `alloy-ios` and `alloy-android` must stay
  feature-identical. When you add a feature to one, add it to the
  other in the same change, or open a ticket acknowledging the gap.
- **Keep documentation in sync.** Any change to app behaviour,
  onboarding flows, backend integrations, or milestone scope must
  update the relevant files under `mobile-apps/docs/` and
  `mobile-apps/project-plan.md` in the same commit.
- **Be DRY.** Don't duplicate content between AGENTS.md,
  project-plan.md, specs, and the diary. AGENTS.md is agent-specific
  guidance only — architecture, design decisions, format specs, and
  milestone history live in their own files.

## Current status

**Planning — pre-M1.** Product spec lives in
[`project-plan.md`](project-plan.md). M1 scope (volume control +
first-launch onboarding wizard with Denon and Home Assistant
discovery) is settled — see
[`docs/development/diary/2026-04-11-m1-scope.md`](docs/development/diary/2026-04-11-m1-scope.md).
No app code yet; specs and scaffolding in progress.

## Key implementation guidance

- **The volume control is the canonical implementation of the app's
  UX principles.** Every other feature must inherit its interaction
  model: optimistic UI with decoupled intent and confirmed state,
  instant load, background work. See the UX principles section of
  `project-plan.md` for the full statement.
- **`VolumeTarget` abstraction.** The volume control consumes an
  injected `VolumeTarget` interface — never a concrete
  `DenonDirectTarget` or `HomeAssistantTarget` directly. Every
  future control surface follows the same pattern: one abstract
  target interface, one or more concrete backends, discovery feeds
  a unified picker.
- **Discovery is always two-source.** Anywhere in the app where a
  user binds to a backend, discovery runs in parallel across a
  direct LAN lane and a Home Assistant lane, and presents the
  combined, deduplicated results in a single picker. Manual entry
  is always a first-class option on the same screen.
- **Haptics are baseline, not polish.** Basic haptic feedback on
  value changes is table stakes for any drag control. Advanced
  curves, hold-to-repeat, etc. can follow later, but the default
  tick ships with any control the user interacts with.
