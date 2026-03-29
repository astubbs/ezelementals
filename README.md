# ezElementals

Automated 4D home theatre effects for wind, water, and heat — synchronized to movie playback using LLM-based video/audio classification.

The automated track generator is the unlock that prior projects (HTFanControl) never had, removing the bottleneck of hand-authoring every track.

**Status:** M0 Spike

## How it works

1. Extract scene-change frames and audio spectrograms from a video file
2. Classify each sample with a vision-language model (Qwen2.5-VL via Ollama)
3. Run-length encode the results into a `.3fx` effect track — timestamped wind/water/heat intensity values
4. Play back via Home Assistant, which triggers physical devices in sync with the movie

## Architecture

### Pipeline

```
video.mkv
  │
  ├─ ffmpeg (fixed-rate extraction, default 0.5fps)
  │    └─ fps=0.5,showinfo  →  frames/0001.jpg, 0002.jpg …
  │
  ├─ ffmpeg (per-frame audio window)
  │    └─ -ss <t-1s> -t 2s → wav → librosa mel spectrogram → spec.png
  │
  ├─ Ollama (Qwen2.5-VL-7B, one call per frame)
  │    ├─ input:  frame.jpg + spec.png (both base64-encoded)
  │    └─ output: { wind, water, heat_ambient, heat_radiant, confidence }
  │
  ├─ run-length encode  →  collapse identical consecutive frames
  │
  └─ output.3fx  (newline-delimited JSON, one entry per effect change)
```

### Frame processing

Each scene-change frame is processed as a **pair** — one video frame and one audio spectrogram — sent together in a single Ollama inference call:

```
frame.jpg  ──────────────────────────────────────────────────────┐
  64×64+ JPEG, RGB                                               │
  captures: fire, water, dust, weather, scene type               │
                                                                  ├──▶  Qwen2.5-VL
spec.png  ───────────────────────────────────────────────────────┘      /api/generate
  mel spectrogram, 2s window centred on frame timestamp                 (JSON format)
  128 mel bands, greyscale PNG                                           │
  captures: wind rumble, rain hiss, explosion LFE                       │
                                                                         ▼
                                              { "wind": 2,
                                                "wind_direction": "frontal",
                                                "water": 0,
                                                "water_type": "none",
                                                "heat_ambient": 1,
                                                "heat_radiant": 0,
                                                "confidence": 0.88 }
```

The spectrogram is the stronger signal for wind and water — audio contains information that isn't visible in a single frame (off-screen rain, sustained wind, approaching explosion). The frame provides scene context (fire, desert, ocean spray).

Low-confidence results (`< 0.7`) are flagged for manual review and kept in the output rather than silently dropped.

### Effect format (`.3fx`)

Newline-delimited JSON — one object per effect change, sorted by timestamp:

```json
{"t": 0.0,   "wind": 0, "water": 0, "heat_ambient": 0, "heat_radiant": 0}
{"t": 312.5, "wind": 2, "water": 0, "heat_ambient": 1, "heat_radiant": 3}
{"t": 318.0, "wind": 3, "water": 0, "heat_ambient": 1, "heat_radiant": 0}
{"t": 401.2, "wind": 0, "water": 2, "heat_ambient": 0, "heat_radiant": 0}
```

Intensity scale: `0` = none, `1` = subtle, `2` = moderate, `3` = intense.

### LLM profiles

| Profile  | Model              | Speed     | VRAM  | Time / film |
|----------|--------------------|-----------|-------|-------------|
| Fast     | Qwen2.5-VL-7B Q4   | ~0.33 fps | ~8GB  | 30–54 min   |
| Accurate | Qwen2.5-VL-32B Q5  | ~0.5 fps  | ~22GB | 5–6 hrs     |

Two-pass mode available: 7B flags uncertain frames, 32B re-classifies them (~20–30% of total).

### Spatial effects model (target design)

The goal is an **Atmos-like spatial model for physical effects** — not just intensity, but direction and character, decoded at playback time to however many physical devices you have installed.

**Wind** is the most spatially expressive channel. A scene inside a storm has wind coming from all directions and shifting; a racing scene has strong frontal wind. The `.3fx` track carries directional metadata (`frontal`, `side`, `rear`, `surround`), and the playback engine maps that to your fan layout — just as an Atmos renderer maps a point audio source to your speaker array. A system with one fan gets a simple speed value; a system with front/side/rear fans gets independent speeds that simulate directionality.

**Water** splits into two types with different hardware implications:
- *Rain / overhead precipitation* — prefers ceiling-mounted mist emitters; intensity controls spray volume
- *Directional spray* — e.g. waves, splashes, waterfalls — directional metadata points at the source, playback maps to mist emitters closest to that direction

**Heat** stays closer to ambient character than direction:
- *Ambient heat* (`heat_ambient`) — sustained warmth from a space heater; suits deserts, jungles, enclosed spaces
- *Radiant heat* (`heat_radiant`) — sharp burst from quartz/halogen elements; suits explosions, fire flash, muzzle flare

The `.3fx` format is designed to carry this richer metadata while remaining backwards-compatible — a playback system with only a single front fan and no misters simply ignores directional and water fields it can't use.

This spatial layer is **not yet implemented** — current M0 tracks carry intensity only. It is the target for M2+.

### Playback

Home Assistant provides the playback position — no audio fingerprinting needed. The `.3fx` file is a `timestamp → effect` lookup table; HA automations pre-trigger devices based on their latency.

| Device        | Latency   |
|---------------|-----------|
| Fan           | ~0s       |
| Mister        | 2–3s      |
| Radiant heater| 1–2s      |
| Space heater  | 30–60s    |
| AC            | 3–5 min   |

## Usage

```sh
# Install dependencies
uv sync

# Generate a .3fx track (requires local Ollama with Qwen2.5-VL)
bin/generate-track.sh movie.mkv

# Output defaults to movie.3fx — or specify explicitly:
bin/generate-track.sh movie.mkv /path/to/output.3fx

# Run without Ollama using random stub values (for local inspection)
bin/generate-track.sh movie.mkv --stub-llm

# Adjust extraction rate (default: 0.5fps = 1 frame every 2s)
bin/generate-track.sh movie.mkv --fps 0.33

# Run tests
bin/test.sh
```

### CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `--fps` | `0.5` | Frames to extract per second of video. `0.5` = one frame every 2s, `0.33` = every 3s. Higher = more detail, longer processing. |
| `--ollama-url` | `http://localhost:11434` | Ollama API endpoint |
| `--model` | `qwen2.5vl:7b` | Ollama model name |
| `--confidence-threshold` | `0.7` | Results below this are flagged for review |
| `--frames-dir` | *(temp)* | Directory to write extracted frames (kept after run if set) |
| `--stub-llm` | off | Skip Ollama, return random values — for testing without a GPU |

## Project structure

```
src/ezelementals/
├── extract.py      # ffmpeg frame + spectrogram extraction
├── classify.py     # Ollama inference pipeline (or stub mode)
├── compress.py     # run-length encode → .3fx
├── pipeline.py     # CLI orchestrator
└── ha_client.py    # Home Assistant playback + device control
```

## Related

- [HTFanControl](https://github.com/nicko88/HTFanControl) — prior art, wind-only, abandoned
- [ezBEQ](https://beqdesigner.readthedocs.io) — community model this project follows
- [SIGGRAPH Asia 2024](https://dl.acm.org/doi/10.1145/3681758.3698021) — multimodal 4D effect extraction paper
