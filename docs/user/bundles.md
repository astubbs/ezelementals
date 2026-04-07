# Bundles

A bundle is the unit of sharing in ReelDesc. One bundle per film, containing the semantic timeline and all derived export tracks.

## Bundle structure

```
film_title.bundle/
  meta.json           ← title, IMDB/TMDB ID, runtime, generator version
  timeline.jsonl      ← dense semantic timeline (the core shared artifact)
  elemental.3fx       ← derived: elemental effects track
  (future: ad_script.srt, visual_desc.srt, events.json)
```

## What's in each file

- **meta.json** — identifies the film and tracks which version of ReelDesc generated the bundle
- **timeline.jsonl** — one JSON object per frame at 0.5fps, containing natural language description, audio description, and structured elemental fields. This is the primary community contribution.
- **elemental.3fx** — run-length encoded elemental effects track derived from the timeline. See [.3fx format](../developer/threefx-format.md).

## Sharing bundles

*Planned (M6):* Bundles will be shared via a git-based community catalogue (modelled on ezBEQ). Contributors generate timelines locally and submit via PR. The catalogue indexes bundles by IMDB/TMDB ID.

The key insight: the timeline is the community contribution. Export tracks (.3fx, .srt, etc.) are derived locally based on your hardware and use case. One timeline contribution yields all derived formats for everyone.
