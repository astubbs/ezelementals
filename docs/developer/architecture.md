# Architecture

## Pipeline overview

ReelDesc processes video through a linear pipeline that produces a dense semantic timeline, then derives output formats via configurable exporters.

### Current pipeline (M0)

```
video.mkv
  │
  ├─ Extract: ffmpeg frames (0.5fps) + 2s audio spectrograms
  │
  ├─ Classify: Ollama VLM (Qwen2.5-VL) — one call per frame+spectrogram pair
  │    └─ Returns: description, audio, elemental fields, confidence
  │
  ├─ Export (configurable):
  │   ├─ --export elemental → RLE compress → elemental.3fx
  │   ├─ --export ad → (future) gap-fit + word-rate → ad_script.srt
  │   └─ --export all → run all available exporters
  │
  └─ Bundle:
      film_title.bundle/
        meta.json
        timeline.jsonl      ← the core shared artifact
        elemental.3fx       ← derived export
```

### Target package structure

```
src/reeldesc/
  ├── extractor.py          ← ffmpeg frame + spectrogram extraction
  ├── runner.py             ← Ollama VLM inference engine (generic)
  ├── timeline.py           ← timeline.jsonl format: read/write/schema
  ├── bundle.py             ← bundle directory format: create/read/validate
  ├── pipeline.py           ← orchestrates: extract → VLM → timeline → exports → bundle
  │
  ├── profiles/
  │   ├── base.py           ← abstract DescriptionProfile interface
  │   ├── elemental.py      ← elemental classification prompt + parser
  │   └── (future: accessibility.py, visual_desc.py)
  │
  ├── exporters/
  │   ├── threefx.py        ← .3fx emitter (from elemental fields in timeline)
  │   └── (future: srt.py, events.py)
  │
  └── studio/               ← web UI + playback
      ├── server.py         ← FastAPI app entry point
      ├── config.py         ← JSON config manager
      ├── routes/           ← REST API routes
      ├── ws/               ← WebSocket encoder stream
      ├── jobs/             ← async encode job manager
      ├── static/           ← built React frontend
      └── adapters/
          └── haos.py       ← Home Assistant playback + device control
```

## Key design principles

- **Timeline is the core artifact.** The dense semantic timeline (`timeline.jsonl`) is the primary output. All export formats derive from it. The community shares timelines; exports are generated locally.
- **Monolithic VLM pass.** One VLM call per frame returns everything — description, audio, and elemental fields together. No premature splitting. AD users generate elemental data for free.
- **Configurable exports.** Each exporter is independent and optional. The pipeline runs whichever exports are requested.
- **Graceful degradation.** Low-confidence results are flagged, never silently dropped. Classifier failures don't crash the pipeline.
- **Backwards compatible formats.** Playback systems ignore fields they don't support. M0 tracks work on future systems.

## Frame processing

Each frame is processed as a pair — one video frame and one audio spectrogram — sent together in a single Ollama call:

- **Frame** (JPEG): captures fire, water, dust, weather, scene type
- **Spectrogram** (PNG, 128 mel bands, 2s window): captures wind rumble, rain hiss, explosion LFE

The spectrogram is often the stronger signal for wind and water — audio contains information not visible in a single frame.

## LLM profiles

| Profile | Model | Speed | VRAM | Time/film |
|---------|-------|-------|------|-----------|
| Fast | Qwen2.5-VL-7B Q4 | ~0.33 fps | ~8GB | 30–54 min |
| Accurate | Qwen2.5-VL-32B Q5 | ~0.5 fps | ~22GB | 5–6 hrs |

Two-pass mode: 7B flags uncertain frames, 32B re-classifies them (~20–30% of total).

## Spatial effects model (target, M2+)

The goal is an Atmos-like spatial model for physical effects — not just intensity, but direction and character:

- **Wind** — directional metadata: `frontal`, `side`, `rear`, `surround`
- **Water** — rain/overhead vs directional spray
- **Heat** — ambient (sustained warmth) vs radiant (sharp burst)

Current M0 tracks carry intensity only. The format is designed to add spatial metadata while remaining backwards compatible.
