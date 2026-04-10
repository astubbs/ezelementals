"""
Library route — filesystem browser.

Walks the configured media_roots, returns video files with their .3fx status.
No database; the filesystem is the source of truth.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from reeldesc.studio.config import VIDEO_EXTENSIONS, load_settings

router = APIRouter(prefix="/api/library", tags=["library"])

# Status values (also used by the encoder job to override)
STATUS_NOT_ENCODED = "not_encoded"
STATUS_ENCODED = "encoded"       # legacy: .3fx only, no bundle
STATUS_FLAGGED = "flagged"       # .3fx exists but has flagged entries
STATUS_BUNDLED = "bundled"       # full .bundle/ directory present
STATUS_BUNDLED_FLAGGED = "bundled_flagged"  # bundle with flagged frames
# STATUS_IN_PROGRESS is injected at runtime by the encoder job manager


def _fx_path(video: Path) -> Path:
    return video.with_suffix(".3fx")


def _bundle_path(video: Path) -> Path:
    return video.with_suffix(".bundle")


def _count_flagged_timeline(bundle: Path) -> int:
    """Count flagged frames in a bundle's timeline.jsonl."""
    timeline_path = bundle / "timeline.jsonl"
    if not timeline_path.exists():
        return 0
    count = 0
    try:
        import json
        with timeline_path.open() as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        obj = json.loads(line)
                        # flagged_for_review is derived from confidence at read time;
                        # confidence < 0.7 means flagged
                        if float(obj.get("confidence", 1.0)) < 0.7:
                            count += 1
                    except (json.JSONDecodeError, ValueError):
                        pass
    except OSError:
        pass
    return count


def _count_flagged_fx(fx: Path) -> int:
    """Count lines in a .3fx file that carry a 'flagged' field (legacy)."""
    count = 0
    try:
        import json
        with fx.open() as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        obj = json.loads(line)
                        if obj.get("flagged"):
                            count += 1
                    except json.JSONDecodeError:
                        pass
    except OSError:
        pass
    return count


def _bundle_meta(bundle: Path) -> dict[str, Any]:
    """Read title/year from bundle's meta.json, returns {} on failure."""
    meta_path = bundle / "meta.json"
    if not meta_path.exists():
        return {}
    try:
        import json
        with meta_path.open() as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}


def _video_entry(video: Path) -> dict[str, Any]:
    bundle = _bundle_path(video)
    if bundle.exists() and bundle.is_dir():
        flagged = _count_flagged_timeline(bundle)
        meta = _bundle_meta(bundle)
        status = STATUS_BUNDLED_FLAGGED if flagged > 0 else STATUS_BUNDLED
        fx_in_bundle = bundle / "elemental.3fx"
        return {
            "type": "file",
            "name": video.name,
            "path": str(video),
            "bundle_path": str(bundle),
            "fx_path": str(fx_in_bundle) if fx_in_bundle.exists() else None,
            "timeline_path": str(bundle / "timeline.jsonl"),
            "status": status,
            "flagged_count": flagged,
            "title": meta.get("title", ""),
            "year": meta.get("year", 0),
            "imdb_id": meta.get("imdb_id", ""),
        }

    # Legacy: .3fx without bundle
    fx = _fx_path(video)
    if fx.exists():
        flagged = _count_flagged_fx(fx)
        status = STATUS_FLAGGED if flagged > 0 else STATUS_ENCODED
        return {
            "type": "file",
            "name": video.name,
            "path": str(video),
            "bundle_path": None,
            "fx_path": str(fx),
            "timeline_path": None,
            "status": status,
            "flagged_count": flagged,
            "title": "",
            "year": 0,
            "imdb_id": "",
        }

    return {
        "type": "file",
        "name": video.name,
        "path": str(video),
        "bundle_path": None,
        "fx_path": str(fx),
        "timeline_path": None,
        "status": STATUS_NOT_ENCODED,
        "flagged_count": 0,
        "title": "",
        "year": 0,
        "imdb_id": "",
    }


def _walk_dir(directory: Path, depth: int = 0, max_depth: int = 4) -> list[dict[str, Any]]:
    """Recursively list a directory, returning files and subdirs."""
    if depth > max_depth:
        return []
    entries: list[dict[str, Any]] = []
    try:
        items = sorted(directory.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
    except PermissionError:
        return []

    for item in items:
        if item.name.startswith("."):
            continue
        if item.is_dir():
            children = _walk_dir(item, depth + 1, max_depth)
            if children:  # only include dirs that contain video files (at any depth)
                entries.append(
                    {
                        "type": "dir",
                        "name": item.name,
                        "path": str(item),
                        "children": children,
                    }
                )
        elif item.is_file() and item.suffix.lower() in VIDEO_EXTENSIONS:
            entries.append(_video_entry(item))
    return entries


@router.get("")
def list_library(root: str | None = Query(default=None)) -> dict:
    """
    Return directory tree for one or all media_roots.
    If `root` is supplied it must be one of the configured media_roots.
    """
    settings = load_settings()
    media_roots: list[str] = settings.get("media_roots", [])

    if root is not None:
        if root not in media_roots:
            raise HTTPException(status_code=400, detail=f"{root!r} is not a configured media root")
        roots_to_scan = [root]
    else:
        roots_to_scan = media_roots

    result = []
    for r in roots_to_scan:
        p = Path(r)
        if not p.exists():
            result.append({"root": r, "error": "directory not found", "entries": []})
        else:
            result.append({"root": r, "entries": _walk_dir(p)})
    return {"roots": result}


@router.get("/status")
def file_status(path: str = Query(...)) -> dict:
    """Return up-to-date status for a single video file."""
    video = Path(path)
    if not video.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return _video_entry(video)
