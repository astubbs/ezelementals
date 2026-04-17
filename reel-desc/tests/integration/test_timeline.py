"""Tests for the timeline.jsonl format."""

import json

from reeldesc.timeline import Timeline, TimelineFrame


def _make_frame(t: float, idx: int = 0, **kwargs) -> TimelineFrame:
    return TimelineFrame(t=t, frame_idx=idx, **kwargs)


class TestTimelineFrame:
    def test_to_dict_excludes_raw_response(self):
        frame = _make_frame(1.0, raw_response="<raw>")
        d = frame.to_dict()
        assert "raw_response" not in d
        assert d["t"] == 1.0

    def test_to_dict_excludes_flagged_for_review(self):
        frame = _make_frame(1.0, flagged_for_review=True)
        d = frame.to_dict()
        assert "flagged_for_review" not in d

    def test_to_dict_includes_raw_when_requested(self):
        frame = _make_frame(1.0, raw_response="<raw>")
        d = frame.to_dict(include_raw=True)
        assert d["raw_response"] == "<raw>"

    def test_to_dict_all_fields_present(self):
        frame = _make_frame(
            2.0,
            idx=5,
            description="A desert scene",
            audio="Wind howling",
            scene_type="exterior_desert",
            motion="high",
            wind=3,
            wind_direction="frontal",
            water=0,
            water_type="none",
            heat_ambient=2,
            heat_radiant=1,
            confidence=0.95,
        )
        d = frame.to_dict()
        assert d["t"] == 2.0
        assert d["frame_idx"] == 5
        assert d["description"] == "A desert scene"
        assert d["audio"] == "Wind howling"
        assert d["scene_type"] == "exterior_desert"
        assert d["motion"] == "high"
        assert d["wind"] == 3
        assert d["wind_direction"] == "frontal"
        assert d["water"] == 0
        assert d["heat_ambient"] == 2
        assert d["heat_radiant"] == 1
        assert d["confidence"] == 0.95


class TestTimeline:
    def test_empty_timeline(self):
        tl = Timeline()
        assert len(tl) == 0

    def test_append_and_len(self):
        tl = Timeline()
        tl.append(_make_frame(0.0))
        tl.append(_make_frame(2.0, idx=1))
        assert len(tl) == 2

    def test_iterate(self):
        frames = [_make_frame(0.0), _make_frame(2.0, idx=1)]
        tl = Timeline(frames)
        assert [f.t for f in tl] == [0.0, 2.0]

    def test_getitem(self):
        tl = Timeline([_make_frame(0.0), _make_frame(2.0, idx=1)])
        assert tl[1].t == 2.0

    def test_write_read_roundtrip(self, tmp_path):
        frames = [
            _make_frame(
                0.0,
                description="Opening shot",
                audio="Silence",
                wind=1,
                confidence=0.85,
            ),
            _make_frame(
                2.0,
                idx=1,
                description="Storm begins",
                audio="Thunder",
                wind=3,
                wind_direction="frontal",
                heat_radiant=2,
                confidence=0.92,
            ),
        ]
        tl = Timeline(frames)
        path = tmp_path / "timeline.jsonl"
        tl.write(path)

        # Verify raw file format
        lines = path.read_text().strip().split("\n")
        assert len(lines) == 2
        first = json.loads(lines[0])
        assert first["t"] == 0.0
        assert first["description"] == "Opening shot"
        assert "raw_response" not in first
        assert "flagged_for_review" not in first

        # Read back
        tl2 = Timeline.read(path)
        assert len(tl2) == 2
        assert tl2[0].description == "Opening shot"
        assert tl2[1].wind == 3
        assert tl2[1].wind_direction == "frontal"
        assert tl2[1].confidence == 0.92

    def test_read_sets_flagged_for_review(self, tmp_path):
        path = tmp_path / "timeline.jsonl"
        path.write_text(
            json.dumps({"t": 0.0, "frame_idx": 0, "confidence": 0.5}) + "\n"
            + json.dumps({"t": 2.0, "frame_idx": 1, "confidence": 0.9}) + "\n"
        )
        tl = Timeline.read(path, confidence_threshold=0.7)
        assert tl[0].flagged_for_review is True
        assert tl[1].flagged_for_review is False

    def test_read_handles_missing_optional_fields(self, tmp_path):
        """Minimal record with only required fields."""
        path = tmp_path / "timeline.jsonl"
        path.write_text(json.dumps({"t": 5.0, "frame_idx": 2}) + "\n")
        tl = Timeline.read(path)
        assert len(tl) == 1
        assert tl[0].t == 5.0
        assert tl[0].description == ""
        assert tl[0].wind == 0
        assert tl[0].confidence == 0.0


class TestTimelineLookup:
    def _sample_timeline(self) -> Timeline:
        return Timeline([
            _make_frame(0.0, wind=0),
            _make_frame(10.0, idx=5, wind=2),
            _make_frame(20.0, idx=10, wind=3),
            _make_frame(30.0, idx=15, wind=1),
        ])

    def test_lookup_before_first(self):
        tl = self._sample_timeline()
        assert tl.lookup(-1.0) is None

    def test_lookup_at_first(self):
        tl = self._sample_timeline()
        assert tl.lookup(0.0).wind == 0

    def test_lookup_between(self):
        tl = self._sample_timeline()
        assert tl.lookup(15.0).wind == 2  # last frame at or before 15.0 is t=10.0

    def test_lookup_at_exact(self):
        tl = self._sample_timeline()
        assert tl.lookup(20.0).wind == 3

    def test_lookup_after_last(self):
        tl = self._sample_timeline()
        assert tl.lookup(100.0).wind == 1

    def test_lookup_empty(self):
        tl = Timeline()
        assert tl.lookup(5.0) is None
