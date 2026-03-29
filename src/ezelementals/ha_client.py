"""Home Assistant client for playback position and device control."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Callable

import httpx

from ezelementals.compress import FxEntry

logger = logging.getLogger(__name__)


@dataclass
class DeviceConfig:
    entity_id: str
    channel: str  # "wind" | "water" | "heat_ambient" | "heat_radiant"
    latency_ms: int = 0
    intensity_range: tuple[float, float] = (0.0, 1.0)


@dataclass
class HAConfig:
    base_url: str  # e.g. "http://homeassistant.local:8123"
    token: str
    devices: list[DeviceConfig] = field(default_factory=list)


def get_current_fx(
    entries: list[FxEntry],
    playback_position_s: float,
) -> FxEntry | None:
    """Return the last FxEntry with t <= playback_position_s, or None."""
    if not entries or playback_position_s < entries[0].t:
        return None

    lo, hi = 0, len(entries) - 1
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if entries[mid].t <= playback_position_s:
            lo = mid
        else:
            hi = mid - 1
    return entries[lo]


def apply_fx_entry(
    entry: FxEntry,
    config: HAConfig,
    client: httpx.Client | None = None,
) -> dict[str, bool]:
    """Apply FxEntry to all configured HA devices. Returns {entity_id: success}."""
    own_client = client is None
    if own_client:
        client = httpx.Client(timeout=5.0)

    results: dict[str, bool] = {}
    headers = {
        "Authorization": f"Bearer {config.token}",
        "Content-Type": "application/json",
    }

    try:
        for device in config.devices:
            raw_intensity = getattr(entry, device.channel, 0)
            lo, hi = device.intensity_range
            scaled = lo + (raw_intensity / 3.0) * (hi - lo)

            try:
                resp = client.post(
                    f"{config.base_url}/api/services/input_number/set_value",
                    headers=headers,
                    json={"entity_id": device.entity_id, "value": round(scaled, 4)},
                )
                results[device.entity_id] = resp.is_success
            except Exception as e:
                logger.warning("Failed to set %s: %s", device.entity_id, e)
                results[device.entity_id] = False
    finally:
        if own_client:
            client.close()

    return results


def get_playback_position_ha(
    config: HAConfig,
    media_player_entity: str,
    client: httpx.Client | None = None,
) -> float:
    """Get current media_position from HA media_player entity. Returns 0.0 on failure."""
    own_client = client is None
    if own_client:
        client = httpx.Client(timeout=5.0)

    try:
        headers = {"Authorization": f"Bearer {config.token}"}
        resp = client.get(
            f"{config.base_url}/api/states/{media_player_entity}",
            headers=headers,
        )
        resp.raise_for_status()
        return float(resp.json().get("attributes", {}).get("media_position", 0.0))
    except Exception as e:
        logger.warning("Failed to get playback position: %s", e)
        return 0.0
    finally:
        if own_client:
            client.close()


def poll_and_apply(
    entries: list[FxEntry],
    config: HAConfig,
    get_playback_position: Callable[[], float],
    poll_interval_s: float = 0.5,
) -> None:
    """Poll playback position and apply FxEntry changes. Exits on KeyboardInterrupt."""
    last_entry = None
    try:
        while True:
            position = get_playback_position()
            current = get_current_fx(entries, position)
            if current is not None and current is not last_entry:
                apply_fx_entry(current, config)
                last_entry = current
            time.sleep(poll_interval_s)
    except KeyboardInterrupt:
        pass
