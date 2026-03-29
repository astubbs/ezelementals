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

from ezelementals.ui.config import load_settings

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


@router.get("/state")
async def get_player_state(fx_path: str = Query(...)) -> dict:
    """
    Returns:
      position_s   — current HA playback position (or null)
      current_fx   — the active FxEntry at that position (or null)
      ha_available — whether HA responded
    """
    settings = load_settings()
    position_s = await _ha_position(settings)
    ha_available = position_s is not None

    current = None
    if ha_available:
        p = Path(fx_path)
        if p.exists():
            try:
                entries = _load_fx(p)
                current = _current_fx(entries, position_s)
            except Exception:
                pass

    return {
        "position_s": position_s,
        "ha_available": ha_available,
        "current_fx": current,
    }


@router.get("/lookup")
def fx_at_time(fx_path: str = Query(...), t: float = Query(...)) -> dict:
    """Return the active FxEntry for an arbitrary timestamp (for scrubbing)."""
    p = Path(fx_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Track not found")
    entries = _load_fx(p)
    fx = _current_fx(entries, t)
    return {"t": t, "fx": fx}
