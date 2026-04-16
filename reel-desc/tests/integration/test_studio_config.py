"""Tests for studio.config env var override (REELDESC_CONFIG_DIR)."""

from __future__ import annotations

import importlib
from pathlib import Path

import pytest


def _reload_config_module():
    """Reload the config module so it re-reads the env var at import."""
    from reeldesc.studio import config
    return importlib.reload(config)


def test_default_config_dir_is_home_based(monkeypatch):
    monkeypatch.delenv("REELDESC_CONFIG_DIR", raising=False)
    config = _reload_config_module()
    assert config.CONFIG_DIR == Path.home() / ".config" / "reeldesc"
    assert config.SETTINGS_PATH == config.CONFIG_DIR / "settings.json"
    assert config.DEVICES_PATH == config.CONFIG_DIR / "devices.json"


def test_env_var_overrides_config_dir(monkeypatch, tmp_path):
    monkeypatch.setenv("REELDESC_CONFIG_DIR", str(tmp_path))
    config = _reload_config_module()
    assert config.CONFIG_DIR == tmp_path
    assert config.SETTINGS_PATH == tmp_path / "settings.json"
    assert config.DEVICES_PATH == tmp_path / "devices.json"


def test_save_and_load_roundtrip_under_override(monkeypatch, tmp_path):
    monkeypatch.setenv("REELDESC_CONFIG_DIR", str(tmp_path))
    config = _reload_config_module()

    custom = {
        "media_roots": ["/tmp/movies"],
        "ollama_instances": [{"url": "http://x:1", "model": "test", "role": "any"}],
        "ha": {"base_url": "http://ha:8123", "token": "t", "media_player_entity": "media_player.x"},
        "encoding_defaults": {"fps": 1.0, "confidence_threshold": 0.8, "two_pass": True, "stub_llm": True},
        "ui": {"theme": "light", "notify_on_complete": False},
    }
    config.save_settings(custom)

    # File landed in the override dir, not in ~/.config/reeldesc
    assert (tmp_path / "settings.json").exists()
    home_settings = Path.home() / ".config" / "reeldesc" / "settings.json"
    # We can't assert the home file doesn't exist (user might have one), but
    # we can verify the override path is where we wrote
    loaded = config.load_settings()
    assert loaded["media_roots"] == ["/tmp/movies"]
    assert loaded["encoding_defaults"]["stub_llm"] is True


@pytest.fixture(autouse=True)
def _restore_config_module():
    """After each test, reload config with whatever env is currently set.

    This keeps the module's CONFIG_DIR in sync for any other tests that
    might import it later.
    """
    yield
    _reload_config_module()
