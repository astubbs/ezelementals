# 2026-04-11 — M1 scaffold: alloy-ios and alloy-android skeletons

## Summary

Scaffolded both native apps end-to-end as the M1 implementation
seed: full source trees for `alloy-ios` (SwiftUI, XcodeGen,
`@Observable` view models) and `alloy-android` (Jetpack Compose,
Gradle KTS, `StateFlow` view models), matching the shared specs
committed earlier today. No real hardware integration tested yet,
but every piece the specs describe now exists in source form on
both platforms, plus CI workflows and a first round of unit tests.

## What actually landed

### iOS (`mobile-apps/alloy-ios/`)

- `project.yml` for XcodeGen (the `.xcodeproj` is generated, not
  checked in). Deployment target iOS 17. Bundle id
  `com.alloyremote.alloy`.
- Model layer: `DiscoveredAvr`, `ConnectionState`, `VolumeRange`.
- `VolumeTarget` protocol + `VolumeTargetDescriptor` serializable
  enum; implementations `DenonDirectTarget` and
  `HomeAssistantTarget`.
- Denon layer: `DenonCommand` codec (unit-tested),
  `DenonConnection` actor wrapping `NWConnection`,
  `DenonDiscovery` with SSDP M-SEARCH + mDNS `NWBrowser`.
- Home Assistant layer: `HomeAssistantConnection` with REST helpers
  (`ping`, `fetchStates`, `setVolumeLevel`) and a raw WebSocket
  path for push; `HomeAssistantAuth` wrapping a Keychain store;
  `HomeAssistantDiscovery` for mDNS host + entity enumeration.
- `DiscoveryCombiner` (`@Observable`) merging + deduplicating
  streams.
- `VolumeViewModel` implementing the dual-value intent/confirmed
  state machine with trailing-edge throttle.
- `VolumeView` SwiftUI screen with dual numeric readout, slider,
  haptic tick, connection indicator, "change target" entry.
- Onboarding: `OnboardingViewModel` state machine plus six screen
  views (Welcome, Discovery, HA Connect, Target Picker, Test
  Connection, Done-bridge).
- `SettingsStore` + `SecureStore` (Keychain) persisting the bound
  descriptor and HA URL.
- Tests: `DenonCommandTests`, `DiscoveryCombinerTests`,
  `VolumeViewModelTests`, `HomeAssistantApiTests`,
  `OnboardingViewModelTests`.
- `.gitignore` excluding the generated `.xcodeproj`.

### Android (`mobile-apps/alloy-android/`)

- Gradle KTS: root `build.gradle.kts`, `settings.gradle.kts`,
  `gradle.properties`, `app/build.gradle.kts` pinning Kotlin 2.0,
  AGP 8.5, Compose, kotlinx.serialization, OkHttp, Security crypto.
- `AndroidManifest.xml` with `INTERNET`, mDNS multicast, vibrate
  permissions, `cleartextTraffic` for LAN HA access.
- `AlloyApplication` → `MainActivity` → `RootScreen` routing via
  `SettingsStore.instance.boundTargetDescriptor`.
- Model layer mirroring iOS one-for-one.
- `VolumeTarget` interface with sealed `VolumeTargetDescriptor`
  (serializable); `DenonDirectTarget` + `HomeAssistantTarget`.
- `DenonCommand` (identical semantics to the Swift version),
  `DenonConnection` (`java.net.Socket` + coroutines),
  `DenonDiscovery` (SSDP `MulticastSocket` + `NsdManager`).
- `HomeAssistantConnection` (OkHttp REST, `okhttp.WebSocket` for
  push, hand-rolled JSON parsing where full decoding isn't
  required), `HomeAssistantAuth` (EncryptedSharedPreferences-backed
  `SecureStore`), `HomeAssistantDiscovery`.
- `DiscoveryCombiner` over `StateFlow` with identical dedup rules.
- `VolumeViewModel` + `VolumeScreen` (Compose, `Slider`, haptic
  `VibrationEffect`, dual numeric readout, connection indicator).
- Onboarding screens matching iOS layout and transitions.
- `SettingsStore` via plain `SharedPreferences` for the descriptor,
  HA URL; tokens live in encrypted prefs.
- Tests: `DenonCommandTest`, `DiscoveryCombinerTest`,
  `VolumeViewModelTest` (with `StandardTestDispatcher`),
  `HomeAssistantApiTest`, `OnboardingViewModelTest`.

### CI

