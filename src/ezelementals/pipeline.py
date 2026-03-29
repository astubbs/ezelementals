"""Top-level pipeline orchestrator."""

from __future__ import annotations

import argparse
import logging
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

from ezelementals.classify import ClassificationResult, ClassifyConfig, classify_batch
from ezelementals.compress import FxEntry, compress_results, compression_stats, write_3fx
from ezelementals.extract import FrameSample, extract_frames, extract_spectrograms

logger = logging.getLogger(__name__)


@dataclass
class PipelineConfig:
    video_path: Path
    output_path: Path
    frames_dir: Path | None = None
    scene_threshold: float = 0.4
    classify_config: ClassifyConfig = field(default_factory=ClassifyConfig)
    include_flagged_in_output: bool = True


@dataclass
class PipelineResult:
    fx_entries: list[FxEntry]
    classification_results: list[ClassificationResult]
    stats: dict
    output_path: Path


def run_pipeline(config: PipelineConfig) -> PipelineResult:
    """Run the full extract → classify → compress → write pipeline."""
    config.video_path = Path(config.video_path)
    config.output_path = Path(config.output_path)

    if not config.video_path.exists():
        raise FileNotFoundError(f"Video not found: {config.video_path}")

    with tempfile.TemporaryDirectory() as _tmpdir:
        frames_dir = Path(config.frames_dir) if config.frames_dir else Path(_tmpdir)
        frames_dir.mkdir(parents=True, exist_ok=True)

        logger.info("Extracting frames from %s", config.video_path)
        samples: list[FrameSample] = extract_frames(
            config.video_path, frames_dir, config.scene_threshold
        )
        logger.info("Extracted %d frames", len(samples))

        logger.info("Extracting spectrograms")
        samples = extract_spectrograms(config.video_path, frames_dir, samples)

        logger.info("Classifying %d samples", len(samples))
        results: list[ClassificationResult] = classify_batch(
            samples,
            config.classify_config,
            on_progress=lambda i, n: logger.info("  %d/%d", i, n),
        )

        entries = compress_results(results, include_flagged=config.include_flagged_in_output)
        stats = compression_stats(results, entries)
        logger.info(
            "Compressed %d frames → %d entries (ratio %.1fx, %d flagged)",
            stats["input_frames"],
            stats["output_entries"],
            stats["compression_ratio"],
            stats["flagged_count"],
        )

        config.output_path.parent.mkdir(parents=True, exist_ok=True)
        write_3fx(entries, config.output_path)
        logger.info("Wrote %s", config.output_path)

        return PipelineResult(
            fx_entries=entries,
            classification_results=results,
            stats=stats,
            output_path=config.output_path,
        )


def run_pipeline_cli() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    parser = argparse.ArgumentParser(
        description="Generate a .3fx effect track from a video file."
    )
    parser.add_argument("video", type=Path, help="Input video file")
    parser.add_argument("output", type=Path, help="Output .3fx file")
    parser.add_argument("--scene-threshold", type=float, default=0.4)
    parser.add_argument("--ollama-url", default="http://localhost:11434")
    parser.add_argument("--model", default="qwen2.5vl:7b")
    parser.add_argument("--confidence-threshold", type=float, default=0.7)
    parser.add_argument("--frames-dir", type=Path, default=None)
    args = parser.parse_args()

    config = PipelineConfig(
        video_path=args.video,
        output_path=args.output,
        frames_dir=args.frames_dir,
        scene_threshold=args.scene_threshold,
        classify_config=ClassifyConfig(
            ollama_base_url=args.ollama_url,
            model=args.model,
            confidence_threshold=args.confidence_threshold,
        ),
    )
    result = run_pipeline(config)
    print(
        f"Done: {result.stats['output_entries']} entries, "
        f"compression ratio {result.stats['compression_ratio']:.1f}x, "
        f"{result.stats['flagged_count']} flagged"
    )
