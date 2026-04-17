# Device Setup

ReelDesc controls physical effect devices via Home Assistant. Each device maps to an effect channel and declares its physical characteristics.

## Supported devices

| Device | Type | Channel | Latency | Notes |
|--------|------|---------|---------|-------|
| Digital fan (PWM) | Fan | `wind` | ~0s | Speed proportional to intensity |
| Fan (relay / smart plug) | Fan | `wind` | ~0s | Binary on/off |
| Water mister (solenoid) | Mister | `water` | 2–3s | Binary; ceiling or directional mount |
| Water mister (PWM) | Mister | `water` | 2–3s | Variable spray rate |
| Quartz / halogen radiant heater | Heater | `heat_radiant` | 1–2s | Near-instant burst; fire, explosions |
| Panel heater (binary) | Heater | `heat_ambient` | 30–60s | Simple on/off |
| Space heater (thermostat) | Heater | `heat_ambient` | 30–60s | Sustained ambient warmth |
| Air conditioner | Cooling | `heat_ambient` | 3–5 min | Suppressed for short scenes |
| Smart bulb (proxy) | Proxy | any | ~0s | Stand-in for testing: blue=wind, cyan=water, red/amber=heat |

## Device configuration

Each device declares:

| Field | Description |
|---|---|
| `entity_id` | Home Assistant entity ID |
| `channel` | Effect channel: `wind`, `water`, `heat_ambient`, `heat_radiant` |
| `latency_ms` | Warmup time before effect is perceptible (user-calibrated) |
| `sustain_min` | Minimum scene duration to justify triggering |
| `intensity_range` | Hardware min/max mapping from the 0–3 intensity scale |
| `type` | `continuous` (0–100%) or `binary` (on/off) |

## Playback sync

Home Assistant provides the playback position — no audio fingerprinting needed. The scheduler pre-triggers devices based on their declared latency so effects arrive on time.

## Stand-in devices

Any device can substitute for another during testing. A smart bulb can stand in for a fan, mister, or heater by mapping colours to channels. Configure in the Device Config page of the Studio UI.

## Planned adapters

- Home Assistant (current, first adapter)
- Zidoo API (future)
- Plex webhooks (future)
- Kodi (future)
