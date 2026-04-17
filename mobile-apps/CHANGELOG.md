# Changelog

All notable changes to the `mobile-apps/` project.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Each PR compacts the `[Unreleased]` section: merge related entries,
drop vanity items, keep what a future reader scanning for "what
changed" would actually want to know.

## [Unreleased]

### Added

- `mobile-apps/alloy/` — Expo (React Native + Expo Web) app that
  implements M1 (volume control + onboarding wizard) on web, iOS,
  and Android from one TypeScript codebase. Runs alongside the
  native Swift and Kotlin apps while the user evaluates which
  implementation feels best on hardware.
- Jest unit tests for the Expo app covering the pure-logic
  modules: throttle (trailing-edge + coalesce), ha-client
  (entity filter, WebSocket URL derivation), and volume-target
  (level/intent conversion, WebSocket handshake, state_changed
  event parsing).
- `alloy-ci.yml` workflow running type-check, lint, web build,
  and Jest unit tests for the Expo app.
- Android instrumentation tests (Compose UI smoke tests on a
  real emulator) now run in CI via `reactivecircus/android-
  emulator-runner@v2` with AVD snapshot caching.

### Changed

- `AGENTS.md` rewritten for the three-parallel-implementations
  model and synced with the current global rules
  (commit/push approval, never-commit-without-tests, CHANGELOG
  discipline, stacked PR `depends on #N`, skateboard-first).
- `project-plan.md` updated from "The two apps" to "The three
  implementations".
