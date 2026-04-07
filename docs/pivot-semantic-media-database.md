# Pivot: From ezElementals to Semantic Media Database

## Vision

**CineDesc — semantic descriptions for video and playback** *(name TBD, see naming section)*

A single open-source pipeline that generates dense semantic understanding of any film — offline, locally, on consumer hardware. From that understanding, multiple output formats are derived automatically: elemental effects tracks, accessibility description tracks, visual description subtitles, and semantic search indexes.

Two products ship from one codebase:

- **Studio** — the generation engine. Runs locally (Ollama + RTX 3090). Processes films, manages output bundles, exposes a UI for review and calibration. For enthusiasts and contributors.
- **Player** — lightweight app. Consumes Studio-generated bundles. Plays elemental effects, AD audio, visual description subtitles. For everyone else.

---

## The Core Insight: The Timeline IS the Real Product

The **dense 2s semantic timeline** (`timeline.jsonl`) is the true output of the system — everything else is a derived view:

| Derived Output | Source Data | Audience |
|---|---|---|
| `.3fx` elemental effects | timeline + RLE compression | 4D home theatre enthusiasts |
| AD script (`.srt`) | timeline + gap fitting + TTS | Blind/VI users |
| Visual description subs | timeline raw reformatted | Deaf-blind, language learners |
| Events track | timeline + binary-search refinement | Precision effect triggers |
| BEQ hints | timeline + LFE correlation | Bass EQ community |
| Semantic search index | timeline full-text | Film researchers, archivists |

**One generation pass, many consumers.** Generate once, derive many.

---

## Why This Pivot Makes Sense

### 1. Community economics are dramatically better

Someone generates a timeline for Mad Max, and the **entire community** gets effects tracks, AD tracks, visual descriptions, and searchable scene metadata — all from one contribution. The contribution-to-value ratio is massively higher than single-output contributions.

### 2. Accessibility is the bigger market and the better story

The 4D home theatre community is enthusiastic but tiny. AD tracks alone serve millions of blind/VI users. The broader positioning opens doors to grants, institutional support, and standards bodies that pure hobbyist projects can't access.

### 3. AD community grows the elemental database for free

With a monolithic VLM pass (description + elemental fields in one call), every AD user who generates a timeline also generates elemental effects data. This catapults the community effects database without the effects community having to generate every title themselves.

### 4. ezBEQ proves the community model works

A niche AV community will: generate profiles, submit them to a shared catalogue, build tooling around a standard format, and maintain quality. A semantic media database follows the same playbook with a broader contributor base.

### 5. Competitive moat is in the database, not the generator

The LLM pipeline is replicable. The community database of **reviewed, corrected, confidence-scored semantic timelines** is the defensible asset.

---

## Timeline Design: Monolithic Base + Configurable Exports

### Base VLM Pass (one call, monolithic)

One VLM call per frame returns **everything** — natural language description AND structured elemental fields in a single prompt. No splitting, no layering at the VLM level:

```jsonl
{"t": 312.5, "frame_idx": 156, "description": "Desert highway, massive sandstorm approaching from rear. Two vehicles racing through sand. Orange-brown dust fills frame.", "audio": "Deep rumbling wind, engine roar, metallic clanking", "scene_type": "exterior_desert", "motion": "high", "wind": 2, "wind_direction": "rear", "water": 0, "water_type": "none", "heat_ambient": 1, "heat_radiant": 0, "confidence": 0.91}
```

**Why monolithic:**
- Elemental fields add negligible cost to the VLM prompt
- AD users automatically generate elemental data, growing the community effects database
- One pass = lower latency for just-in-time viewing where no bundle exists yet
- Can always split into separate passes later as an optimisation if needed

### Export Passes (separate, configurable, optional)

The "layering" is in the **export pipeline**, not the VLM pass. Each export is an independent downstream transformation:

| Export | Input | Output | Post-processing |
|---|---|---|---|
| Elemental playback | timeline.jsonl | elemental.3fx | RLE compression, intensity normalisation, device mapping |
| AD subtitles | timeline.jsonl | ad_script.srt | Gap fitting, word-rate limiting, TTS timing (future, extra VLM pass) |
| Visual description | timeline.jsonl | visual_desc.srt | Raw descriptions reformatted as subtitles |
| Events | timeline.jsonl | events.json | Binary-search onset refinement (extra frame extraction) |

Exports are flags: `--export elemental`, `--export ad`, `--export all`.

**Key insight:** The base timeline IS the community contribution. Exports are local/personal derivations. You share timelines, you generate exports locally based on what hardware/use case you have.

---

## Architecture

