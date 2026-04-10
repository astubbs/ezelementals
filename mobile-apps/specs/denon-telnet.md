# Denon Telnet Protocol Reference (M1 subset)

> **Status:** skeleton.
>
> **Applies to:** `DenonDirectTarget`, `DenonConnection`,
> `DenonCommand`, `DenonDiscovery`.

Minimal subset of the Denon/Marantz network protocol used by Alloy
in M1. Full protocol documentation is not republished here — this
file captures what we actually use, plus any quirks we hit in
practice.

## Connection

- TCP, port **23**, ASCII.
- Commands terminated with `\r` (0x0D). Some sources say `\r\n` —
  `\r` alone works on all models tested.
- Responses terminated with `\r`.
- The connection is **persistent**: leave it open to receive
  unsolicited push updates when the volume changes from another
  source (physical remote, other app, etc.).
- Reconnect with exponential backoff on error.

## Discovery

- **SSDP / UPnP:** Denon/Marantz AVRs announce themselves over
  SSDP. Multicast an `M-SEARCH` on `239.255.255.250:1900` with
  `ST: ssdp:all` (or a narrower service type) and parse the device
  descriptor XML at the advertised `LOCATION` URL for `friendlyName`
  and `modelName`.
- **mDNS:** newer models announce over mDNS as well. Browse for
  Denon-specific service types (to be enumerated here as we test
  actual hardware).
- Both legs run in parallel; results flow into the discovery
  combiner.

## Master volume (MV) command family

| Command | Meaning |
| --- | --- |
| `MV?\r` | Query master volume |
| `MVxx\r` | Set master volume to `xx` (00–98, whole steps) |
| `MVxxx\r` | Set master volume to `xx.5` (e.g. `MV505` = 50.5) |
| `MVUP\r` | Increment |
| `MVDOWN\r` | Decrement |

## Responses

- `MVxx\r` — current master volume.
- `MVMAX xx\r` — maximum allowed master volume. Sent unsolicited
  after `MV` replies, usually on connect. Use this to clamp the
  target's `volumeRange`.

## Push behaviour

- When the user changes volume via another source, the AVR emits an
  unsolicited `MVxx\r` on any open connection. This is the push
  signal the `confirmed` state model depends on.
- **Do not poll.** The persistent connection carries everything we
  need; polling would interfere with the push channel and waste
  battery.

## Known quirks

TBD — fill in as model-specific weirdness is encountered. Suggested
quirk-log format:

- **Model:** e.g. AVR-X3700H
- **Firmware:** as reported by the AVR
- **Issue:** one sentence
- **Workaround:** what we do about it in code
