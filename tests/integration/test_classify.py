"""Tests for classify.py — Ollama HTTP calls mocked via pytest-httpx."""

import json

import pytest
from pytest_httpx import HTTPXMock

from ezelementals.classify import (
    _parse_llm_response,
    classify_batch,
    classify_frame,
)
from tests.fixtures.mock_responses import (
    CLAMPED_CLASSIFICATION,
    DUNKIRK_BEACH,
    FURY_ROAD_SANDSTORM,
    LOW_CONFIDENCE_CLASSIFICATION,
    MALFORMED_RESPONSE,
    MISSING_FIELD_CLASSIFICATION,
    VALID_CLASSIFICATION,
    ollama_raw_response,
    ollama_response,
)

OLLAMA_URL = "http://localhost:11434"


def test_parse_llm_response_happy_path():
    raw = json.dumps(VALID_CLASSIFICATION)
    result = _parse_llm_response(raw, frame_index=0, timestamp_s=10.5)
    assert result.wind == 2
    assert result.wind_direction == "frontal"
    assert result.water == 0
    assert result.confidence == pytest.approx(0.88)
    assert result.flagged_for_review is False
    assert result.raw_response == raw


def test_parse_llm_response_low_confidence_flagged():
    raw = json.dumps(LOW_CONFIDENCE_CLASSIFICATION)
    result = _parse_llm_response(raw, frame_index=0, timestamp_s=0.0, confidence_threshold=0.7)
    assert result.flagged_for_review is True
    assert result.confidence == pytest.approx(0.4)


def test_parse_llm_response_malformed_json():
    result = _parse_llm_response(MALFORMED_RESPONSE, frame_index=2, timestamp_s=5.0)
    assert result.flagged_for_review is True
    assert result.confidence == 0.0
    assert result.wind == 0
    assert result.raw_response == MALFORMED_RESPONSE


def test_parse_llm_response_missing_field():
    raw = json.dumps(MISSING_FIELD_CLASSIFICATION)
    result = _parse_llm_response(raw, frame_index=0, timestamp_s=0.0, confidence_threshold=0.7)
    assert result.water == 0
    assert result.water_type == "none"
    assert result.wind == 1


def test_parse_llm_response_intensity_clamping():
    raw = json.dumps(CLAMPED_CLASSIFICATION)
    result = _parse_llm_response(raw, frame_index=0, timestamp_s=0.0)
    assert result.wind == 3      # clamped from 5
    assert result.water == 0     # clamped from -1
    assert result.heat_radiant == 3  # clamped from 99


def test_classify_frame_happy_path(httpx_mock: HTTPXMock, sample_frame_sample, default_classify_config):
    httpx_mock.add_response(json=ollama_response(FURY_ROAD_SANDSTORM))

    result = classify_frame(sample_frame_sample, default_classify_config)

    assert result.wind == 3
    assert result.heat_ambient == 2
    assert result.confidence == pytest.approx(0.95)
    assert result.flagged_for_review is False
    assert result.frame_index == 0
    assert result.timestamp_s == pytest.approx(10.5)


def test_classify_frame_low_confidence(httpx_mock: HTTPXMock, sample_frame_sample, default_classify_config):
    httpx_mock.add_response(json=ollama_response(LOW_CONFIDENCE_CLASSIFICATION))

    result = classify_frame(sample_frame_sample, default_classify_config)
    assert result.flagged_for_review is True


def test_classify_frame_malformed_response(httpx_mock: HTTPXMock, sample_frame_sample, default_classify_config):  # noqa: E501
    httpx_mock.add_response(json=ollama_raw_response(MALFORMED_RESPONSE))

    result = classify_frame(sample_frame_sample, default_classify_config)
    assert result.flagged_for_review is True
    assert result.confidence == 0.0


def test_classify_frame_http_error(httpx_mock: HTTPXMock, sample_frame_sample, default_classify_config):
    httpx_mock.add_response(status_code=500)

    result = classify_frame(sample_frame_sample, default_classify_config)
    assert result.flagged_for_review is True


def test_classify_batch_ordering(httpx_mock: HTTPXMock, tmp_path, default_classify_config):
    from pathlib import Path

    from ezelementals.extract import FrameSample

    fixture_dir = Path(__file__).parent.parent / "fixtures"
    frame_path = fixture_dir / "sample_frame.jpg"
    spec_path = fixture_dir / "sample_spectrogram.png"

    samples = [FrameSample(i, float(i), frame_path, spec_path) for i in range(3)]
    for resp in [FURY_ROAD_SANDSTORM, DUNKIRK_BEACH, VALID_CLASSIFICATION]:
        httpx_mock.add_response(json=ollama_response(resp))

    results = classify_batch(samples, default_classify_config)

    assert len(results) == 3
    assert results[0].frame_index == 0
    assert results[1].frame_index == 1
    assert results[2].frame_index == 2
    assert results[0].wind == 3   # FURY_ROAD_SANDSTORM
    assert results[1].water == 2  # DUNKIRK_BEACH


def test_classify_batch_continues_on_http_failure(httpx_mock: HTTPXMock, tmp_path, default_classify_config):
    from pathlib import Path

    from ezelementals.extract import FrameSample

    fixture_dir = Path(__file__).parent.parent / "fixtures"
    frame_path = fixture_dir / "sample_frame.jpg"
    spec_path = fixture_dir / "sample_spectrogram.png"

    samples = [FrameSample(i, float(i), frame_path, spec_path) for i in range(3)]
    httpx_mock.add_response(json=ollama_response(VALID_CLASSIFICATION))
    httpx_mock.add_response(status_code=503)
    httpx_mock.add_response(json=ollama_response(VALID_CLASSIFICATION))

    results = classify_batch(samples, default_classify_config)

    assert len(results) == 3
    assert results[0].flagged_for_review is False
    assert results[1].flagged_for_review is True   # 503 → flagged
    assert results[2].flagged_for_review is False


