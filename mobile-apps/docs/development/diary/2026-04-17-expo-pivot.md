# 2026-04-17 — Expo added as a third parallel implementation

## Summary

Added `mobile-apps/alloy/`, an Expo (React Native + Expo Web)
app targeting web, iOS, and Android from one TypeScript codebase.
It implements M1 (volume control + onboarding wizard) against the
same `mobile-apps/specs/` that drive the native Swift and Kotlin
apps. The native apps are **not** archived. All three stay active
until the user has spent time with each and can decide on feel.

## Why Expo, why now

The user flagged web apps as "so much faster for fleshing out
functionality" and asked whether React (and by extension React
Native) would leave the door open to cross-platform mobile from
the same codebase. It does, and Expo makes it structural:

- `npx expo start --web` is a React + Vite-speed browser app.
- `npx expo start --ios` and `--android` ship the same code as a
  real native app via the Expo runtime.
- Zero transpilation step, zero drift between platforms, one
  TypeScript codebase.

The bet: feature work happens on Expo first, because the
iteration loop is an order of magnitude faster than recompiling
Swift or Kotlin. Whatever sticks then gets mirrored (or not) to
the native implementations, depending on how they compare on
feel.

## Why the native apps stay

Expo is *good* but it is not *native*. The volume-knob polish
bar is the north star for the whole app, and it's high enough
that a measurable hand-feel difference between a real SwiftUI
slider and a React Native one could matter. The only way to
know which wins is to put all three in front of the user on real
hardware and let them report back. Premature consolidation
would make that comparison impossible.

So no archive banner, no removal. Three apps in parallel, each
with its own CI. When the user reports their verdict, the
losers get archived.

## What Expo delivers at M1 parity

Every M1 feature from the spec, running on all three Expo
targets:

- **Volume control** with dual intent/confirmed readout,
  throttled sends (100 ms trailing-edge), optimistic UI.
- **Onboarding wizard**: welcome → HA connect (URL + long-lived
  access token) → discovery → target picker → test connection
  → done.
- **`VolumeTarget` abstraction** with a `HomeAssistantTarget`
  implementation. Same shape as the native implementations'
  `VolumeTarget` / `HomeAssistantTarget`, ported to
  TypeScript.
- **HA REST + WebSocket** for commands and push. The code is
  identical on web and native Expo targets because `fetch` and
  `WebSocket` are browser-native APIs that React Native
  implements with the same shape.

Files of note:

- `src/lib/throttle.ts` — trailing-edge throttle, same rules
  as the Swift / Kotlin equivalents.
- `src/lib/ha-client.ts` — HA REST helpers, entity filtering,
  WebSocket URL derivation.
- `src/lib/volume-target.ts` — `VolumeTarget` interface +
  `HomeAssistantTarget`. All platform-agnostic; no RN imports.
- `src/hooks/useVolumeTarget.ts` — React hook wiring the
  throttle, confirmed-state updates, and drag lifecycle.
- `app/onboarding/*` — Expo Router stack for the wizard.
- `app/(tabs)/index.tsx` — the volume control screen.

## The HA-only scope trade-off on web

Browsers don't have raw TCP sockets, so the Denon-direct
Telnet path doesn't work on web. The Expo app on web therefore
only supports the Home Assistant lane: the user authenticates
against HA with a long-lived access token, and Alloy queries
HA's REST + WebSocket APIs to discover AVRs and control
volume. Both are browser-native.

On iOS and Android Expo targets, the raw-TCP limitation does
not apply in theory — but the native Expo modules for
SSDP/mDNS discovery and TCP Telnet are not yet wired up, so
those targets are also HA-only at M1. Adding native Denon-
direct support on the mobile Expo targets is a separate
follow-up; HA covers the primary use case for now.

## CI change: Android instrumentation tests now run

Previously `alloy-android-ci.yml` ran unit tests and lint only
— it did not exercise the Compose UI smoke tests
(`WelcomeSmokeTest`) because those need a real Android
runtime. Fixed in this pass by adding a second job using
`reactivecircus/android-emulator-runner@v2` on macos-latest
(nested virt is reliable there), running
`:app:connectedDebugAndroidTest` against an API 34 Pixel 7
AVD. AVD snapshot is cached so the emulator cold boot only
happens on the first run per cache key.

## Known gaps

- **Hook tests deferred.** `useVolumeTarget` and `useSettings`
  are not covered by Jest yet. That would need
  `@testing-library/react-native` and a bit of RN test
  environment setup. The pure-logic modules (throttle,
  ha-client, volume-target) are covered by Jest and give the
  load-bearing coverage for M1.
- **Denon-direct on Expo mobile targets.** The Expo iOS and
  Android builds don't do SSDP/mDNS discovery or Telnet yet.
  HA-only for now; custom native modules would be needed to
  lift this.
- **EAS Build** for iOS/Android previews on PR is not wired
  up. Needs an Expo account + credits. Deferred.

## Lessons

- **Path-filtered CI per subproject** scales. Each of the
  three implementations has its own workflow; a Swift change
  never boots an Android emulator and vice versa.
- **Specs + three implementations** is not as redundant as it
  sounds when the specs are tight enough. `volume-target.md`
  and `volume-control.md` drove all three code ports without
  meaningful drift on the state machines; the drift that did
  exist was all in UI presentation (expected) and not in
  behaviour.
- **Pure-logic modules first, hook tests later** is the right
  skateboard. All three test files for Expo are free of RN
  imports, which means no jest-expo jsdom issues. Hook
  coverage can come in a focused follow-up.
