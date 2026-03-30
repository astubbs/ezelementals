"""
Configuration manager — reads/writes ~/.config/ezelementals/{settings,devices}.json.
All settings have safe defaults so the app starts cleanly on first run.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

CONFIG_DIR = Path.home() / ".config" / "ezelementals"
SETTINGS_PATH = CONFIG_DIR / "settings.json"
DEVICES_PATH = CONFIG_DIR / "devices.json"

VIDEO_EXTENSIONS = {".mkv", ".mp4", ".avi", ".m4v", ".mov", ".ts", ".wmv", ".flv", ".webm"}

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------

DEFAULT_SETTINGS: dict[str, Any] = {
    "media_roots": [],
    "ollama_instances": [
        {"url": "http://localhost:11434", "model": "qwen2.5-vl:7b", "role": "any"}
    ],
    "ha": {
        "base_url": "http://homeassistant.local:8123",
        "token": "",
        "media_player_entity": "media_player.living_room",
    },
    "encoding_defaults": {
        "fps": 0.5,
        "confidence_threshold": 0.7,
        "two_pass": False,
        "stub_llm": False,
    },
    "ui": {
        "theme": "dark",
        "notify_on_complete": True,
    },
}

DEFAULT_DEVICES: dict[str, Any] = {"devices": []}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ensure_config_dir() -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def _load(path: Path, default: dict[str, Any]) -> dict[str, Any]:
    if path.exists():
        try:
            with path.open() as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return dict(default)


def _save(path: Path, data: dict[str, Any]) -> None:
    _ensure_config_dir()
    with path.open("w") as f:
        json.dump(data, f, indent=2)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def load_settings() -> dict[str, Any]:
    """Return current settings, merged with defaults for any missing keys."""
    saved = _load(SETTINGS_PATH, DEFAULT_SETTINGS)
    # Shallow-merge top-level sections so new default keys appear automatically
    merged = dict(DEFAULT_SETTINGS)
    for key, value in saved.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value
    return merged


def save_settings(data: dict[str, Any]) -> None:
    _save(SETTINGS_PATH, data)


def load_devices() -> dict[str, Any]:
    return _load(DEVICES_PATH, DEFAULT_DEVICES)


def save_devices(data: dict[str, Any]) -> None:
    _save(DEVICES_PATH, data)


def is_first_run() -> bool:
    """True if neither config file exists yet (wizard should run)."""
    return not DEVICES_PATH.exists()
