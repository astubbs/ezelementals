"""Bundle format — a directory containing all ReelDesc outputs for a single film.

A bundle is the unit of community sharing.  Structure:

    film_title.bundle/
      meta.json           ← identifies the film and generator
      timeline.jsonl      ← dense semantic timeline (the core shared artifact)
      elemental.3fx       ← optional: elemental effects track
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

from reeldesc.timeline import Timeline


@dataclass
class BundleMeta:
    """Metadata for a bundle — identifies the film and how it was generated."""

    title: str = ""
    year: int = 0
    imdb_id: str = ""
    tmdb_id: int = 0
    runtime_s: float = 0.0
    generator_version: str = "0.1.0"
    fps: float = 0.5
    model: str = ""
    created_at: str = ""

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v}


def create_bundle(
    output_dir: Path,
    meta: BundleMeta,
    timeline: Timeline,
    exports: dict[str, Path] | None = None,
) -> Path:
    """Create a bundle directory with meta.json, timeline.jsonl, and optional exports.

    Args:
        output_dir: directory to create the bundle in (the .bundle/ dir itself)
        meta: bundle metadata
        timeline: the semantic timeline to write
        exports: dict of {filename: source_path} for export files to copy in

    Returns:
        Path to the created bundle directory.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # meta.json
    meta_path = output_dir / "meta.json"
    with meta_path.open("w") as f:
        json.dump(meta.to_dict(), f, indent=2)
        f.write("\n")

    # timeline.jsonl
    timeline.write(output_dir / "timeline.jsonl")

    # Copy in any export files
    if exports:
        import shutil
        for filename, source in exports.items():
            shutil.copy2(source, output_dir / filename)

    return output_dir


def read_bundle(bundle_path: Path, confidence_threshold: float = 0.7) -> tuple[BundleMeta, Timeline]:
    """Read a bundle directory, returning (meta, timeline).

    Raises FileNotFoundError if meta.json or timeline.jsonl is missing.
    """
    bundle_path = Path(bundle_path)

    meta_path = bundle_path / "meta.json"
    if not meta_path.exists():
        raise FileNotFoundError(f"No meta.json in {bundle_path}")
    with meta_path.open() as f:
        meta_dict = json.load(f)
    meta = BundleMeta(**{k: v for k, v in meta_dict.items() if k in BundleMeta.__dataclass_fields__})

    timeline_path = bundle_path / "timeline.jsonl"
    if not timeline_path.exists():
        raise FileNotFoundError(f"No timeline.jsonl in {bundle_path}")
    timeline = Timeline.read(timeline_path, confidence_threshold=confidence_threshold)

    return meta, timeline


def list_bundle_exports(bundle_path: Path) -> list[str]:
    """List export files in a bundle (everything except meta.json and timeline.jsonl)."""
    bundle_path = Path(bundle_path)
    reserved = {"meta.json", "timeline.jsonl"}
    return sorted(f.name for f in bundle_path.iterdir() if f.is_file() and f.name not in reserved)
