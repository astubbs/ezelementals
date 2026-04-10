# CLI Reference

## Generate a track

```sh
bin/generate-track.sh <video-file> [output-path] [flags]
```

Output defaults to `<video-name>.3fx` alongside the input file.

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--fps` | `0.5` | Frames per second to extract. `0.5` = one frame every 2s, `0.33` = every 3s. Higher = more detail, longer processing. |
| `--ollama-url` | `http://localhost:11434` | Ollama API endpoint |
| `--model` | `qwen2.5-vl:7b` | Ollama model name |
| `--confidence-threshold` | `0.7` | Results below this are flagged for review |
| `--frames-dir` | *(temp)* | Directory for extracted frames (kept after run if set) |
| `--stub-llm` | off | Skip Ollama, return random values — for testing without a GPU |

### Planned flags (post-pivot)

| Flag | Description |
|------|-------------|
| `--export elemental` | Generate .3fx elemental effects track (default) |
| `--export ad` | Generate AD subtitle track |
| `--export all` | Run all available exporters |

## Launch the Studio UI

```sh
uv run ezelementals-ui
```

Starts the web server at `http://localhost:8765`.

## Run tests

```sh
bin/test.sh
```

Runs the full test suite on Python 3.11/3.12.
