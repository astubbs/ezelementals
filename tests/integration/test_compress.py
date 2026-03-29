"""Tests for compress.py — pure Python, no external deps."""

import json

from ezelementals.classify import ClassificationResult
from ezelementals.compress import (
    FxEntry,
    compress_results,
    compression_stats,
    read_3fx,
    write_3fx,
)


def make_result(frame_index, timestamp_s, wind=0, water=0, heat_ambient=0, heat_radiant=0, flagged=False):
    return ClassificationResult(
        frame_index=frame_index,
        timestamp_s=timestamp_s,
        wind=wind,
        wind_direction="none",
        water=water,
        water_type="none",
        heat_ambient=heat_ambient,
        heat_radiant=heat_radiant,
        confidence=0.9 if not flagged else 0.3,
        flagged_for_review=flagged,
        raw_response="{}",
    )


def test_compress_identical_run():
    results = [make_result(i, float(i), wind=2) for i in range(5)]
    entries = compress_results(results)
    assert len(entries) == 1
    assert entries[0].t == 0.0
    assert entries[0].wind == 2


def test_compress_transition():
    results = [
        make_result(0, 0.0, wind=2),
        make_result(1, 1.0, wind=2),
        make_result(2, 2.0, wind=0),
    ]
    entries = compress_results(results)
    assert len(entries) == 2
    assert entries[0].wind == 2
    assert entries[0].t == 0.0
    assert entries[1].wind == 0
    assert entries[1].t == 2.0


def test_compress_single_frame():
    results = [make_result(0, 5.0, wind=1, water=2)]
    entries = compress_results(results)
    assert len(entries) == 1
    assert entries[0].wind == 1
    assert entries[0].water == 2


def test_compress_empty():
    assert compress_results([]) == []


def test_compress_all_different():
    results = [make_result(i, float(i), wind=i % 4) for i in range(4)]
    entries = compress_results(results)
    assert len(entries) == 4


def test_include_flagged_false():
    results = [
        make_result(0, 0.0, wind=1),
        make_result(1, 1.0, wind=1, flagged=True),
        make_result(2, 2.0, wind=1, flagged=True),
        make_result(3, 3.0, wind=2),
    ]
    entries = compress_results(results, include_flagged=False)
    # Only non-flagged frames: [wind=1 at 0.0, wind=2 at 3.0]
    assert len(entries) == 2
    assert entries[0].wind == 1
    assert entries[1].wind == 2


def test_write_read_roundtrip(tmp_path):
    entries = [
        FxEntry(t=0.0, wind=2, water=0, heat_ambient=0, heat_radiant=0),
        FxEntry(t=5.5, wind=0, water=1, heat_ambient=2, heat_radiant=0),
    ]
    path = tmp_path / "test.3fx"
    write_3fx(entries, path)
    loaded = read_3fx(path)
    assert len(loaded) == 2
    assert loaded[0].t == 0.0
    assert loaded[0].wind == 2
    assert loaded[1].t == 5.5
    assert loaded[1].water == 1
    assert loaded[1].heat_ambient == 2


def test_write_3fx_format(tmp_path):
    entries = [FxEntry(t=1.0, wind=1, water=0, heat_ambient=0, heat_radiant=0)]
    path = tmp_path / "test.3fx"
    write_3fx(entries, path)
    lines = path.read_text().strip().split("\n")
    assert len(lines) == 1
    parsed = json.loads(lines[0])
    assert set(parsed.keys()) == {"t", "wind", "water", "heat_ambient", "heat_radiant"}
    assert parsed["t"] == 1.0
    assert parsed["wind"] == 1


def test_compression_stats():
    results = [
        make_result(0, 0.0, wind=2),
        make_result(1, 1.0, wind=2),
        make_result(2, 2.0, wind=2, flagged=True),
        make_result(3, 3.0, wind=0),
    ]
    entries = compress_results(results)
    stats = compression_stats(results, entries)
    assert stats["input_frames"] == 4
    assert stats["output_entries"] == 2
    assert stats["compression_ratio"] == 2.0
    assert stats["flagged_count"] == 1


def test_fx_entry_to_dict():
    entry = FxEntry(t=312.5, wind=2, water=0, heat_ambient=1, heat_radiant=3)
    d = entry.to_dict()
    assert d == {"t": 312.5, "wind": 2, "water": 0, "heat_ambient": 1, "heat_radiant": 3}
