"""Tests for extract.py — subprocess calls mocked."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from PIL import Image

from ezelementals.extract import (
    FrameSample,
    _generate_spectrogram,
    _parse_showinfo_timestamps,
    extract_frames,
    extract_spectrograms,
)

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"

SHOWINFO_STDERR = """\
[Parsed_showinfo_1 @ 0x600003210000] n:   0 pts:    512 pts_time:0.512000 pos:...
[Parsed_showinfo_1 @ 0x600003210000] n:   1 pts:   1536 pts_time:1.536000 pos:...
[Parsed_showinfo_1 @ 0x600003210000] n:   2 pts:   4608 pts_time:4.608000 pos:...
"""


def test_parse_showinfo_timestamps():
    timestamps = _parse_showinfo_timestamps(SHOWINFO_STDERR)
    assert timestamps == pytest.approx([0.512, 1.536, 4.608])


def test_parse_showinfo_timestamps_empty():
    assert _parse_showinfo_timestamps("no timestamps here") == []


def test_generate_spectrogram_produces_png(tmp_path):
    audio = np.zeros(22050, dtype=np.float32)
    output = tmp_path / "spec.png"
    _generate_spectrogram(audio, output)
    assert output.exists()
    img = Image.open(output)
    assert img.mode == "L"
    assert img.size[0] > 0 and img.size[1] > 0


def test_generate_spectrogram_nonsilent(tmp_path):
    rng = np.random.default_rng(42)
    audio = rng.standard_normal(22050).astype(np.float32)
    output = tmp_path / "spec.png"
    _generate_spectrogram(audio, output)
    assert output.exists()


def test_extract_frames_calls_ffmpeg_with_correct_args(tmp_path):
    mock_result = MagicMock()
    mock_result.stderr = SHOWINFO_STDERR
    mock_result.returncode = 0

    # Pre-place fake JPEG files so FrameSamples are created
    for i in range(1, 4):
        (tmp_path / f"{i:04d}.jpg").write_bytes(
            (FIXTURES_DIR / "sample_frame.jpg").read_bytes()
        )

    with patch("subprocess.run", return_value=mock_result) as mock_run:
        extract_frames(Path("movie.mkv"), tmp_path, scene_threshold=0.4)

    cmd = mock_run.call_args[0][0]
    assert "ffmpeg" in cmd
    assert "select='gt(scene,0.4)'" in " ".join(cmd) or any("0.4" in arg for arg in cmd)
    assert "-vsync" in cmd
    assert "vfr" in cmd


def test_extract_frames_returns_correct_count(tmp_path):
    mock_result = MagicMock()
    mock_result.stderr = SHOWINFO_STDERR
    mock_result.returncode = 0

    for i in range(1, 4):
        (tmp_path / f"{i:04d}.jpg").write_bytes(
            (FIXTURES_DIR / "sample_frame.jpg").read_bytes()
        )

    with patch("subprocess.run", return_value=mock_result):
        samples = extract_frames(Path("movie.mkv"), tmp_path)

    assert len(samples) == 3
    assert samples[0].timestamp_s == pytest.approx(0.512)
    assert samples[1].timestamp_s == pytest.approx(1.536)
    assert samples[2].timestamp_s == pytest.approx(4.608)


def test_extract_frames_custom_threshold(tmp_path):
    mock_result = MagicMock()
    mock_result.stderr = ""
    mock_result.returncode = 0

    with patch("subprocess.run", return_value=mock_result) as mock_run:
        extract_frames(Path("movie.mkv"), tmp_path, scene_threshold=0.6)

    cmd_str = " ".join(mock_run.call_args[0][0])
    assert "0.6" in cmd_str


def test_extract_spectrograms_window_centering(tmp_path):
    """Verify ffmpeg -ss and -t args are correct for a 2s window."""
    samples = [
        FrameSample(0, 10.0, FIXTURES_DIR / "sample_frame.jpg", Path("")),
        FrameSample(1, 20.0, FIXTURES_DIR / "sample_frame.jpg", Path("")),
    ]

    mock_run = MagicMock()
    mock_run.return_value = MagicMock(returncode=0)

    fake_wav = tmp_path / "fake.wav"


    with patch("subprocess.run", mock_run), \
         patch("tempfile.NamedTemporaryFile") as mock_tmp, \
         patch("librosa.load", return_value=(np.zeros(22050, dtype=np.float32), 22050)):

        # Make NamedTemporaryFile return a path that "exists" with size 0
        mock_file = MagicMock()
        mock_file.__enter__ = lambda s: s
        mock_file.__exit__ = MagicMock(return_value=False)
        mock_file.name = str(fake_wav)
        mock_tmp.return_value = mock_file

        updated = extract_spectrograms(Path("movie.mkv"), tmp_path, samples, window_s=2.0)

    assert len(updated) == 2
    calls = mock_run.call_args_list
    # First call: frame 0 at t=10.0, window 2s → start=9.0
    first_cmd = calls[0][0][0]
    assert "-ss" in first_cmd
    ss_idx = first_cmd.index("-ss")
    assert float(first_cmd[ss_idx + 1]) == pytest.approx(9.0)
