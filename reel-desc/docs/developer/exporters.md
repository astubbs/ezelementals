# Writing Exporters

Exporters transform the dense `timeline.jsonl` into specific output formats. Each exporter is independent and optional.

## Current exporters

| Exporter | Input | Output | Description |
|---|---|---|---|
| `threefx.py` | timeline.jsonl | elemental.3fx | RLE compression of elemental fields |

## Planned exporters

| Exporter | Input | Output | Description |
|---|---|---|---|
| `srt_ad.py` | timeline.jsonl | ad_script.srt | AD subtitle track (requires extra LLM pass for gap fitting) |
| `srt_visual.py` | timeline.jsonl | visual_desc.srt | Visual description subtitles (reformatted descriptions) |
| `events.py` | timeline.jsonl | events.json | Discrete high-precision events (requires extra frame extraction for binary-search onset) |

## How exporters work

An exporter:
1. Reads `timeline.jsonl` (the full semantic timeline)
2. Extracts the fields relevant to its output format
3. Applies format-specific post-processing (compression, gap fitting, etc.)
4. Writes the output file

Some exporters (like AD subtitles) may require additional processing beyond what's in the timeline — an extra LLM pass for natural language generation, or additional frame extraction for sub-frame precision. These are clearly labelled as extra processing steps.

## Adding a new exporter

*Architecture is being established during the pivot refactor. This section will be updated with the concrete interface once `exporters/` is implemented.*

The general pattern:
1. Create `src/reeldesc/exporters/your_exporter.py`
2. Read timeline frames, transform, write output
3. Register the exporter so it's available via `--export your_format`
4. Add tests