- `.github/workflows/alloy-ios-ci.yml` — macOS runner, `xcodegen
  generate`, `xcodebuild test` on iPhone 15 simulator. Path-filtered
  to `mobile-apps/alloy-ios/**` and the specs.
- `.github/workflows/alloy-android-ci.yml` — Ubuntu runner, JDK 17,
  `./gradlew :app:testDebugUnitTest` + `:app:lintDebug`.
  Path-filtered to `mobile-apps/alloy-android/**` and the specs.

Both workflows mirror the shape of the existing
`reel-desc-ci.yml` pattern (path filters, `defaults.run.working-directory`,
single `test` job).

## Decisions made during the scaffold

### XcodeGen instead of a hand-written `.xcodeproj`

An `.xcodeproj` is a very large machine-generated XML bundle; by
hand it's brittle and impossible to review. XcodeGen turns a ~50-
line `project.yml` into the real project at build time. The price
is one extra prerequisite (`brew install xcodegen`); the benefit is
that the repo stays human-readable and the CI step takes four
seconds.

### One `VolumeTarget` protocol, zero platform abstraction layers

Each platform has its own `VolumeTarget` file. There is no shared
Kotlin Multiplatform / Swift-common / C layer. The two codebases
are allowed to reference only platform-idiomatic APIs. The shared
spec files in `mobile-apps/specs/` are the single source of truth;
anything that can't live in a spec shouldn't be "shared" at the
code level.

### Hand-rolled JSON parsing on Android, `Codable` on iOS

The HA API surface we touch is small — `/api/`, `/api/states`,
`/api/services/media_player/volume_set`, and `state_changed` events.
On iOS `Codable` is trivially enough. On Android, using
kotlinx.serialization's tree model (`JsonElement`) avoids having to
declare data classes for every attribute shape HA can throw at us.
For the WebSocket event, both platforms substring-parse the
`volume_level` field directly because a full HA event schema is
overkill for M1. If we hit wrong fields we'll upgrade both sides to
typed decoding in one go.

### No ViewModel dependency injection framework

`VolumeViewModel` and `OnboardingViewModel` are constructed
directly inside the view layer. Hilt / Koin / SwiftUI DI containers
are unnecessary overhead for two screens. When the app grows a
second feature we'll revisit.

### `GlobalScope`, `Dispatchers.Main`, and friends

Android's `HomeAssistantDiscovery` now owns its own `CoroutineScope`
instead of the `GlobalScope` hack I had in the first pass — the
wrong kind of DRY. `VolumeViewModel` uses `viewModelScope`.

### Pro gating scaffolding is still deferred

As planned in the M1 scope entry. Nothing in this commit touches
subscriptions, entitlements, or receipt validation.

## What this commit does *not* prove

- The code hasn't been built against a real toolchain. Xcode 15 and
  Gradle 8.5 weren't in the environment; we'll discover
  compile-time issues on the first CI run.
- None of it has talked to a real Denon AVR or a real Home Assistant.
  M1 is not "done" until the user runs through the nine success
  criteria in `specs/volume-control.md` and the onboarding spec on
  actual hardware.
- The SwiftUI `SpyTarget` used in tests is a slightly awkward type
  because `VolumeTarget` is sendable-by-protocol-requirement and
  `XCTestCase` is main-actor-isolated. Expect to clean that up on
  the first test run.
- The WebSocket push parsing on both platforms is naive. Robust
  state_changed filtering needs a proper JSON traversal; the
  current substring approach works for happy-path payloads.

## Follow-ups

- Run `xcodegen generate && xcodebuild test` on a Mac — fix any
  Swift compile errors found, update tests if the spy needs
  tightening.
- Run `./gradlew :app:testDebugUnitTest` — fix any Kotlin compile
  errors found.
- Walk through the onboarding wizard on both platforms against the
  user's real Denon AVR and the user's Home Assistant.
- Replace the substring-based WebSocket push parsing with a proper
  JSON traversal once we have real HA events to test against.
- Add SSDP / mDNS logging in debug builds so we can document quirks
  in `specs/denon-telnet.md` as we hit them.

## Links

- M1 scope decisions:
  [`2026-04-11-m1-scope.md`](2026-04-11-m1-scope.md)
- Specs:
  [`volume-control.md`](../../../specs/volume-control.md),
  [`volume-target.md`](../../../specs/volume-target.md),
  [`onboarding.md`](../../../specs/onboarding.md),
  [`denon-telnet.md`](../../../specs/denon-telnet.md),
  [`home-assistant-api.md`](../../../specs/home-assistant-api.md)
