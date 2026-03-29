"""ffmpeg frame and mel spectrogram extraction."""

from __future__ import annotations

import logging
import re
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


@dataclass
class FrameSample:
    frame_index: int
    timestamp_s: float
    frame_path: Path
    spectrogram_path: Path


def _parse_showinfo_timestamps(stderr_output: str) -> list[float]:
    """Extract pts_time values from ffmpeg showinfo filter stderr output."""
    # Example line: [Parsed_showinfo_1 @ 0x...] n:   0 pts: 512 pts_time:0.512000
    timestamps = []
    for match in re.finditer(r"pts_time:(\d+(?:\.\d+)?)", stderr_output):
        timestamps.append(float(match.group(1)))
    return timestamps


def _generate_spectrogram(
    audio_array: np.ndarray,
    output_path: Path,
    sr: int = 22050,
    n_mels: int = 128,
) -> None:
    """Compute mel spectrogram from audio array and save as greyscale PNG."""
    if len(audio_array) == 0:
        audio_array = np.zeros(sr, dtype=np.float32)

    mel = librosa.feature.melspectrogram(y=audio_array, sr=sr, n_mels=n_mels)
    db = librosa.power_to_db(mel, ref=np.max) if mel.max() > 0 else mel

    # Normalise to 0–255
    db_min, db_max = db.min(), db.max()
    if db_max > db_min:
        normalised = ((db - db_min) / (db_max - db_min) * 255).astype(np.uint8)
    else:
        normalised = np.zeros_like(db, dtype=np.uint8)

    # Flip vertically so low frequencies are at the bottom
    img = Image.fromarray(np.flipud(normalised), mode="L")
    img.save(output_path)


def extract_frames(
    video_path: Path,
    output_dir: Path,
    fps: float = 0.5,
    ffmpeg_bin: str = "ffmpeg",
) -> list[FrameSample]:
    """Extract frames from video at a fixed rate using ffmpeg.

    Defaults to 0.5fps (one frame every 2 seconds) as per the M0 spec.
    Uses the showinfo filter to capture per-frame timestamps from stderr.
    Returns FrameSample list sorted by timestamp.
    """
    video_path = Path(video_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # format=yuvj420p converts limited-range yuv420p to full-range so the
    # JPEG encoder accepts it (required for bt709/tv-range source material).
    filter_str = f"fps={fps},showinfo,format=yuvj420p"
    cmd = [
        ffmpeg_bin,
        "-i", str(video_path),
        "-vf", filter_str,
        "-fps_mode", "vfr",
        "-y",
        str(output_dir / "%04d.jpg"),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.warning("ffmpeg exited with code %d:\n%s", result.returncode, result.stderr)
        raise RuntimeError(f"ffmpeg failed (exit {result.returncode}) — see logs for details")
    # ffmpeg writes filter output to stderr even on success
    timestamps = _parse_showinfo_timestamps(result.stderr)

    frame_files = sorted(output_dir.glob("*.jpg"))
    samples = []
    for i, (frame_path, ts) in enumerate(zip(frame_files, timestamps)):
        samples.append(
            FrameSample(
                frame_index=i,
                timestamp_s=ts,
                frame_path=frame_path,
                spectrogram_path=Path(""),  # filled in by extract_spectrograms
            )
        )

    return samples


def extract_spectrograms(
    video_path: Path,
    output_dir: Path,
    samples: list[FrameSample],
    window_s: float = 2.0,
    sr: int = 22050,
    ffmpeg_bin: str = "ffmpeg",
) -> list[FrameSample]:
    """Extract mel spectrograms for each FrameSample.

    For each sample, extracts a window_s-second audio clip centred on the
    frame timestamp, computes a mel spectrogram, and saves it as a PNG.
    Returns updated FrameSamples with spectrogram_path set.

    # TODO M1: parallelise with ThreadPoolExecutor — at 0.5fps a 2hr film
    # produces ~3600 frames, each requiring a separate ffmpeg subprocess.
    """
    video_path = Path(video_path)
    output_dir = Path(output_dir)
    updated = []

    for sample in samples:
        start = max(0.0, sample.timestamp_s - window_s / 2)
        spec_path = output_dir / f"{sample.frame_index:04d}_spec.png"

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            wav_path = Path(tmp.name)

        cmd = [
            ffmpeg_bin,
            "-ss", str(start),
            "-i", str(video_path),
            "-t", str(window_s),
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", str(sr),
            "-ac", "1",
            "-y",
            str(wav_path),
        ]
        subprocess.run(cmd, capture_output=True)

        if wav_path.exists() and wav_path.stat().st_size > 0:
            audio, _ = librosa.load(str(wav_path), sr=sr, mono=True)
        else:
            audio = np.zeros(sr, dtype=np.float32)

        wav_path.unlink(missing_ok=True)
        _generate_spectrogram(audio, spec_path, sr=sr)

        updated.append(
            FrameSample(
                frame_index=sample.frame_index,
                timestamp_s=sample.timestamp_s,
                frame_path=sample.frame_path,
                spectrogram_path=spec_path,
            )
        )

    return updated
