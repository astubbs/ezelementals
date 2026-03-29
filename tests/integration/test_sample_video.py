"""Integration test against a real video file using stub LLM mode.

Skipped automatically when the sample video is not present.
Run manually after downloading a test clip:

    bin/test.sh tests/integration/test_sample_video.py -v

To use a different video set EZELEMENTALS_SAMPLE_VIDEO env var:

    EZELEMENTALS_SAMPLE_VIDEO=/path/to/clip.mp4 bin/test.sh tests/integration/test_sample_video.py
"""

import json
import os
from pathlib import Path

import pytest

from ezelementals.classify import ClassifyConfig
from ezelementals.pipeline import PipelineConfig, run_pipeline

# Default location — override with env var
_DEFAULT_VIDEO = Path("/Users/astubbs/Downloads/19280141-uhd_2160_4096_30fps.mp4")
SAMPLE_VIDEO = Path(os.environ.get("EZELEMENTALS_SAMPLE_VIDEO", _DEFAULT_VIDEO))

pytestmark = pytest.mark.skipif(
    not SAMPLE_VIDEO.exists(),
    reason=f"Sample video not present: {SAMPLE_VIDEO}",
)


def test_extract_produces_frames(tmp_path):
    """ffmpeg should extract at least a handful of frames from the sample clip."""
    from ezelementals.extract import extract_frames

    frames_dir = tmp_path / "frames"
    # This clip is smooth nature footage — needs a low threshold to find changes
    samples = extract_frames(SAMPLE_VIDEO, frames_dir, fps=0.5)

    assert len(samples) > 0, (
        "No frames extracted — check fps setting or ffmpeg filter. "
        f"Video: {SAMPLE_VIDEO}"
    )
    for s in samples:
        assert s.frame_path.exists(), f"Frame file missing: {s.frame_path}"
        assert s.timestamp_s >= 0.0


def test_full_pipeline_stub_produces_3fx(tmp_path):
    """Full pipeline with stub LLM should produce a non-empty .3fx file."""
    output = tmp_path / "out.3fx"
    config = PipelineConfig(
        video_path=SAMPLE_VIDEO,
        output_path=output,
        frames_dir=tmp_path / "frames",
        fps=0.5,
        classify_config=ClassifyConfig(stub=True),
    )
    result = run_pipeline(config)

    assert output.exists(), ".3fx file was not written"
    assert result.stats["input_frames"] > 0, "No frames were classified"
    assert result.stats["output_entries"] > 0, "No .3fx entries were produced"

    lines = output.read_text().strip().split("\n")
    assert len(lines) > 0
    for line in lines:
        entry = json.loads(line)
        assert set(entry.keys()) == {"t", "wind", "water", "heat_ambient", "heat_radiant"}
        assert entry["t"] >= 0.0
        assert all(0 <= entry[k] <= 3 for k in ("wind", "water", "heat_ambient", "heat_radiant"))


def test_full_pipeline_stub_compression(tmp_path):
    """Stub output should be compressed — fewer entries than input frames."""
    output = tmp_path / "out.3fx"
    result = run_pipeline(PipelineConfig(
        video_path=SAMPLE_VIDEO,
        output_path=output,
        frames_dir=tmp_path / "frames",
        fps=0.5,
        classify_config=ClassifyConfig(stub=True),
    ))

    # Stub values are seeded per frame_index so many will differ — but the
    # pipeline should still not produce MORE entries than input frames.
    assert result.stats["output_entries"] <= result.stats["input_frames"]


def test_full_pipeline_stub_timestamps_ordered(tmp_path):
    """Entries in the .3fx file must be in ascending timestamp order."""
    output = tmp_path / "out.3fx"
    run_pipeline(PipelineConfig(
        video_path=SAMPLE_VIDEO,
        output_path=output,
        frames_dir=tmp_path / "frames",
        fps=0.5,
        classify_config=ClassifyConfig(stub=True),
    ))

    raw = output.read_text().strip()
    assert raw, ".3fx file is empty — no frames were extracted"
    entries = [json.loads(line) for line in raw.split("\n")]
    timestamps = [e["t"] for e in entries]
    assert timestamps == sorted(timestamps), "Timestamps not in order"
