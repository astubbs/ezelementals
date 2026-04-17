# Project Outline

This is the full vision document for ReelDesc (originally drafted as "CineDesc / Studio").

## Vision

A single open-source monolith that generates a dense semantic understanding of any film — offline, locally, on consumer hardware. From that understanding, multiple output formats are derived automatically: elemental effects tracks, accessibility description tracks, visual description subtitles, and semantic search indexes.

Two products ship from one codebase:

- **Studio** — the generation engine. Runs locally (Ollama + RTX 3090). Processes films, manages output bundles, exposes a UI for review and calibration. For enthusiasts and contributors.
- **Player** — lightweight app (iOS/Android/desktop). Consumes Studio-generated bundles. Plays elemental effects, AD audio, visual description subtitles. For everyone else.

## Output track types

### 1. Elemental Effects Track (`.3fx`)

Per-frame intensities for wind, water, heat_ambient, heat_radiant (and future: cold, fog). Played back via device adapters (Home Assistant first). See [.3fx format spec](../developer/threefx-format.md).

### 2. AD Script Track (`.srt`)

Natural language scene descriptions timed to dialogue gaps. Word rate capped at ~130wpm. Intended for TTS rendering at playback time (client-side). Targets blind/VI audiences.

### 3. Visual Description Subtitles (`.srt`, separate stream)

Raw 2s descriptions reformatted as subtitles. Describes visual content rather than dialogue. Targets deaf-blind users (braille display), hearing people watching without sound, and language learners. This format does not currently exist as a standard — it is novel.

### 4. Events Track (`events.json`)

Discrete high-intensity events with sub-100ms onset precision, found via binary search on frames.

## Processing profiles

| Profile | Model | Runtime | Use |
|---|---|---|---|
| Fast | Qwen2.5-VL-7B | ~30–54 min/film | Initial pass, overnight batch |
| Accurate | Qwen2.5-VL-32B Q5 + CoT | ~5–6 hrs/film | Final quality pass |
| Hybrid (two-pass) | 7B flags, 32B reprocesses | Best quality/time | Unattended overnight runs |

## Key architectural decisions

- **Monolithic VLM pass**: description + elemental fields in one call. No premature splitting.
- **Timeline as core artifact**: community shares timelines, not export tracks.
- **Git-based community catalogue**: bundles submitted via PR, indexed by IMDB/TMDB ID.
- **Heat split**: `heat_ambient` (sustained) vs `heat_radiant` (burst) — different physics, different hardware.
- **Fog channel**: distinct from water — atmospheric vs contact-based.
- **LFE fallback**: for films with no bundle, LFE-driven fan control as zero-authoring fallback.
- **Optical flow**: supplements VLM for intensity scaling (SIGGRAPH Asia 2024 paper).
- **Confidence field**: every frame includes confidence. Low confidence → flagged for review.

## Prior art

- [HTFanControl](https://github.com/nicko88/HTFanControl) — abandoned C# fan control
- [ezBEQ](https://github.com/3ll3d00d/ezbeq) — community model, catalogue architecture reference
- [SIGGRAPH Asia 2024](https://dl.acm.org/doi/10.1145/3681758.3698021) — optical flow + psychoacoustic intensity scaling
- [Shot-by-Shot (arXiv 2025)](https://arxiv.org/html/2504.01020) — film-grammar-aware AD generation
