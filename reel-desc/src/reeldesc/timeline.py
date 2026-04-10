"""Timeline format — the core semantic artifact of ReelDesc.

A timeline is a dense, per-frame semantic description of a video stored as
newline-delimited JSON (JSONL).  Each frame record contains both a natural
language description and structured elemental fields, produced by a single
monolithic VLM pass.

The timeline is the community-shared artifact.  Export formats (.3fx, .srt,
events.json) are derived from it.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass
class TimelineFrame:
    """One frame's worth of semantic data in the timeline."""

    t: float  # timestamp in seconds
    frame_idx: int

    # Natural language descriptions (from VLM)
    description: str = ""
    audio: str = ""
    scene_type: str = ""
    motion: str = ""  # none | low | medium | high

    # Elemental fields (structured, from VLM)
    wind: int = 0  # 0-3
    wind_direction: str = "none"  # frontal | side | rear | surround | none
    water: int = 0  # 0-3
    water_type: str = "none"  # rain | spray | immersion | none
    heat_ambient: int = 0  # 0-3
    heat_radiant: int = 0  # 0-3

    # Quality
    confidence: float = 0.0
    flagged_for_review: bool = False

    # Raw LLM response (not serialised to JSONL by default)
    raw_response: str = field(default="", repr=False)

    def to_dict(self, include_raw: bool = False) -> dict:
        """Serialise to dict for JSONL output."""
        d = asdict(self)
        if not include_raw:
            d.pop("raw_response", None)
        d.pop("flagged_for_review", None)  # derived from confidence at read time
        return d


class Timeline:
    """Read/write/query a timeline.jsonl file."""

    def __init__(self, frames: list[TimelineFrame] | None = None) -> None:
        self.frames: list[TimelineFrame] = frames or []

    def __len__(self) -> int:
        return len(self.frames)

    def __iter__(self):
        return iter(self.frames)

    def __getitem__(self, idx: int) -> TimelineFrame:
        return self.frames[idx]

    def append(self, frame: TimelineFrame) -> None:
        self.frames.append(frame)

    def write(self, path: Path) -> None:
        """Write timeline as newline-delimited JSON."""
        path = Path(path)
        with path.open("w") as f:
            for frame in self.frames:
                f.write(json.dumps(frame.to_dict()) + "\n")

    @classmethod
    def read(cls, path: Path, confidence_threshold: float = 0.7) -> Timeline:
        """Read a timeline.jsonl file. Sets flagged_for_review based on threshold."""
        path = Path(path)
        frames: list[TimelineFrame] = []
        with path.open() as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                d = json.loads(line)
                confidence = float(d.get("confidence", 0.0))
                frames.append(
                    TimelineFrame(
                        t=float(d["t"]),
                        frame_idx=int(d.get("frame_idx", 0)),
                        description=str(d.get("description", "")),
                        audio=str(d.get("audio", "")),
                        scene_type=str(d.get("scene_type", "")),
                        motion=str(d.get("motion", "")),
                        wind=int(d.get("wind", 0)),
                        wind_direction=str(d.get("wind_direction", "none")),
                        water=int(d.get("water", 0)),
                        water_type=str(d.get("water_type", "none")),
                        heat_ambient=int(d.get("heat_ambient", 0)),
                        heat_radiant=int(d.get("heat_radiant", 0)),
                        confidence=confidence,
                        flagged_for_review=confidence < confidence_threshold,
                    )
                )
        return cls(frames)

    def lookup(self, position_s: float) -> TimelineFrame | None:
        """Return the last frame with t <= position_s, or None."""
        if not self.frames or position_s < self.frames[0].t:
            return None
        lo, hi = 0, len(self.frames) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if self.frames[mid].t <= position_s:
                lo = mid
            else:
                hi = mid - 1
        return self.frames[lo]
