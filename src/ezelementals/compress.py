"""Compress classification results into .3fx entries via run-length encoding.

Note: wind_direction and water_type from ClassificationResult are intentionally
dropped here — the .3fx spec only carries intensity values. The full
ClassificationResult data (including direction) is retained in
PipelineResult.classification_results for future use in M2 directional control.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ezelementals.classify import ClassificationResult


@dataclass
class FxEntry:
    t: float
    wind: int
    water: int
    heat_ambient: int
    heat_radiant: int

    def to_dict(self) -> dict:
        return {
            "t": self.t,
            "wind": self.wind,
            "water": self.water,
            "heat_ambient": self.heat_ambient,
            "heat_radiant": self.heat_radiant,
        }


def compress_results(
    results: list[ClassificationResult],
    include_flagged: bool = True,
) -> list[FxEntry]:
    """Run-length encode classification results into FxEntry list.

    Consecutive results with identical (wind, water, heat_ambient, heat_radiant)
    tuples are collapsed to a single entry at the first timestamp of that run.
    Results must be sorted by timestamp_s.
    """
    assert all(
        results[i].timestamp_s <= results[i + 1].timestamp_s for i in range(len(results) - 1)
    ), "results must be sorted by timestamp_s before calling compress_results"
    filtered = [r for r in results if include_flagged or not r.flagged_for_review]
    if not filtered:
        return []

    entries: list[FxEntry] = []
    current = filtered[0]
    current_key = (current.wind, current.water, current.heat_ambient, current.heat_radiant)

    for result in filtered[1:]:
        key = (result.wind, result.water, result.heat_ambient, result.heat_radiant)
        if key != current_key:
            entries.append(
                FxEntry(
                    t=current.timestamp_s,
                    wind=current.wind,
                    water=current.water,
                    heat_ambient=current.heat_ambient,
                    heat_radiant=current.heat_radiant,
                )
            )
            current = result
            current_key = key

    # Emit the final run
    entries.append(
        FxEntry(
            t=current.timestamp_s,
            wind=current.wind,
            water=current.water,
            heat_ambient=current.heat_ambient,
            heat_radiant=current.heat_radiant,
        )
    )
    return entries


def write_3fx(entries: list[FxEntry], output_path: Path) -> None:
    """Write entries as newline-delimited JSON to output_path."""
    output_path = Path(output_path)
    with output_path.open("w") as f:
        for entry in entries:
            f.write(json.dumps(entry.to_dict()) + "\n")


def read_3fx(input_path: Path) -> list[FxEntry]:
    """Parse a .3fx file (newline-delimited JSON) into FxEntry list."""
    input_path = Path(input_path)
    entries = []
    with input_path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            entries.append(
                FxEntry(
                    t=d["t"],
                    wind=d["wind"],
                    water=d["water"],
                    heat_ambient=d["heat_ambient"],
                    heat_radiant=d["heat_radiant"],
                )
            )
    return entries


def compression_stats(
    raw: list[ClassificationResult],
    compressed: list[FxEntry],
) -> dict:
    """Return compression stats dict."""
    input_frames = len(raw)
    output_entries = len(compressed)
    flagged_count = sum(1 for r in raw if r.flagged_for_review)
    return {
        "input_frames": input_frames,
        "output_entries": output_entries,
        "compression_ratio": input_frames / output_entries if output_entries else 0,
        "flagged_count": flagged_count,
    }
