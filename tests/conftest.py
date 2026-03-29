"""Shared pytest fixtures."""

import shutil
from pathlib import Path

import pytest

from ezelementals.classify import ClassifyConfig
from ezelementals.extract import FrameSample

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_frame_path(tmp_path):
    src = FIXTURES_DIR / "sample_frame.jpg"
    dst = tmp_path / "frame.jpg"
    shutil.copy(src, dst)
    return dst


@pytest.fixture
def sample_spectrogram_path(tmp_path):
    src = FIXTURES_DIR / "sample_spectrogram.png"
    dst = tmp_path / "spec.png"
    shutil.copy(src, dst)
    return dst


@pytest.fixture
def sample_frame_sample(tmp_path, sample_frame_path, sample_spectrogram_path):
    return FrameSample(
        frame_index=0,
        timestamp_s=10.5,
        frame_path=sample_frame_path,
        spectrogram_path=sample_spectrogram_path,
    )


@pytest.fixture
def default_classify_config():
    return ClassifyConfig(
        ollama_base_url="http://localhost:11434",
        model="qwen2.5-vl:7b",
        confidence_threshold=0.7,
    )
