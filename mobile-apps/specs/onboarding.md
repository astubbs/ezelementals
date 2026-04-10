# Onboarding Wizard Spec

> **Status:** skeleton.
>
> **Implementations:** `alloy-ios/Alloy/Onboarding/`,
> `alloy-android/app/src/main/kotlin/com/alloyremote/alloy/onboarding/`.

The onboarding wizard is the app's first-launch experience and is
re-runnable from settings. Its only job in M1 is to bind a single
`VolumeTarget`.

## Screens (M1)

1. **Welcome.** One sentence: "Let's find your AV receiver." One
   primary button: *Get started*. No account signup, no feature
   tour.
2. **Discovery running.** Runs Denon direct discovery and (optional)
   Home Assistant discovery in parallel. Discovered AVRs stream into
   a live list with a source tag ("direct" / "via Home Assistant").
   "Connect Home Assistant" appears as a secondary action on this
   screen — skippable if the user only wants direct discovery.
3. **Home Assistant connect** (conditional on the user tapping
   "Connect Home Assistant"). Two legs:
   - **Auto-discover HA host** via mDNS
     (`_home-assistant._tcp.local.`). If one HA instance is found,
     suggest it with a single-tap confirm.
   - **Manual URL entry** as an equal-weight fallback.
   Then: **long-lived access token** paste field with in-screen
   instructions and a link to HA's profile page. The wizard tests
   the token with a `GET /api/` ping before advancing. The token is
   stored in the platform secure store (Keychain on iOS,
   EncryptedSharedPreferences on Android).
4. **Target picker.** A single scrollable list merging results from
   both discovery lanes. Deduplication: if the same device is
   discovered by both legs (matched on `(ip, modelName)`), show one
   row labelled "direct + via Home Assistant", defaulting to direct
   on selection. Each row: friendly name, model, source tag, IP.
5. **Test connection.** Briefly opens the selected target, queries
   the current volume, and shows a live preview ("Tap + / − to test"
   or similar). This gives the user confidence that the binding
   works before committing.
6. **Done.** One button: *Start using Alloy*. Proceeds to the
   volume control screen.

## State machine

```
welcome
   │
   ▼
discovering ◄──────────────────┐
   │                           │
   ├─► connecting-ha ───┐      │
   │       │            │      │
   │       ▼            │      │
   │   ha-connected ────┘      │
   │                           │
   ▼                           │
picking                        │
   │                           │
   ▼                           │
testing ─── fail ──────────────┘
   │
   ▼
done
```

Details (guard conditions, side effects, transition triggers) fill
in as the view model is implemented. Both platforms share the same
state machine; a divergence is a bug in one of the implementations,
not a spec issue.

## Fallbacks

- **Zero discoveries on both legs** → the wizard offers manual
  entry for both Denon (IP + port) and HA (URL + token) as equal,
  first-class options on the discovery screen. Never dead-end.
- **HA auth failure** → inline error on the token screen with a
  retry. Never a dead-end.
- **Test connection failure** → return to the picker with a warning
  label on that target, but still allow the user to re-pick or retry.

## Copy guidelines

- No jargon. "AV receiver", not "endpoint". "Home Assistant", not
  "HA API".
- No feature tour. The wizard's only job is to bind a target, not
  to sell the user on the app.
- One primary action per screen.
- Error messages are one sentence, human, no stack-trace residue.
