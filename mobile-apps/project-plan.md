# Alloy — Mobile Companion Apps

> Codename: **Alloy**. A slick, modern, native remote for the home-theatre
> stack. Two apps: `alloy-ios` and `alloy-android`. Open source codebase,
> freemium pro tier (everything free at launch).

## Vision

The home-theatre remote landscape is fragmented and visually uninspired.
Every device ships its own app; most feel like an afterthought. There is
room for one tasteful, unified app for the whole sit-down-to-watch flow
— find something to play, start it, dial in volume and BEQ, fine-tune
levels, toggle accessibility, drive ezelemental tracks — behind a single
native interface.

The polish bar: every interaction should feel as slick and native as a
great volume knob. If a control isn't at that level, it isn't done.

## Goals

- **Native iOS and Android.** Two separate codebases (Swift + Kotlin),
  cross-pollinated by a shared feature spec and AI-assisted transpilation
  rather than a shared runtime.
- **Fluid, fast, modern.** First-class native feel, no webview-in-a-box.
- **Mobile-first.** Designed for phone-from-the-couch first, not as a
  shrunken desktop UI.
- **Standalone.** No desktop helper required to run the app.
- **Volume-knob polish bar** as the north star for every control.
- **Sustainable** via a paid pro tier — see Business model.

## Business model

- **Open source codebase + freemium pro tier.** Same shape as Sentry,
  Plausible, and Cal.com: source is open, revenue comes from a paid
  service / pro features rather than from selling a binary.
- **Free tier ships everything at launch.** There are no paywalled
  features on day one.
- **Pro scaffolding is built in from day one anyway.** Subscription
  management, entitlement checks, and the one-month free trial flow are
  wired up from the first release so individual features can be moved
  behind the paywall later without re-architecting the app.
- **One-month free trial** of pro on signup, applied automatically once
  pro features land.
- **Pro feature list is TBD** and deferred until after the first MVP.
- **Open codebase + paid app store apps:** not a blocker. The standard
  approach is server-side entitlement checks against App Store / Play
  Store receipts, so no client-embedded keys or secrets are required.
  Apps like Signal, Bitwarden, and Standard Notes ship the same way.

## The three implementations

Three parallel apps live under `mobile-apps/`. All three implement
the same specs; the user is evaluating which *feels* best on real
hardware before any deprecation.

| Directory | Stack | Platforms | Notes |
| --- | --- | --- | --- |
| `alloy-ios/` | Swift, SwiftUI | iOS | Native polish baseline |
| `alloy-android/` | Kotlin, Jetpack Compose | Android | Native polish baseline |
| `alloy/` | Expo SDK 54 (React Native + Expo Web), TypeScript | web + iOS + Android | Added for iteration velocity; one codebase, three platforms |

