# Volume Target Spec

> **Status:** skeleton.
>
> **Implementations:** `alloy-ios/Alloy/Target/`,
> `alloy-android/app/src/main/kotlin/com/sharca/alloy/target/`.

`VolumeTarget` is the abstract interface every volume backend
implements. The volume view model consumes a `VolumeTarget` — it does
not know whether it is talking to a Denon AVR directly or to Home
Assistant.

## Interface

```
VolumeTarget:
  connect() -> void
  disconnect() -> void
  setVolume(intent: Int) -> void          # fire-and-forget
  observeConfirmed() -> Stream<Int>       # push-driven
  observeConnection() -> Stream<ConnectionState>
  volumeRange() -> IntRange               # e.g. 0..98 for Denon
```

All methods are non-blocking. `setVolume` never awaits a round-trip
— the view model fires, the target layer handles queueing, and
confirmed updates come back through `observeConfirmed()`.

## Implementations (M1)

- **`DenonDirectTarget(host, port)`** — uses a persistent Telnet
  connection (see [`denon-telnet.md`](denon-telnet.md)) for both
  commands and push updates. `volumeRange` comes from the `MVMAX`
  response the AVR sends on connect.
- **`HomeAssistantTarget(haConnection, entityId)`** — uses HA REST
  for `setVolume` (`media_player.volume_set`) and HA WebSocket
  (`state_changed` subscription) for confirmed updates. See
  [`home-assistant-api.md`](home-assistant-api.md). `volumeRange` is
  derived from the entity's `attributes.volume_step` and the 0.0–1.0
  normalized scale.

## Bound target lifecycle

- One target is bound at a time per install.
- The target's identity and connection parameters persist in
  settings. Secrets (HA token) live in the platform secure store.
- Binding is re-runnable from the onboarding wizard via the
  settings screen — users can switch targets without reinstalling.

## Discovery

Both M1 implementations have a companion discovery service:

- `DenonDiscovery` — SSDP/UPnP + mDNS
- `HomeAssistantDiscovery` — mDNS for the HA host, then entity
  enumeration via `/api/states`

Discovery results from both sources flow through a combiner that
deduplicates (match on `(ip, modelName)`) and presents a unified list
to the onboarding wizard's picker.
