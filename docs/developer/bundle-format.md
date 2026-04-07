# Bundle Format

A bundle is a directory containing all ReelDesc outputs for a single film. It is the unit of community sharing.

## Structure

```
film_title.bundle/
  meta.json           ← required: identifies the film and generator
  timeline.jsonl      ← required: dense semantic timeline
  elemental.3fx       ← optional: elemental effects track
  ad_script.srt       ← optional (future): AD subtitle track
  visual_desc.srt     ← optional (future): visual description subtitles
  events.json         ← optional (future): discrete high-precision events
```

## meta.json

```json
{
  "title": "Mad Max: Fury Road",
  "year": 2015,
  "imdb_id": "tt1392190",
  "tmdb_id": 76341,
  "runtime_s": 7200,
  "generator_version": "0.1.0",
  "fps": 0.5,
  "model": "qwen2.5-vl:7b",
  "created_at": "2025-04-07T12:00:00Z"
}
```

## Design decisions

- **Directory, not zip**: bundles are plain directories for git-friendliness (the community catalogue is a git repo). They can be zipped for download/transfer.
- **timeline.jsonl is always present**: it's the core artifact. Export tracks are optional and can be regenerated from the timeline.
- **Exports are local derivations**: the community shares timelines. Users generate exports locally based on their hardware and use case.
- **IMDB/TMDB indexing**: bundles are identified by IMDB or TMDB ID, matching ezBEQ's catalogue model.
