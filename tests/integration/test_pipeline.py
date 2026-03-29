"""End-to-end pipeline tests — subprocess and Ollama both mocked."""

import json
import shutil
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from pytest_httpx import HTTPXMock

from ezelementals.pipeline import PipelineConfig, run_pipeline
from tests.fixtures.mock_responses import FURY_ROAD_SANDSTORM, VALID_CLASSIFICATION, ollama_response

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"

SHOWINFO_STDERR = """\
[Parsed_showinfo_1 @ 0x0] n:   0 pts:    512 pts_time:0.512000
[Parsed_showinfo_1 @ 0x0] n:   1 pts:   1536 pts_time:1.536000
[Parsed_showinfo_1 @ 0x0] n:   2 pts:   4608 pts_time:4.608000
"""


def _setup_fake_pipeline(tmp_path, httpx_mock, responses):
    """Set up mocks for extract + classify stages."""
    video_path = tmp_path / "movie.mkv"
    video_path.write_bytes(b"fake")

    frames_dir = tmp_path / "frames"
    frames_dir.mkdir()
    for i in range(1, 4):
        shutil.copy(FIXTURES_DIR / "sample_frame.jpg", frames_dir / f"{i:04d}.jpg")

    mock_run = MagicMock(return_value=MagicMock(stderr=SHOWINFO_STDERR, returncode=0))
    for resp in responses:
        httpx_mock.add_response(json=ollama_response(resp))

    return video_path, frames_dir, mock_run


def test_pipeline_end_to_end_mocked(httpx_mock: HTTPXMock, tmp_path):
    video_path, frames_dir, mock_run = _setup_fake_pipeline(
        tmp_path, httpx_mock,
        [FURY_ROAD_SANDSTORM, FURY_ROAD_SANDSTORM, VALID_CLASSIFICATION],
    )
    output_path = tmp_path / "output.3fx"

    with patch("subprocess.run", mock_run), \
         patch("librosa.load", return_value=(np.zeros(22050, dtype=np.float32), 22050)):
        result = run_pipeline(PipelineConfig(
            video_path=video_path,
            output_path=output_path,
            frames_dir=frames_dir,
        ))

    assert output_path.exists()
    assert len(result.fx_entries) > 0
    assert result.stats["input_frames"] == 3


def test_pipeline_output_3fx_valid_json(httpx_mock: HTTPXMock, tmp_path):
    video_path, frames_dir, mock_run = _setup_fake_pipeline(
        tmp_path, httpx_mock,
        [VALID_CLASSIFICATION, VALID_CLASSIFICATION, VALID_CLASSIFICATION],
    )
    output_path = tmp_path / "output.3fx"

    with patch("subprocess.run", mock_run), \
         patch("librosa.load", return_value=(np.zeros(22050, dtype=np.float32), 22050)):
        run_pipeline(PipelineConfig(
            video_path=video_path,
            output_path=output_path,
            frames_dir=frames_dir,
        ))

    for line in output_path.read_text().strip().split("\n"):
        parsed = json.loads(line)
        assert "t" in parsed and "wind" in parsed


def test_pipeline_compression_applied(httpx_mock: HTTPXMock, tmp_path):
    """All identical responses → compressed to 1 entry."""
    video_path, frames_dir, mock_run = _setup_fake_pipeline(
        tmp_path, httpx_mock,
        [FURY_ROAD_SANDSTORM, FURY_ROAD_SANDSTORM, FURY_ROAD_SANDSTORM],
    )
    output_path = tmp_path / "output.3fx"

    with patch("subprocess.run", mock_run), \
         patch("librosa.load", return_value=(np.zeros(22050, dtype=np.float32), 22050)):
        result = run_pipeline(PipelineConfig(
            video_path=video_path,
            output_path=output_path,
            frames_dir=frames_dir,
        ))

    assert result.stats["output_entries"] == 1
    assert result.stats["input_frames"] == 3


def test_pipeline_missing_video_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        run_pipeline(PipelineConfig(
            video_path=tmp_path / "nonexistent.mkv",
            output_path=tmp_path / "out.3fx",
        ))
