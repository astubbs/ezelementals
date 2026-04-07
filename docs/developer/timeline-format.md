# Timeline Format (`timeline.jsonl`)

The timeline is the core artifact of ReelDesc — a dense, per-frame semantic description of a video. All export formats derive from it. The community shares timelines; exports are generated locally.

## Format

Newline-delimited JSON (JSONL). One object per frame, sorted by timestamp.

## Schema

```jsonl
{"t": 312.5, "frame_idx": 156, "description": "Desert highway, massive sandstorm approaching from rear. Two vehicles racing through sand. Orange-brown dust fills frame.", "audio": "Deep rumbling wind, engine roar, metallic clanking", "scene_type": "exterior_desert", "motion": "high", "wind": 2, "wind_direction": "rear", "water": 0, "water_type": "none", "heat_ambient": 1, "heat_radiant": 0, "confidence": 0.91}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `t` | float | Timestamp in seconds from start of video |
| `frame_idx` | int | Frame index (sequential) |
| `description` | string | Natural language visual scene description |
| `audio` | string | Natural language audio description |
| `scene_type` | string | Scene classification (e.g. `exterior_desert`, `interior_vehicle`) |
| `motion` | string | Motion level: `none`, `low`, `medium`, `high` |
| `wind` | int 0–3 | Wind intensity: 0=none, 1=subtle, 2=moderate, 3=intense |
| `wind_direction` | string | Wind direction: `frontal`, `side`, `rear`, `surround`, `none` |
| `water` | int 0–3 | Water intensity |
| `water_type` | string | Water type: `rain`, `spray`, `immersion`, `none` |
| `heat_ambient` | int 0–3 | Sustained heat intensity (deserts, jungles) |
| `heat_radiant` | int 0–3 | Burst heat intensity (explosions, fire) |
| `confidence` | float 0–1 | Model confidence in the classification |

### Planned fields (future)

| Field | Type | Description |
|---|---|---|
| `cold` | int 0–3 | Cold intensity (ice, snow, blizzard) |
| `fog` | int 0–3 | Fog/smoke/haze intensity |

## Design decisions

- **Monolithic**: description + elemental fields are produced in a single VLM call, not separate passes. This avoids premature optimisation and means every timeline contributor generates elemental data regardless of their primary use case.
- **Human-readable descriptions**: the `description` and `audio` fields are natural language, not structured — they're the richest representation and the source from which future profiles (AD, visual descriptions) can derive their outputs.
- **Intensity scale 0–3**: deliberately coarse. The playback system maps to hardware-specific ranges. Fine-grained intensity comes from optical flow supplementation (future).