```
cinedesc (core engine)
  ├── extractor         ← frame + spectrogram extraction
  ├── runner            ← Ollama VLM inference engine (generic)
  ├── timeline          ← timeline.jsonl format: read/write/schema
  ├── bundle            ← bundle directory format: create/read/validate
  ├── profiles/
  │   ├── base.py       ← abstract DescriptionProfile interface
  │   ├── elemental.py  ← elemental prompt, parser (first profile)
  │   └── (future: accessibility.py, visual_desc.py)
  ├── exporters/
  │   ├── threefx.py    ← .3fx emitter
  │   └── (future: srt.py, events.py)
  ├── studio/           ← web UI + playback
  │   ├── server, config, routes, ws, jobs
  │   └── adapters/     ← HA, Zidoo, Plex sync
  └── pipeline          ← orchestrates: extract → VLM → timeline → exports → bundle
```

### Pipeline flow

```
video.mkv
  │
  ├─ Extract: ffmpeg frames + spectrograms
  │
  ├─ Classify: VLM pass → timeline.jsonl (description + elemental fields)
  │
  ├─ Export (configurable):
  │   ├─ --export elemental → RLE compress → elemental.3fx
  │   ├─ --export ad → gap-fit + word-rate → ad_script.srt (future)
  │   └─ --export all → run all available exporters
  │
  └─ Bundle:
      film_title.bundle/
        meta.json           ← title, IMDB/TMDB, runtime, generator version
        timeline.jsonl      ← monolithic semantic timeline (THE shared artifact)
        elemental.3fx       ← derived export
```

### Community database (git-based, like ezBEQ)

- Git repo as the catalogue — bundles submitted via PR, indexed by IMDB/TMDB ID
- Contributors generate timelines, community reviews, catalogue is the shared truth
- Studio UI has "submit to catalogue" and "download from catalogue"
- Timeline bundles are the shared unit — one contribution yields all derived formats

---

## Mapping from Current Code

| Current file | Becomes | Change |
|---|---|---|
| `src/ezelementals/extract.py` | `src/cinedesc/extractor.py` | Move, minimal changes |
| `src/ezelementals/classify.py` | `src/cinedesc/runner.py` + `profiles/elemental.py` | Split prompt from inference engine |
| `src/ezelementals/compress.py` | `src/cinedesc/exporters/threefx.py` | Rename, same logic |
| `src/ezelementals/pipeline.py` | `src/cinedesc/pipeline.py` | Add timeline.jsonl output step |
| `src/ezelementals/ha_client.py` | `src/cinedesc/studio/adapters/haos.py` | Move |
| `src/ezelementals/ui/` | `src/cinedesc/studio/` | Rename |
| `pyproject.toml` | Update package name, entry points | |

The actual pipeline logic barely changes — it's mostly reorganisation and adding the timeline intermediate step.

---

## Risks and Mitigations

### 1. Scope explosion before M0 is proven
**Mitigation:** Pivot the architecture and framing now, keep implementation scope focused on elemental pipeline. Build the database around elemental timelines first, add profiles later.

### 2. Two audiences, different quality bars
**Mitigation:** Different confidence thresholds per export type. AD flagged at 0.9 vs effects at 0.7.

### 3. Player complexity
**Mitigation:** Player is modular by data type. Ship effects playback first, add AD TTS next. Bundle format supports selective consumption.

---

## Naming

**Working name: CineDesc** — *"semantic descriptions for video and playback"*

Self-explanatory, memorable. "Cine" is broad enough (cinematography covers any moving image).

**Note:** cineDESK (different spelling, different product) exists as a virtual filmmaking previsualization tool from Zurich University of the Arts. No direct conflict, but proximity noted.

**Sub-brands:**
- **ezElementals** — elemental effects module/community
- **iWASDb** — community catalogue (houses cinedesc bundles)
- **.3fx** (ElementFX) — elemental effects format

**Prior art search (2025-04):**
- "cinedesc" — no existing project on GitHub, PyPI, or npm
- "cineDESK" — exists (previsualization tool), different spelling and domain
- Semantic video description databases — no direct FOSS competitor exists for this approach

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Timing | Refactor now | Codebase is small, cost is low, expensive to retrofit later |
| VLM pass | Monolithic (desc + elemental in one call) | Avoids premature optimisation; AD users grow elemental DB for free |
| Export pipeline | Separate, configurable passes | Independent downstream transforms; `--export elemental/ad/all` |
| Database model | Git-based (like ezBEQ) | Community PRs, no central API needed |
| Refactor scope | Full package restructure | Young codebase, cheap to reshape now |

---

## Open Questions

1. **Final name** — CineDesc is the working name. Alternatives if cineDESK proximity is a concern: SceneDesc, FilmDesc, or others TBD.
2. **CLI entry points** — `cinedesc generate` + `cinedesc studio`? Or `cinedesc-generate` + `cinedesc-studio`?
3. **Git catalogue repo structure** — define now or defer until M6?
