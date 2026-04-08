"""
Player routes — current playback state and effect lookup.

Polls Home Assistant for the current media position, then does a binary-search
into a loaded .3fx file to find the active effect.  The frontend polls this
endpoint at ~2 Hz during playback.
"""

from __future__ import annotations

import json
from bisect import bisect_right
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query

from reeldesc.studio.config import load_settings

router = APIRouter(prefix="/api/player", tags=["player"])


def _load_fx(path: Path) -> list[dict[str, Any]]:
    entries = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return sorted(entries, key=lambda e: e["t"])


def _current_fx(entries: list[dict[str, Any]], position_s: float) -> dict[str, Any] | None:
    """Binary-search for the latest entry at or before position_s."""
    if not entries:
        return None
    timestamps = [e["t"] for e in entries]
    idx = bisect_right(timestamps, position_s) - 1
    if idx < 0:
        return None
    entry = entries[idx]
    # Next change time
    next_t = entries[idx + 1]["t"] if idx + 1 < len(entries) else None
    return {**entry, "next_change_t": next_t}


async def _ha_position(settings: dict) -> float | None:
    """Query HA media player for current position in seconds."""
    ha = settings.get("ha", {})
    base = ha.get("base_url", "").rstrip("/")
    token = ha.get("token", "")
    entity = ha.get("media_player_entity", "")
    if not all([base, token, entity]):
        return None
    url = f"{base}/api/states/{entity}"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(url, headers=headers)
            r.raise_for_status()
            state = r.json()
            return state.get("attributes", {}).get("media_position")
    except Exception:
        return None


def _resolve_playback_data(
    fx_path: str | None,
    bundle_path: str | None,
    timeline_path: str | None,
    position_s: float,
) -> dict[str, Any] | None:
    """Resolve the active effect at position_s from whichever source is provided.

    Preference order: bundle_path > timeline_path > fx_path.
    For bundles/timelines, returns the full TimelineFrame as a dict (includes
    description, audio, etc.).  For .3fx only, returns a sparse FxEntry dict.
    """
    # ── Bundle / timeline path ───────────────────────────────────────────────
    tl_file: Path | None = None
    if bundle_path:
        candidate = Path(bundle_path) / "timeline.jsonl"
        if candidate.exists():
            tl_file = candidate
    if tl_file is None and timeline_path:
        candidate = Path(timeline_path)
        if candidate.exists():
            tl_file = candidate

    if tl_file is not None:
        try:
            from reeldesc.timeline import Timeline
            timeline = Timeline.read(tl_file)
            frame = timeline.lookup(position_s)
            if frame is None:
                return None
            d = frame.to_dict()
            d["flagged_for_review"] = frame.flagged_for_review
            # next_change_t from subsequent frame
            frames = timeline.frames
            idx = next((i for i, f in enumerate(frames) if abs(f.t - frame.t) < 0.001), None)
            d["next_change_t"] = frames[idx + 1].t if idx is not None and idx + 1 < len(frames) else None
            return d
        except Exception:
            pass

    # ── Legacy .3fx fallback ─────────────────────────────────────────────────
    if fx_path:
        p = Path(fx_path)
        if p.exists():
            try:
                entries = _load_fx(p)
                return _current_fx(entries, position_s)
            except Exception:
                pass
    return None


@router.get("/state")
async def get_player_state(
    fx_path: str | None = Query(default=None),
    bundle_path: str | None = Query(default=None),
    timeline_path: str | None = Query(default=None),
) -> dict:
    """
    Returns:
      position_s   — current HA playback position (or null)
      current_fx   — active effect/frame at that position (or null)
      ha_available — whether HA responded
    """
    settings = load_settings()
    position_s = await _ha_position(settings)
    ha_available = position_s is not None

    current = None
    if ha_available and position_s is not None:
        current = _resolve_playback_data(fx_path, bundle_path, timeline_path, position_s)

    return {
        "position_s": position_s,
        "ha_available": ha_available,
        "current_fx": current,
    }


@router.get("/lookup")
def fx_at_time(
    t: float = Query(...),
    fx_path: str | None = Query(default=None),
    bundle_path: str | None = Query(default=None),
    timeline_path: str | None = Query(default=None),
) -> dict:
    """Return the active effect/frame for an arbitrary timestamp (for scrubbing)."""
    result = _resolve_playback_data(fx_path, bundle_path, timeline_path, t)
    if result is None and not any([fx_path, bundle_path, timeline_path]):
        raise HTTPException(status_code=400, detail="Provide fx_path, bundle_path, or timeline_path")
    return {"t": t, "fx": result}
