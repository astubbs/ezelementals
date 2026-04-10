# Milestones

## M0 — PoC: LLM Classification Quality Validation ✅

**Status: Complete**

- Extract 5-minute clip, run at 0.5fps with elemental profile
- Full pipeline: `extract.py` → `classify.py` → `compress.py` → `pipeline.py` → `.3fx`
- Web UI: FastAPI backend + React frontend
- `--stub-llm` mode for testing without Ollama
- 50 tests passing, CI on Python 3.11 and 3.12

## M0.5 — ReelDesc Pivot (in progress)

**Status: In progress**

- Rename/restructure from ezElementals to ReelDesc
- Introduce `timeline.jsonl` as canonical intermediate format
- Bundle format (meta.json + timeline.jsonl + exports)
- Configurable export pipeline (`--export elemental/ad/all`)
- ReadTheDocs-style documentation

## M1 — Core Pipeline (reeldesc package)

- `extractor.py`: frame extraction at configurable fps, 2s spectrogram pairing
- `runner.py`: Ollama integration, model selection, batch inference
- `profiles/elemental.py`: elemental prompt + structured JSON parser
- `exporters/threefx.py`: `.3fx` emitter from timeline
- `timeline.py` + `bundle.py`: format read/write/validate
- Unit tests: hand-authored ground truth vs generated output on known clips

## M2 — Device Adapter + Basic Playback

- `DeviceProfile` base class with latency/sustain/intensity model
- Space heater via smart plug as first device
- HAOS adapter: reads playback timestamp, triggers scheduler
- Scheduler: pre-trigger logic, scene-duration suppression
- Visual preview mode

**Gate:** Watch a 5-minute clip with a space heater correctly pre-triggered for a sustained heat scene.

## M3 — Human Review Workflow

- Confidence filter: flag frames below threshold
- Review queue in Studio UI
- Correction stored back to bundle
- Stand-in device support

## M4 — Accessibility Tracks

- AD text profile (gap-aware, word-rate limited)
- Gap detection from subtitle/audio analysis
- AD script `.srt` exporter
- Visual description subtitle exporter

## M5 — Event System

- Coarse event detection from timeline
- Binary search onset finder (sub-100ms precision)
- `events.json` exporter
- Event review UI
- Event-triggered effect override in player

## M6 — Community Database

- Git-based bundle catalogue (modelled on ezBEQ)
- Submit/download bundles from Studio UI
- Version control on bundles
- Community corpus for testing

## M7 — Player App

- iOS + Android
- Bundle sync from catalogue or local Studio
- Playback sync adapter (HAOS first)
- AD TTS rendering (client-side)
- Visual description subtitle overlay
- Elemental effects playback

## Later

- Multi-fan spatial patterns (Atmos-like directional effects)
- BEQ authoring hints
- Kit hardware for simplified setup
- Port legacy HTFanControl tracks to `.3fx`