**Codebase strategy.** Build the same feature three times. Native
Swift and Kotlin give the highest polish ceiling; Expo gives the
highest iteration velocity and makes the feature available on the
web (and, via Expo's native builds, on iOS and Android as well).
Specs in `mobile-apps/specs/` are the source of truth for all three.

**Why keep three.** A cross-platform framework like Expo closes most
of the native polish gap, but the volume-knob polish bar is high
enough that a measurable hand-feel difference could still matter.
Until the user has spent time with each, none of them is retired.
When the comparison data points at one, the losers get archived — not
before.

**Fallback.** If the user decides one or both native codebases are
not pulling their weight against the Expo version, they get archived
(kept as reference) and development concentrates on the survivor.

## UX principles

The whole app is built around a single interaction model. The volume
control is the canonical example, but every section follows the same
pattern. These principles are not negotiable polish — they are how the
app *works*.

### Optimistic UI with decoupled intent and confirmed state

When the user adjusts a control, the UI responds *immediately* — no
waiting on the network. The control reflects the user's intent the
instant they touch it, and the request goes out in the background. When
the target device acknowledges the new value, a *separate* UI element
updates to show the device's confirmed state.

Two values are visible at once, side by side:

- **Intent** — what the user is currently setting it to. Updates in
  real time as they drag, with a precise numeric readout. The user
  always knows the exact integer they are dialling in.
- **Confirmed** — what the target device is actually at right now.
  Catches up to the intent value as acknowledgements come back from
  the device.

The reference frustration: most existing volume controls — the Denon
control app especially — only get half of this right. The slider drags
smoothly but the numeric readout lags behind the network, so users can
never see the precise value they're setting. Other controls get
*neither* half right and feel choppy. Alloy is the one that gets both:
see the value you're dialling in, *and* see the device catch up to it,
in real time, on the same screen.

### Instant load, background work

Every screen loads instantly. Cached state renders on launch or
navigation; fresh data updates in place when it arrives. There is no
spinner gating navigation, no full-screen loading state on the main
flows. The reference anti-pattern is the Denon control app, which gets
the volume interaction right but takes so long to launch that users
avoid opening it. Alloy cannot have that problem.

### Apply this everywhere

These principles are not volume-specific. Every section in
[Features](#features-ui-sections) — BEQ profile changes, channel
levels, media player commands, ezelemental triggers, library requests
— follows the same model: act locally and instantly, sync in the
background, surface the confirmed state separately when it arrives.
The volume control is the place this is *most felt*, so it gets the
canonical implementation; the rest of the app inherits the pattern.

## Onboarding and configuration

Every feature in the app binds to one or more backends (AV receivers,
ezBEQ profiles, MiniDSP devices, media players, Home Assistant
entities). Getting those bindings right on first launch is the
difference between an app that feels magical and one that feels like
a chore. Onboarding is a first-class part of the product, not an
afterthought bolted on before ship.

### Principles

- **Discovery first, manual always available.** On any backend
  binding screen, the app runs discovery in parallel across every
  channel it knows about (direct LAN, Home Assistant, etc.) and
  streams results into a unified picker. Manual entry is a
  first-class option on the same screen, never buried, so a user
  on a weird network is never stuck.
- **Two-source pattern, everywhere.** The baseline is direct-LAN
  discovery *plus* Home Assistant discovery, combined into one
  picker. This generalises: whenever a new backend type lands, both
  lanes are expected (direct + HA) unless there's a concrete reason
  otherwise.
- **Deduplicate across sources.** If the same device is found via
  multiple channels, show it once with a combined source tag and
  default the selection to the lowest-latency channel.
- **Test before commit.** Every binding screen ends with a "test
  this target" step that exercises the real protocol against the
  real device. If it fails, the user gets an inline warning and
  either a one-tap retry or a re-pick. No user should ever reach
  the home screen with a binding that doesn't actually work.
- **Re-runnable from settings.** Onboarding is never a one-shot.
  Settings exposes a re-run entry for every binding, so users can
  switch receivers, add Home Assistant connections, or rebuild
  their configuration without a reinstall.

### Home Assistant as a universal second lane

A Home Assistant connection is the second discovery lane for every
backend type the app supports. The app stores one HA connection per
install (host + long-lived access token), discovers the HA host over
mDNS on first run, and queries `/api/states` to enumerate relevant
entities for whichever backend the user is currently binding. The HA
connection is optional — a user with direct LAN access to everything
never has to touch it.

### First run

The first launch is always an onboarding flow. In M1, that flow
binds a single volume target (see the M1 diary entry and the
`specs/onboarding.md` spec). As later milestones ship, the first run
expands to cover more backend bindings, more wizard screens, all
following the principles above.

## Features (UI sections)

The app is organised around a small set of user-intent sections. Each is
one self-contained "reason to open Alloy" — a user might install Alloy
for any one of them and never touch the others. Each section maps to one
or more backends; the integration map is summarised at the end.

### 1. Volume control

The most-used surface in the app, and the canonical implementation of
the [UX principles](#ux-principles). A fluid, native control showing
two values at once: the **intent** (the integer the user is dragging
to, updated in real time as they move it) and the **confirmed** value
(what the target device is actually at, catching up as acknowledgements
arrive). Network requests happen in the background and never block the
interaction.

The active master is typically the Denon AVR, controlled directly over
the network; the section adapts to whichever device owns the master
volume in the user's setup. This is the part of the app the user has
the longest history with — it gets disproportionate attention because
it's the place where the bar is highest, and where every other section
inherits its model.

### 2. ezElemental control

Playback control for ezelementals tracks generated by ReelDesc.

**Initial scope.** The phone is a remote: it drives the **ReelDesc
studio server**, which in turn drives the playback hardware (lights,
fans, projectors, etc.) the same way it does today.

**Future "phone-only" mode.** The same agent-transpilation strategy that
keeps `alloy-ios` and `alloy-android` in sync should also be able to
port the ezelementals playback engine itself onto the phone. In that
mode, the phone *is* the ezelemental server: it talks to **Home
Assistant** for all device control (lights, projectors, fans, etc.) the
same way the standalone server does. This unlocks an "easy mode" where
the only thing a new user needs to play ezelemental tracks is their
phone — no separate server install. Requires:

- Device discovery and configuration UI (which AV gear is in the room,
  what HA entity each maps to)
- Calibration UI (level matching, latency, sync)
- All routed through Home Assistant — no custom device drivers in the
  app itself

### 3. ezBEQ control

Manage BEQ profiles via ezBEQ (which is bundled inside the ReelDesc
studio server):

- Profile selection
- Catalog browsing / search
- Channel selection (which target the profile applies to)
- Profile uploading to the chosen channel through ezBEQ

### 4. MiniDSP direct control

Per-channel volume and level adjustment on the MiniDSP itself —
independent of BEQ profile management. The fine-tuning surface for
speaker calibration and per-room corrections.

- Channel volume
- Channel levels
- **Focus mode** — lock the UI onto a single channel, audiology
  "driving mode" style, so adjustments stay precise without hunting
- Per-channel meters

Transport for these commands is still being decided: routed through
ezBEQ (the safe baseline) or direct from the app to the MiniDSP for
lower latency. The spikes (see [Next actions](#next-actions)) will
settle this.

### 5. Audio description playback

Play the audio description track for whatever the user is currently
watching, sourced from the **ReelDesc**-generated bundle for that
title. Sits next to the active media player so the user can toggle AD
on, scrub it back if they missed a line, switch language, etc.

### 6. Active media player control

Control whichever media player is currently playing — play, pause,
seek, skip, stop. The section detects the active player and surfaces
the right controls. Target players (Plex / Jellyfin / Kodi / etc.) and
discovery mechanism are TBD.

### 7. Media browser with request server

Browse the user's media library and request new content,
Overseerr / Jellyseerr / Ombi style. Three flows in one section:

1. **Browse** what's already in the library
2. **Request** something that isn't (the request server handles
   fulfilment)
3. **Play** — trigger the active media player to start playing the
   chosen item

This is the "I want something to watch" entry point; it ties all the
other sections together because once a title is playing, every other
section (volume, BEQ, AD, ezelemental) becomes relevant to it.

### Mobile remote mode (cross-cutting)

A stripped-down UI mode that any of the sections above can render into:

- Big buttons
- Only the active slot / channel / mode visible at once
- A single search box
- Optimised for one-handed use from the couch

### Backends at a glance

| Section | Talks to |
| --- | --- |
| Volume control | Denon AVR (direct), or whichever device owns master |
| ezElemental control | ReelDesc studio server now; Home Assistant directly in the future phone-only mode |
| ezBEQ control | ezBEQ (bundled in ReelDesc studio) |
| MiniDSP direct control | MiniDSP — via ezBEQ initially, direct comms under evaluation |
| Audio description playback | ReelDesc bundle for the active title |
| Active media player control | Plex / Jellyfin / Kodi / others (TBD) |
| Media browser + requests | Overseerr / Jellyseerr / Ombi (TBD) + active media player |
| Generic AV fallback | Home Assistant — for any device without a direct integration |

## Polish details

These get their own section because they *are* the bar.

- **Volume feel.** Haptics, response curve, hold-to-repeat — the volume
  control is the calibration test for everything else in the app.
- **Inspired by** the SVS subwoofer app for knob feel and layout density.
  Not copied — the goal is to internalise the feel and apply it to a
  wider control set.
- **Couch-distance legibility.** Type sizes, contrast, and tap targets
  designed for being read across a room, not held inches from the face.

## Tech decisions (open)

| Decision | Current direction | Notes |
| --- | --- | --- |
| Codebase strategy | Dual native + AI cross-transpile | Flutter is the documented fallback |
| Pro entitlement gating | Server-side check against App Store / Play Store receipts | Backend service TBD |
| MiniDSP comms path | ezBEQ (bundled in ReelDesc studio) | Spike to compare against direct comms for latency |
| Cross-codebase sync tooling | Open exploration | FlutterFlow, Shorebird, Cursor, Replit, hand-rolled prompts — no preference yet |
| App store + open source interplay | Confirmed not a blocker | Assume the client is fully readable; entitlement logic lives server-side |

## Competitive landscape

The existing field is fragmented and visually uninspired — there is room
for one tasteful, unified app.

- Anthem Remote — https://apps.apple.com/nz/app/anthem-remote/id1132341848
- Telepath AVR — https://www.oliverkl.com/telepath-avr/
- SVS subwoofer app — *inspiration* for knob feel and layout density
- Prior research thread — https://chatgpt.com/c/678d964a-4af4-8010-ab93-c03526f1717f

## Naming

- **Alloy** — codename, confirmed
- Backup ideas can collect here later (e.g. *OpenDSP Control*)

## Open questions

- Cross-codebase sync tooling (FlutterFlow vs Shorebird vs Cursor vs
  hand-rolled)
- Which features eventually move behind the pro paywall
- Pro entitlement backend design (where it runs, how it stores state,
  receipt validation flow)
- Whether direct MiniDSP comms is worth the cost vs ezBEQ-only
- Which media players to support first (Plex / Jellyfin / Kodi / others)
  and how to detect the *active* one
- Which request servers to support first (Overseerr / Jellyseerr / Ombi)
- How the media browser triggers playback on the active media player
  (per-player APIs vs a unified abstraction)
- Packaging strategy for the future phone-only ezelemental engine
  (port reel-desc to Swift/Kotlin? embed via FFI? something else?)
- Calibration UX for the phone-only ezelemental mode
- Scope of generic ReelDesc features inside Alloy beyond ezElements
  playback control and audio description

## Next actions

1. Spike: tiny SwiftUI iOS app talking to a real MiniDSP via ezBEQ.
2. Spike: equivalent Kotlin Android app, same scope, in parallel.
3. Spike: direct MiniDSP communication from each app — measure latency
   against the ezBEQ baseline.
4. Spike: prove the active-media-player-control loop end-to-end against
   one player (probably Plex or Jellyfin).
5. Spike: media browse + request flow against one request server
   (probably Overseerr or Jellyseerr).
6. Decide dual-native vs Flutter fallback based on spike outcomes.
7. Build the pro gating, subscription, and one-month-trial scaffolding,
   even though no features are paywalled at launch.
8. Define the initial pro feature list (deferred until after MVP).
