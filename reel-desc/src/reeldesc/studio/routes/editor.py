"""
Editor routes — read, patch, and write .3fx tracks and timeline.jsonl bundles.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Query

router = APIRouter(prefix="/api/editor", tags=["editor"])


def _read_fx(path: Path) -> list[dict[str, Any]]:
    entries = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return sorted(entries, key=lambda e: e["t"])


def _write_fx(path: Path, entries: list[dict[str, Any]]) -> None:
    entries_sorted = sorted(entries, key=lambda e: e["t"])
    with path.open("w") as f:
        for entry in entries_sorted:
            f.write(json.dumps(entry) + "\n")


@router.get("")
def get_track(path: str = Query(...)) -> dict:
    """Return all entries from a .3fx file."""
    p = Path(path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        entries = _read_fx(p)
    except (json.JSONDecodeError, OSError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"path": path, "entries": entries}


@router.put("")
def put_track(path: str = Query(...), entries: list[dict] = Body(...)) -> dict:
    """Overwrite a .3fx file with new entries."""
    p = Path(path)
    if not p.parent.exists():
        raise HTTPException(status_code=400, detail="Parent directory does not exist")
    _write_fx(p, entries)
    return {"path": path, "count": len(entries)}


@router.patch("")
def patch_entry(
    path: str = Query(...),
    t: float = Query(..., description="Timestamp of entry to patch"),
    update: dict = Body(...),
) -> dict:
    """Update a single entry at timestamp `t`."""
    p = Path(path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")
    entries = _read_fx(p)
    for i, entry in enumerate(entries):
        if abs(entry["t"] - t) < 0.001:
            entries[i] = {**entry, **update, "t": entry["t"]}
            _write_fx(p, entries)
            return {"patched": entries[i]}
    raise HTTPException(status_code=404, detail=f"No entry at t={t}")


@router.post("/entry")
def add_entry(path: str = Query(...), entry: dict = Body(...)) -> dict:
    """Insert a new entry."""
    p = Path(path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")
    entries = _read_fx(p)
    entries.append(entry)
    _write_fx(p, entries)
    return {"added": entry}


@router.delete("/entry")
def delete_entry(
    path: str = Query(...),
    t: float = Query(..., description="Timestamp of entry to delete"),
) -> dict:
    """Remove the entry at timestamp `t`."""
    p = Path(path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")
    entries = _read_fx(p)
    before = len(entries)
    entries = [e for e in entries if abs(e["t"] - t) >= 0.001]
    if len(entries) == before:
        raise HTTPException(status_code=404, detail=f"No entry at t={t}")
    _write_fx(p, entries)
    return {"deleted_at": t, "remaining": len(entries)}


# ── Timeline CRUD (timeline.jsonl inside a .bundle directory) ────────────────

def _timeline_path(bundle_or_timeline: str) -> Path:
    """Accept either a .bundle dir path or a timeline.jsonl path."""
    p = Path(bundle_or_timeline)
    if p.suffix == ".bundle" or p.is_dir():
        return p / "timeline.jsonl"
    return p  # assume it's already a .jsonl path


@router.get("/timeline")
def get_timeline(path: str = Query(...)) -> dict:
    """Return all TimelineFrame records from a bundle's timeline.jsonl."""
    tl_path = _timeline_path(path)
    if not tl_path.exists():
        raise HTTPException(status_code=404, detail="timeline.jsonl not found")
    try:
        from reeldesc.timeline import Timeline
        timeline = Timeline.read(tl_path)
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    frames = [f.to_dict(include_raw=False) for f in timeline]
    # restore flagged_for_review for the frontend
    for frame, tl_frame in zip(frames, timeline):
        frame["flagged_for_review"] = tl_frame.flagged_for_review
    return {"path": str(tl_path), "frames": frames}


@router.put("/timeline")
def put_timeline(path: str = Query(...), frames: list[dict] = Body(...)) -> dict:
    """Overwrite timeline.jsonl with the provided list of TimelineFrame dicts."""
    tl_path = _timeline_path(path)
    if not tl_path.parent.exists():
        raise HTTPException(status_code=400, detail="Parent directory does not exist")
    sorted_frames = sorted(frames, key=lambda f: f["t"])
    with tl_path.open("w") as fp:
        for frame in sorted_frames:
            # strip fields not stored in JSONL
            frame.pop("flagged_for_review", None)
            frame.pop("raw_response", None)
            fp.write(json.dumps(frame) + "\n")
    return {"path": str(tl_path), "count": len(sorted_frames)}


@router.patch("/timeline")
def patch_timeline_frame(
    path: str = Query(...),
    t: float = Query(..., description="Timestamp of frame to patch"),
    update: dict = Body(...),
) -> dict:
    """Update fields of a single TimelineFrame at timestamp `t`."""
    tl_path = _timeline_path(path)
    if not tl_path.exists():
        raise HTTPException(status_code=404, detail="timeline.jsonl not found")
    from reeldesc.timeline import Timeline
    timeline = Timeline.read(tl_path)
    for frame in timeline:
        if abs(frame.t - t) < 0.001:
            # Apply updates to allowed fields
            allowed = {
                "description", "audio", "scene_type", "motion",
                "wind", "wind_direction", "water", "water_type",
                "heat_ambient", "heat_radiant", "confidence",
            }
            for k, v in update.items():
                if k in allowed and hasattr(frame, k):
                    setattr(frame, k, v)
            timeline.write(tl_path)
            result = frame.to_dict()
            result["flagged_for_review"] = frame.flagged_for_review
            return {"patched": result}
    raise HTTPException(status_code=404, detail=f"No frame at t={t}")
