"""
.3fx editor routes — read, patch, and write effect tracks.
"""

from __future__ import annotations

import json
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
