"""Ollama inference pipeline for frame classification."""

from __future__ import annotations

import base64
import json
import logging
import random
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import httpx

logger = logging.getLogger(__name__)

DEFAULT_PROMPT = """\
You are analyzing a movie scene to determine environmental effects for a 4D home theatre.

Analyze the provided video frame and audio spectrogram. Return ONLY valid JSON with these exact fields:
{
  "wind": <0-3>,
  "wind_direction": "<frontal|side|rear|none>",
  "water": <0-3>,
  "water_type": "<rain|spray|none>",
  "heat_ambient": <0-3>,
  "heat_radiant": <0-3>,
  "confidence": <0.0-1.0>
}

Intensity scale: 0=none, 1=subtle, 2=moderate, 3=intense.
confidence: your certainty about this classification.
"""


@dataclass
class ClassificationResult:
    frame_index: int
    timestamp_s: float
    wind: int
    wind_direction: str
    water: int
    water_type: str
    heat_ambient: int
    heat_radiant: int
    confidence: float
    flagged_for_review: bool
    raw_response: str


@dataclass
class ClassifyConfig:
    ollama_base_url: str = "http://localhost:11434"
    model: str = "qwen2.5-vl:7b"
    confidence_threshold: float = 0.7
    timeout_s: float = 30.0
    prompt_template: str = field(default_factory=lambda: DEFAULT_PROMPT)
    stub: bool = False  # return random values instead of calling Ollama


_WIND_DIRECTIONS = ["frontal", "side", "rear", "none"]
_WATER_TYPES = ["rain", "spray", "none"]


def _clamp(value: int, lo: int = 0, hi: int = 3) -> int:
    return max(lo, min(hi, int(value)))


def _classify_stub(frame_index: int, timestamp_s: float) -> ClassificationResult:
    """Return random effect values — for local testing without Ollama."""
    rng = random.Random(frame_index)  # seeded per-frame for reproducibility
    return ClassificationResult(
        frame_index=frame_index,
        timestamp_s=timestamp_s,
        wind=rng.randint(0, 3),
        wind_direction=rng.choice(_WIND_DIRECTIONS),
        water=rng.randint(0, 3),
        water_type=rng.choice(_WATER_TYPES),
        heat_ambient=rng.randint(0, 3),
        heat_radiant=rng.randint(0, 3),
        confidence=round(rng.uniform(0.6, 1.0), 2),
        flagged_for_review=False,
        raw_response="<stub>",
    )


def _parse_llm_response(
    raw: str,
    frame_index: int,
    timestamp_s: float,
    confidence_threshold: float = 0.7,
) -> ClassificationResult:
    """Parse LLM JSON string into ClassificationResult. Never raises."""
    try:
        data = json.loads(raw)
        confidence = float(data.get("confidence", 0.0))
        result = ClassificationResult(
            frame_index=frame_index,
            timestamp_s=timestamp_s,
            wind=_clamp(data.get("wind", 0)),
            wind_direction=str(data.get("wind_direction", "none")),
            water=_clamp(data.get("water", 0)),
            water_type=str(data.get("water_type", "none")),
            heat_ambient=_clamp(data.get("heat_ambient", 0)),
            heat_radiant=_clamp(data.get("heat_radiant", 0)),
            confidence=confidence,
            flagged_for_review=confidence < confidence_threshold,
            raw_response=raw,
        )
    except (json.JSONDecodeError, ValueError, TypeError) as e:
        logger.warning("Failed to parse LLM response for frame %d: %s", frame_index, e)
        result = ClassificationResult(
            frame_index=frame_index,
            timestamp_s=timestamp_s,
            wind=0,
            wind_direction="none",
            water=0,
            water_type="none",
            heat_ambient=0,
            heat_radiant=0,
            confidence=0.0,
            flagged_for_review=True,
            raw_response=raw,
        )
    return result


def _encode_image_b64(image_path: Path) -> str:
    return base64.b64encode(Path(image_path).read_bytes()).decode("ascii")


def classify_frame(
    sample: "FrameSample",  # noqa: F821 — avoid circular import
    config: ClassifyConfig,
    client: httpx.Client | None = None,
) -> ClassificationResult:
    """Classify a single frame. Uses stub mode if config.stub is True. Never raises."""
    if config.stub:
        return _classify_stub(sample.frame_index, sample.timestamp_s)

    own_client = client is None
    if own_client:
        client = httpx.Client(timeout=config.timeout_s)

    try:
        frame_b64 = _encode_image_b64(sample.frame_path)
        spec_b64 = _encode_image_b64(sample.spectrogram_path)

        payload = {
            "model": config.model,
            "prompt": config.prompt_template,
            "images": [frame_b64, spec_b64],
            "format": "json",
            "stream": False,
        }

        response = client.post(
            f"{config.ollama_base_url}/api/generate",
            json=payload,
        )
        response.raise_for_status()
        raw = response.json().get("response", "")
        return _parse_llm_response(
            raw, sample.frame_index, sample.timestamp_s, config.confidence_threshold
        )

    except Exception as e:
        logger.warning("classify_frame failed for frame %d: %s", sample.frame_index, e)
        return ClassificationResult(
            frame_index=sample.frame_index,
            timestamp_s=sample.timestamp_s,
            wind=0,
            wind_direction="none",
            water=0,
            water_type="none",
            heat_ambient=0,
            heat_radiant=0,
            confidence=0.0,
            flagged_for_review=True,
            raw_response="",
        )
    finally:
        if own_client:
            client.close()


def classify_batch(
    samples: list["FrameSample"],  # noqa: F821
    config: ClassifyConfig,
    client: httpx.Client | None = None,
    on_progress: Callable[[int, int], None] | None = None,
) -> list[ClassificationResult]:
    """Classify all samples sequentially. Continues on per-sample failure."""
    own_client = client is None
    if own_client:
        client = httpx.Client(timeout=config.timeout_s)

    results = []
    t_start = time.monotonic()
    try:
        for i, sample in enumerate(samples):
            result = classify_frame(sample, config, client=client)
            results.append(result)
            elapsed = time.monotonic() - t_start
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            eta = (len(samples) - i - 1) / rate if rate > 0 else 0
            flag = " ⚑" if result.flagged_for_review else ""
            logger.info(
                "  [%d/%d] t=%.1fs  wind=%d water=%d heat_a=%d heat_r=%d"
                "  conf=%.2f%s  (%.2f fps, ETA %ds)",
                i + 1, len(samples), sample.timestamp_s,
                result.wind, result.water, result.heat_ambient, result.heat_radiant,
                result.confidence, flag, rate, int(eta),
            )
            if on_progress:
                on_progress(i + 1, len(samples))
    finally:
        if own_client:
            client.close()

    return results
