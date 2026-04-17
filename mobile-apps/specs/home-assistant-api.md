# Home Assistant API Reference (M1 subset)

> **Status:** skeleton.
>
> **Applies to:** `HomeAssistantTarget`, `HomeAssistantConnection`,
> `HomeAssistantDiscovery`, `HomeAssistantAuth`.

The M1 subset of the Home Assistant API used by Alloy. Not a complete
reference — only the endpoints the app actually touches.

## Auth

- **Long-lived access token (LLAT).** Users create one in their HA
  profile page → *Long-Lived Access Tokens*. They paste it into
  the onboarding wizard; the app stores it in the platform secure
  store (Keychain on iOS, EncryptedSharedPreferences on Android).
- All requests include `Authorization: Bearer <token>`.
- OAuth is deferred; see the
  [M1 scope diary entry](../docs/development/diary/2026-04-11-m1-scope.md)
  for reasoning.

## Host discovery

- mDNS service type: `_home-assistant._tcp.local.`
- On discovery, offer the found host with a one-tap confirm in the
  HA connect screen.
- If mDNS finds nothing, fall back to manual URL entry (e.g.
  `https://ha.example.com:8123`).

## Endpoints used

### `GET /api/` — auth ping

Trivial token test used at the end of the HA connect screen. Expect
`200 OK` with a body like `{"message": "API running."}`.

### `GET /api/states` — entity enumeration

Returns all HA entity states. Filter client-side for entities whose
`entity_id` begins with `media_player.` and whose attributes look
like an AV receiver (heuristics TBD as we see real data — probable
signals include `device_class: "receiver"`, vendor name in
`attributes.friendly_name`, etc.).

Each matched entity becomes a `DiscoveredAvr` row fed into the
picker.

### `POST /api/services/media_player/volume_set` — set volume

```
POST /api/services/media_player/volume_set
Content-Type: application/json
Authorization: Bearer <token>

{
  "entity_id": "media_player.denon_avr_x3700h",
  "volume_level": 0.42
}
```

`volume_level` is 0.0–1.0. Convert to/from the integer intent
value using the target's reported volume range:

```
level = intent / volumeRange.max
```

Round-trip with `volume_step` for granularity where needed.

## WebSocket push updates

Alloy subscribes to `state_changed` events over the HA WebSocket
API so `HomeAssistantTarget` has parity with Denon direct's push
behaviour.

1. Connect to `/api/websocket`.
2. Receive `auth_required`.
3. Send `{"type": "auth", "access_token": "<token>"}`.
4. Receive `auth_ok`.
5. Send
   `{"id": 1, "type": "subscribe_trigger", "trigger": {"platform": "state", "entity_id": "<entity>"}}`
   (or subscribe to `state_changed` events and filter client-side).
6. On each matched event, read the new state's
   `attributes.volume_level` and update `confirmed`.

Reconnect with the same exponential backoff policy the Denon Telnet
connection uses.

## Known quirks

TBD. Suggested quirk-log format:

- **HA version:** e.g. 2026.3.2
- **Integration:** the HA integration the user is running (Denon
  AVR, HEOS, DLNA, etc.)
- **Issue:** one sentence
- **Workaround:** what we do about it in code
