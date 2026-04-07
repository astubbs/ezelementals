"""Tests for the bundle format."""

import json

from reeldesc.bundle import BundleMeta, create_bundle, list_bundle_exports, read_bundle
from reeldesc.timeline import Timeline, TimelineFrame


def _sample_timeline() -> Timeline:
    return Timeline([
        TimelineFrame(t=0.0, frame_idx=0, description="Opening", wind=1, confidence=0.9),
        TimelineFrame(t=2.0, frame_idx=1, description="Storm", wind=3, confidence=0.85),
    ])


def _sample_meta() -> BundleMeta:
    return BundleMeta(
        title="Test Film",
        year=2024,
        imdb_id="tt1234567",
        generator_version="0.1.0",
        fps=0.5,
        model="qwen2.5vl:7b",
    )


class TestCreateBundle:
    def test_creates_directory(self, tmp_path):
        bundle_dir = tmp_path / "test.bundle"
        create_bundle(bundle_dir, _sample_meta(), _sample_timeline())
        assert bundle_dir.is_dir()

    def test_contains_meta_json(self, tmp_path):
        bundle_dir = tmp_path / "test.bundle"
        create_bundle(bundle_dir, _sample_meta(), _sample_timeline())
        meta_path = bundle_dir / "meta.json"
        assert meta_path.exists()
        meta = json.loads(meta_path.read_text())
        assert meta["title"] == "Test Film"
        assert meta["imdb_id"] == "tt1234567"

    def test_contains_timeline_jsonl(self, tmp_path):
        bundle_dir = tmp_path / "test.bundle"
        create_bundle(bundle_dir, _sample_meta(), _sample_timeline())
        tl_path = bundle_dir / "timeline.jsonl"
        assert tl_path.exists()
        lines = tl_path.read_text().strip().split("\n")
        assert len(lines) == 2

    def test_copies_exports(self, tmp_path):
        bundle_dir = tmp_path / "test.bundle"
        # Create a fake .3fx export
        fx_path = tmp_path / "elemental.3fx"
        fx_path.write_text('{"t": 0.0, "wind": 1}\n')

        create_bundle(bundle_dir, _sample_meta(), _sample_timeline(), exports={"elemental.3fx": fx_path})
        assert (bundle_dir / "elemental.3fx").exists()

    def test_meta_omits_empty_fields(self, tmp_path):
        bundle_dir = tmp_path / "test.bundle"
        meta = BundleMeta(title="Minimal")
        create_bundle(bundle_dir, meta, _sample_timeline())
        loaded = json.loads((bundle_dir / "meta.json").read_text())
        assert "title" in loaded
        assert "imdb_id" not in loaded  # empty string omitted


class TestReadBundle:
    def test_roundtrip(self, tmp_path):
        bundle_dir = tmp_path / "test.bundle"
        create_bundle(bundle_dir, _sample_meta(), _sample_timeline())

        meta, timeline = read_bundle(bundle_dir)
        assert meta.title == "Test Film"
        assert meta.year == 2024
        assert len(timeline) == 2
        assert timeline[0].description == "Opening"
        assert timeline[1].wind == 3

    def test_missing_meta_raises(self, tmp_path):
        bundle_dir = tmp_path / "test.bundle"
        bundle_dir.mkdir()
        (bundle_dir / "timeline.jsonl").write_text("{}\n")
        import pytest
        with pytest.raises(FileNotFoundError, match="meta.json"):
            read_bundle(bundle_dir)

    def test_missing_timeline_raises(self, tmp_path):
        bundle_dir = tmp_path / "test.bundle"
        bundle_dir.mkdir()
        (bundle_dir / "meta.json").write_text("{}")
        import pytest
        with pytest.raises(FileNotFoundError, match="timeline.jsonl"):
            read_bundle(bundle_dir)


class TestListBundleExports:
    def test_lists_exports(self, tmp_path):
        bundle_dir = tmp_path / "test.bundle"
        bundle_dir.mkdir()
        (bundle_dir / "meta.json").write_text("{}")
        (bundle_dir / "timeline.jsonl").write_text("")
        (bundle_dir / "elemental.3fx").write_text("")
        (bundle_dir / "ad_script.srt").write_text("")

        exports = list_bundle_exports(bundle_dir)
        assert exports == ["ad_script.srt", "elemental.3fx"]

    def test_empty_bundle(self, tmp_path):
        bundle_dir = tmp_path / "test.bundle"
        bundle_dir.mkdir()
        (bundle_dir / "meta.json").write_text("{}")
        (bundle_dir / "timeline.jsonl").write_text("")

        assert list_bundle_exports(bundle_dir) == []
