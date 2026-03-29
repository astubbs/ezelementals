# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

- **Keep documentation in sync.** Any change to CLI flags, defaults, behaviour, or architecture must be reflected in README.md and CLAUDE.md in the same commit. Never leave docs describing something that no longer matches the code.
- **Follow the spec.** CLAUDE.md is the authoritative spec. Before implementing, check it. If the spec and the code diverge, flag it rather than silently picking one.

## Project Overview

**ezElementals** is an automated 4D home theatre effects platform — the "ezBEQ for physical immersion". It generates environmental effect tracks (wind, water, heat) synchronized to movie playback using LLM-based video/audio classification.

**Status:** Pre-PoC/Spike phase (M0). No source code exists yet — architecture is specified, implementation hasn't started.

**Branding:**
- Effect format: `.3fx` (ElementFX)
- Community library: iWASDb (Internet Wind And Spray Database)
- Authoring tool: iWASDbDesigner

---

## Core Effect Format (`.3fx`)

```json
{ "t": 312.5, "wind": 2, "water": 0, "heat_ambient": 1, "heat_radiant": 3 }
```

- Intensity scale: 0–3 per channel
- `wind`: fan speed/direction
- `water`: mist intensity
- `heat_ambient`: space heater (high latency, sustained — desert, jungle)
- `heat_radiant`: quartz/halogen (near-zero latency, burst — explosions, fire flash)

---

## Architecture

### Pipeline

```
Video Input
  → ffmpeg frame + spectrogram extraction (fixed rate: 0.5fps = 1 frame every 2s)
  → LLM classification (Ollama + Qwen2.5-VL — 1 frame + 1 spectrogram per inference call)
  → .3fx track generation
  → Playback integration (Home Assistant media_player)
  → Hardware control (fans, misters, heaters)
```

### LLM Classification

Two processing profiles:
- **Fast:** Qwen2.5-VL-7B Q4 (Ollama, 3090), ~0.33 fps, ~1.2s/call, ~30–54min/film
- **Accurate:** Qwen2.5-VL-32B Q5 (~22GB VRAM), ~0.5 fps, ~6–8s/call, ~5–6hrs/film

Optional two-pass: 7B flags frames, 32B refines uncertain ones (~20–30% of total). Avoids 72B Q3 (~27GB) — borderline VRAM and unstable.

LLM JSON output schema:
```json
{ "wind": 2, "wind_direction": "frontal", "water": 1, "water_type": "rain", "heat_ambient": 0, "heat_radiant": 0, "confidence": 0.85 }
```

Low-confidence frames are flagged for manual review, not silently dropped.

Frame extraction command:
```bash
ffmpeg -i movie.mkv -vf "fps=0.5,showinfo,format=yuvj420p" -fps_mode vfr frames/%04d.jpg
```

### Playback Integration

Home Assistant provides playback position — no audio fingerprinting needed. `.3fx` is a `timestamp → effect commands` lookup table; HA automations trigger hardware directly.

### Device Capability Model

Each device declares: `latency_ms`, `sustain_min`, `intensity_range`. The scheduler pre-triggers based on scene duration — if a blizzard lasts 8 minutes, AC fires at `scene_start − warmup`. Short scenes suppress high-latency devices entirely.

Device latencies: fan ~0s, mister 2–3s, radiant heater 1–2s, space heater 30–60s, AC 3–5 min.

---

## Dev Progression (M0 Spike)

1. ffmpeg frame + spectrogram extraction script
2. Ollama inference pipeline (7B fast profile, JSON output)
3. Timestamp compression
4. Wire one fan to HA, test against Fury Road / Dunkirk

**Test corpus:** Use tagged film segments (Fury Road sandstorm, Dunkirk beach, The Perfect Storm) — real sustained effects, not trailers.

---

## Milestone Map

- **M0:** Spike — validate LLM classification quality on real scenes
- **M1:** Full pipeline (extract → classify → compress → `.3fx`), two-pass, unit tests
- **M2:** HA playback integration, device capability model, LFE fallback mode
- **M3:** Visual timeline renderer, device calibration UI, proxy device support
- **M4:** iWASDb community library, `.3fx` spec v1.0, iWASDbDesigner
- **M5:** Multi-player adapters (Zidoo, Plex, Kodi)
- **M6:** Turnkey Pi-based hardware product

---

## Key Design Decisions

- **Audio + visual inference:** Spectrograms are a stronger signal than additional frames for wind/water detection
- **Hardware abstraction:** Same `.3fx` track runs differently on different hardware configurations
- **Community model:** Follows ezBEQ's ecosystem pattern (iWASDb library, quality ratings by hardware tier)
- **Visual output early:** Build the timeline renderer before M3 — it accelerates classifier development and QA significantly
- **LFE fallback:** Real-time fan control via LFE channel for instant demo before tracks exist

## References

- [HTFanControl](https://github.com/nicko88/HTFanControl) — prior art (C#, wind-only, abandoned)
- [ezBEQ](https://beqdesigner.readthedocs.io) — community toolchain model to follow
- [SIGGRAPH Asia 2024](https://dl.acm.org/doi/10.1145/3681758.3698021) — multimodal 4D effect extraction paper; borrow saliency+optical flow intensity scaling
