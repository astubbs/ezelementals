# Naming Decisions

## Project name: ReelDesc

**ReelDesc** — *"semantic descriptions for video and playback"*

Double pun: "real descriptions" + "film reel descriptions". Self-explanatory, memorable, untaken on GitHub/PyPI/npm.

## Sub-brands

| Name | Purpose |
|---|---|
| **ReelDesc** | The project / core engine |
| **ezElementals** | Elemental effects module and community |
| **iWASDb** | Community catalogue (houses ReelDesc bundles) |
| **.3fx** (ElementFX) | Elemental effects track format |
| **iWASDbDesigner** | Authoring tool (future) |

## Names considered and rejected

Search conducted April 2025.

| Name | Status | Why rejected |
|---|---|---|
| cinedesc | Available | Too close to cineDESK (previsualization tool, Zurich University of the Arts + HKAPA) |
| cineforge | Taken | Existing project |
| cinescribe | Taken | Existing project |
| scenewise | Taken | Existing project |
| scenesense | Taken | GitHub: arpg/SceneSense (video segmentation + ad placement) |
| reelwise | Taken | Existing project |
| framewise | Taken | GitHub: hxri-nxrxyxn/framewise (AI posing assistant) + arulvalananto/FrameWise (video analysis) |
| reelsense | Taken | GitHub user reelsense (110 repos) |
| cinetag | Taken | GitHub: LarissaOlimpio/CineTag (film sharing platform) |
| mediamap | Taken | MapMap (open source video mapping / projection software) |
| scenedesc | Available | Generic, no personality |
| filmdesc | Available | Too film-specific |
| reelmap | Available | Less descriptive than reeldesc |
| scenetag | Available | Less descriptive than reeldesc |
| frameread | Available | Less descriptive than reeldesc |
| **reeldesc** | **Available — chosen** | **Double pun (real + reel), self-explanatory, untaken** |

## Prior art

No direct FOSS competitor exists for the ReelDesc approach (local VLM-based dense semantic film timeline with community sharing).

Related projects in the space:
- [HTFanControl](https://github.com/nicko88/HTFanControl) — prior art, wind-only, abandoned
- [ezBEQ](https://beqdesigner.readthedocs.io) — community model reference (bass EQ profiles)
- [SIGGRAPH Asia 2024](https://dl.acm.org/doi/10.1145/3681758.3698021) — multimodal 4D effect extraction paper
- [Shot-by-Shot (arXiv 2025)](https://arxiv.org/html/2504.01020) — film-grammar-aware AD generation
