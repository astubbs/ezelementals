"""Top-level pipeline orchestrator."""

from __future__ import annotations

import argparse
import contextlib
import logging
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

from ezelementals.classify import ClassificationResult, ClassifyConfig, classify_batch
from ezelementals.compress import FxEntry, compress_results, compression_stats, write_3fx
from ezelementals.extract import extract_frames, extract_spectrograms

logger = logging.getLogger(__name__)


@dataclass
class PipelineConfig:
    video_path: Path
    output_path: Path
    frames_dir: Path | None = None
    fps: float = 0.5
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

    # If the path doesn't exist, try looking in common locations like Downloads
    if not config.video_path.exists():
        downloads_path = Path.home() / "Downloads" / config.video_path.name
        if downloads_path.exists():
            config.video_path = downloads_path
        else:
            raise FileNotFoundError(f"Video not found: {config.video_path}")

    with contextlib.ExitStack() as stack:
        if config.frames_dir:
            frames_dir = Path(config.frames_dir)
            frames_dir.mkdir(parents=True, exist_ok=True)
        else:
            frames_dir = Path(stack.enter_context(tempfile.TemporaryDirectory()))

        logger.info("Extracting frames from %s at %.2f fps", config.video_path, config.fps)
        samples = extract_frames(config.video_path, frames_dir, config.fps)
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


def _print_banner(config: PipelineConfig) -> None:
    cc = config.classify_config
    lines = [
        "",
        "┌─────────────────────────────────────────────┐",
        "│           ezElementals  ·  M0 spike          │",
        "└─────────────────────────────────────────────┘",
        f"  input          {config.video_path}",
        f"  output         {config.output_path}",
        f"  frames dir     {config.frames_dir or '(temp)'}",
        "",
        "  ── classifier ─────────────────────────────",
        f"  backend        {'Stub (random, no LLM)' if cc.stub else 'Ollama'}",
        f"  model          {cc.model}" if not cc.stub else "  model          —",
        f"  endpoint       {cc.ollama_base_url}" if not cc.stub else "  endpoint       —",
        f"  confidence ≥   {cc.confidence_threshold}",
        "",
        "  ── extraction ─────────────────────────────",
        f"  sample rate    {config.fps} fps  (1 frame every {1/config.fps:.0f}s)",
        f"  flagged frames {'included' if config.include_flagged_in_output else 'excluded'} in output",
        "",
    ]
    print("\n".join(lines))


def run_pipeline_cli() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s", datefmt="%H:%M:%S")

    parser = argparse.ArgumentParser(
        description="Generate a .3fx effect track from a video file."
    )
    parser.add_argument("video", type=Path, help="Input video file")
    parser.add_argument("output", type=Path, nargs="?", help="Output .3fx file (default: <video>.3fx)")
    parser.add_argument("--fps", type=float, default=0.5, help="Frames per second to extract (default: 0.5)")
    parser.add_argument("--ollama-url", default="http://localhost:11434")
    parser.add_argument("--model", default="qwen2.5-vl:7b")
    parser.add_argument("--confidence-threshold", type=float, default=0.7)
    parser.add_argument("--frames-dir", type=Path, default=None)
    parser.add_argument("--stub-llm", action="store_true", help="Use random stub instead of Ollama")
    args = parser.parse_args()

    if not args.video.exists():
        print(f"error: video not found: {args.video}", file=sys.stderr)
        sys.exit(1)

    output = args.output or args.video.with_suffix(".3fx")

    config = PipelineConfig(
        video_path=args.video,
        output_path=output,
        frames_dir=args.frames_dir,
        fps=args.fps,
        classify_config=ClassifyConfig(
            ollama_base_url=args.ollama_url,
            model=args.model,
            confidence_threshold=args.confidence_threshold,
            stub=args.stub_llm,
        ),
    )

    _print_banner(config)
    try:
        result = run_pipeline(config)
    except (FileNotFoundError, RuntimeError) as exc:
        print(f"\n  error: {exc}", file=sys.stderr)
        sys.exit(1)
    print(
        f"\n  ✓ done — {result.stats['output_entries']} entries "
        f"({result.stats['compression_ratio']:.1f}x compression, "
        f"{result.stats['flagged_count']} flagged)\n"
    )
