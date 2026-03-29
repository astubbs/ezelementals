"""Tests for ha_client.py — HA HTTP calls mocked via pytest-httpx."""

import pytest
from pytest_httpx import HTTPXMock

from ezelementals.compress import FxEntry
from ezelementals.ha_client import (
    DeviceConfig,
    HAConfig,
    apply_fx_entry,
    get_current_fx,
    get_playback_position_ha,
)

HA_URL = "http://homeassistant.local:8123"
TOKEN = "test_token_abc"


def make_entries():
    return [
        FxEntry(t=0.0, wind=1, water=0, heat_ambient=0, heat_radiant=0),
        FxEntry(t=10.0, wind=2, water=1, heat_ambient=0, heat_radiant=0),
        FxEntry(t=25.0, wind=3, water=0, heat_ambient=2, heat_radiant=1),
    ]


# --- get_current_fx ---

def test_get_current_fx_at_start():
    entries = make_entries()
    result = get_current_fx(entries, 0.0)
    assert result is not None
    assert result.wind == 1


def test_get_current_fx_between_entries():
    entries = make_entries()
    result = get_current_fx(entries, 15.0)
    assert result is not None
    assert result.t == 10.0
    assert result.wind == 2


def test_get_current_fx_before_first_entry():
    entries = make_entries()
    assert get_current_fx(entries, -1.0) is None


def test_get_current_fx_at_exact_boundary():
    entries = make_entries()
    result = get_current_fx(entries, 25.0)
    assert result.t == 25.0
    assert result.wind == 3


def test_get_current_fx_after_last_entry():
    entries = make_entries()
    result = get_current_fx(entries, 9999.0)
    assert result.t == 25.0


def test_get_current_fx_empty():
    assert get_current_fx([], 5.0) is None


# --- apply_fx_entry ---

def test_apply_fx_entry_scales_correctly(httpx_mock: HTTPXMock):
    """wind=2 with range (0.0, 0.5) should send value 0.3333."""
    httpx_mock.add_response(status_code=200, json=[])

    config = HAConfig(
        base_url=HA_URL,
        token=TOKEN,
        devices=[DeviceConfig(entity_id="input_number.fan", channel="wind", intensity_range=(0.0, 0.5))],  # noqa: E501
    )
    entry = FxEntry(t=0.0, wind=2, water=0, heat_ambient=0, heat_radiant=0)
    results = apply_fx_entry(entry, config)

    assert results["input_number.fan"] is True
    request = httpx_mock.get_requests()[0]
    body = request.read()
    import json
    parsed = json.loads(body)
    assert parsed["value"] == pytest.approx(2 / 3 * 0.5, abs=0.001)


def test_apply_fx_entry_zero_intensity(httpx_mock: HTTPXMock):
    httpx_mock.add_response(status_code=200, json=[])
    config = HAConfig(
        base_url=HA_URL,
        token=TOKEN,
        devices=[DeviceConfig(entity_id="input_number.fan", channel="wind", intensity_range=(0.0, 1.0))],  # noqa: E501
    )
    entry = FxEntry(t=0.0, wind=0, water=0, heat_ambient=0, heat_radiant=0)
    results = apply_fx_entry(entry, config)
    assert results["input_number.fan"] is True
    request = httpx_mock.get_requests()[0]
    import json
    assert json.loads(request.read())["value"] == 0.0


def test_apply_fx_entry_ha_error(httpx_mock: HTTPXMock):
    httpx_mock.add_response(status_code=500)
    config = HAConfig(
        base_url=HA_URL,
        token=TOKEN,
        devices=[DeviceConfig(entity_id="input_number.fan", channel="wind")],
    )
    entry = FxEntry(t=0.0, wind=1, water=0, heat_ambient=0, heat_radiant=0)
    results = apply_fx_entry(entry, config)
    assert results["input_number.fan"] is False


def test_apply_fx_entry_no_devices():
    config = HAConfig(base_url=HA_URL, token=TOKEN, devices=[])
    entry = FxEntry(t=0.0, wind=2, water=0, heat_ambient=0, heat_radiant=0)
    assert apply_fx_entry(entry, config) == {}


# --- get_playback_position_ha ---

def test_get_playback_position_ha(httpx_mock: HTTPXMock):
    httpx_mock.add_response(json={"attributes": {"media_position": 42.5}})
    config = HAConfig(base_url=HA_URL, token=TOKEN)
    pos = get_playback_position_ha(config, "media_player.living_room")
    assert pos == pytest.approx(42.5)


def test_get_playback_position_ha_missing_attribute(httpx_mock: HTTPXMock):
    httpx_mock.add_response(json={"attributes": {}})
    config = HAConfig(base_url=HA_URL, token=TOKEN)
    pos = get_playback_position_ha(config, "media_player.living_room")
    assert pos == 0.0


def test_get_playback_position_ha_error(httpx_mock: HTTPXMock):
    httpx_mock.add_response(status_code=404)
    config = HAConfig(base_url=HA_URL, token=TOKEN)
    pos = get_playback_position_ha(config, "media_player.living_room")
    assert pos == 0.0
