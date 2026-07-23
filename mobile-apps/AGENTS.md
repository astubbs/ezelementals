# AGENTS.md

Guidance for AI agents (Claude Code, etc.) working in the
`mobile-apps/` project.

## Rules

### Git and commit discipline

- **Never `git commit` or `git push` without explicit user
  approval.** Wait for the word. This is the #1 rule.
- **Never commit without tests and documentation.** New code means
  new tests; any feature change updates the relevant docs in the
  same commit. Don't ask "shall I add tests?" — just write them.
- **Run the full test suite for the subproject you touched before
  committing.** Cross-module breakage often shows up in tests that
  live somewhere else. Use the subproject's standard runner
  (`xcodebuild test`, `gradle test` + `connectedDebugAndroidTest`,
  `npx jest`).
- **When creating a stacked PR, include `depends on #N` in the PR
  description.** The repo's PR dependency gating action uses that
  to block the child from merging until the parent merges. One
  `depends on` line per parent dependency.
- **Keep `mobile-apps/CHANGELOG.md` useful, not noisy.** Only
  *significant* user- or operator-visible changes go into
  `[Unreleased]`. In every PR, compact the section: merge related
  entries, drop vanity items (badges, internal refactors, test
  count bumps, formatting passes), rewrite for a future reader
  scanning for what changed.

### Three parallel implementations

- **Three apps are active right now:** `alloy-ios` (Swift /
  SwiftUI), `alloy-android` (Kotlin / Jetpack Compose), and
  `alloy` (Expo / React Native, targeting web + iOS + Android
  from one codebase). No archive decision has been taken. The
  user is evaluating which *feels* best on real hardware before
  any deprecation.
- **Parity across implementations.** When you add a feature or
  change a behaviour, update all three implementations in the
  same change OR explicitly call out the gap in the commit
  message and the diary. The specs under `mobile-apps/specs/`
  are the source of truth; implementations follow.

### Specs and documentation

- **Specs are the source of truth.** `mobile-apps/specs/` holds
  the authoritative descriptions of state machines, protocols,
  and interaction models that every implementation follows. Any
  behavioural change lands in the spec *first*, then in the
  implementations. If code diverges from the spec, fix the code
  or update the spec — never let them drift silently.
- **Keep a development diary.** For every major milestone
  scoping, significant project plan change, and interesting
  technical discovery, write a dated entry in
  `mobile-apps/docs/development/diary/`. Entries are
  backward-looking records of what was decided and *why* — not
  copies of planning documents. Naming: `YYYY-MM-DD-slug.md`.
- **Keep documentation in sync.** Any change to app behaviour,
  onboarding flows, backend integrations, or milestone scope
  must update the relevant files under `mobile-apps/docs/` and
  `mobile-apps/project-plan.md` in the same commit.
- **Be DRY.** Don't duplicate content between AGENTS.md,
  project-plan.md, specs, and the diary. AGENTS.md is
  agent-specific guidance only — architecture, design decisions,
  format specs, and milestone history live in their own files.

### Development discipline

- **Skateboard first.** Build the simplest end-to-end thing that
  works, then improve it. Before starting any feature, ask: "Is
  this blocking the next public milestone?" If not, flag it and
  move on. A bicycle-feature pull on a skateboard project is
  worth pushing back on.
- **Never paper over the real problem.** Make the proper fix.
  Don't propose workarounds that require user action when the
  software has enough information to solve it.
- **Record lessons.** When you fix something or finish
  implementing something, write the lessons into the diary
  entry for that work.

## Current status

M1 (volume control + onboarding wizard) is implemented in all
three parallel apps. Each target lives under `mobile-apps/`:

- `alloy-ios/` — native Swift/SwiftUI, Xcode 15+, XcodeGen.
- `alloy-android/` — native Kotlin/Jetpack Compose, Gradle 8, JDK 17.
- `alloy/` — Expo SDK 54 (React Native + Expo Web), TypeScript.

CI runs a workflow per subproject under `.github/workflows/`.
Product spec: [`project-plan.md`](project-plan.md). Diary:
[`docs/development/diary/`](docs/development/diary/).

## Key implementation guidance

- **The volume control is the canonical implementation of the
  app's UX principles.** Every other feature must inherit its
  interaction model: optimistic UI with decoupled intent and
  confirmed state, instant load, background work. See the UX
  principles section of `project-plan.md` for the full
  statement.
- **`VolumeTarget` abstraction.** The volume control consumes
  an injected `VolumeTarget` interface — never a concrete
  `DenonDirectTarget` or `HomeAssistantTarget` directly. Every
  future control surface follows the same pattern: one
  abstract target interface, one or more concrete backends,
  discovery feeds a unified picker.
- **Discovery is always two-source where possible.** Anywhere
  in the app where a user binds to a backend, discovery runs
  across a direct LAN lane and a Home Assistant lane, and
  presents the combined, deduplicated results in a single
  picker. The Expo app on web cannot do raw TCP, so on web
  only the HA lane is available; iOS/Android Expo targets
  retain the two-source pattern once the native Expo modules
  for mDNS/SSDP land.
- **Haptics are baseline, not polish.** Basic haptic feedback
  on value changes is table stakes for any drag control.
  Advanced curves, hold-to-repeat, etc. can follow later, but
  the default tick ships with any control the user interacts
  with.
