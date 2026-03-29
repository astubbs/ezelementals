# ezElementals

Automated 4D home theatre effects for wind, water, and heat — synchronized to movie playback using LLM-based video/audio classification.

The automated track generator is the unlock that prior projects (HTFanControl) never had, removing the bottleneck of hand-authoring every track.

**Status:** Pre-PoC / Spike phase

## How it works

1. Extract frames and audio spectrograms from a video file
2. Classify each sample with a vision-language model (Qwen2.5-VL via Ollama)
3. Generate a `.3fx` effect track — timestamped wind/water/heat intensity values
4. Play back via Home Assistant, which triggers physical devices in sync with the movie

## Related

- [HTFanControl](https://github.com/nicko88/HTFanControl) — prior art, wind-only, abandoned
- [ezBEQ](https://beqdesigner.readthedocs.io) — community model this project follows
