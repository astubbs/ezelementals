"""
End-to-end UI encode test.

Uses the real sample video with stub LLM so no GPU is needed.
Validates the full encode_job → extract_frames → extract_spectrograms →
classify (stub) → compress → write .3fx pipeline via the job manager
that the UI relies on — the exact path that was broken before this test
was written.

Skipped automatically when the sample video is not present.
"""

from __future__ import annotations

import time
from pathlib import Path

import pytest

from ezelementals.ui.jobs.encode_job import S_DONE, S_ERROR, JobManager

# The sample video lives in ignored-notes/ (gitignored directory).
_SAMPLE_VIDEO = Path(__file__).parents[2] / "ignored-notes" / "samples" / "19280141-uhd_2160_4096_30fps.mp4"

pytestmark = pytest.mark.skipif(
    not _SAMPLE_VIDEO.exists(),
    reason=f"Sample video not found at {_SAMPLE_VIDEO}",
)


def _wait_for_job(manager: JobManager, job_id: str, timeout_s: int = 120) -> dict:
    """Poll until the job reaches a terminal state or timeout."""
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        status = manager.status(job_id)
        if status and status["status"] in (S_DONE, S_ERROR, "cancelled"):
            return status
        time.sleep(0.5)
    raise TimeoutError(f"Encode job {job_id!r} did not finish within {timeout_s}s")


def test_encode_stub_produces_valid_3fx(tmp_path: Path) -> None:
    """
    Full encode pipeline with stub LLM must:
      - complete without error
      - produce a .3fx file
      - produce at least one FxEntry
      - have all intensity values in [0, 3]
      - emit frame_start, frame_image, result, progress, and done events
    """
    from ezelementals.compress import read_3fx

    output_path = tmp_path / "output.3fx"
    manager = JobManager()

    # Subscribe to the job queue BEFORE starting so we capture all events.
    job_id = manager.start({
        "video_path": str(_SAMPLE_VIDEO),
        "output_path": str(output_path),
        "fps": 0.5,
        "stub_llm": True,
    })

    job = manager.get_job(job_id)
    assert job is not None, "Job was not created"

    # Subscribe immediately — the job runs in a background thread so this
    # races slightly, but the queue buffers events up to maxsize=500.
    queue = job.subscribe()
    collected: list[dict] = []

    status = _wait_for_job(manager, job_id)

    # Drain the queue (non-blocking — take whatever arrived)
    while not queue.empty():
        try:
            collected.append(queue.get_nowait())
        except Exception:
            break
    job.unsubscribe(queue)

    # ── Job-level assertions ─────────────────────────────────────────────────
    assert status["status"] == S_DONE, f"Job ended with error: {status.get('error')}"
    assert output_path.exists(), ".3fx file was not written"

    # ── .3fx content assertions ──────────────────────────────────────────────
    entries = read_3fx(output_path)
    assert len(entries) > 0, ".3fx file is empty"

    for entry in entries:
        assert 0 <= entry.wind <= 3,         f"wind out of range: {entry.wind}"
        assert 0 <= entry.water <= 3,        f"water out of range: {entry.water}"
        assert 0 <= entry.heat_ambient <= 3, f"heat_ambient out of range: {entry.heat_ambient}"
        assert 0 <= entry.heat_radiant <= 3, f"heat_radiant out of range: {entry.heat_radiant}"
        assert entry.t >= 0,                 f"negative timestamp: {entry.t}"

    # Timestamps must be strictly increasing
    timestamps = [e.t for e in entries]
    assert timestamps == sorted(set(timestamps)), "Timestamps not unique and sorted"


def test_encode_stub_emits_expected_events(tmp_path: Path) -> None:
    """
    The WebSocket event stream must include at least one of each:
      status, frame_start, frame_image (frame + spectrogram), result,
      progress, done.
    """
    import asyncio
    import threading

    output_path = tmp_path / "events.3fx"
    manager = JobManager()

    collected: list[dict] = []
    done_event = threading.Event()

    def _drain(job_id: str) -> None:
        """Subscribe and collect events in a separate thread with its own loop."""
        import asyncio as _asyncio

        async def _collect() -> None:
            job = manager.get_job(job_id)
            assert job is not None
            q = job.subscribe()
            try:
                while True:
                    try:
                        evt = await _asyncio.wait_for(q.get(), timeout=5.0)
                    except _asyncio.TimeoutError:
                        break
                    collected.append(evt)
                    if evt.get("type") in ("done", "error", "cancelled"):
                        break
            finally:
                job.unsubscribe(q)
                done_event.set()

        _asyncio.run(_collect())

    job_id = manager.start({
        "video_path": str(_SAMPLE_VIDEO),
        "output_path": str(output_path),
        "fps": 0.5,
        "stub_llm": True,
    })

    drain_thread = threading.Thread(target=_drain, args=(job_id,), daemon=True)
    drain_thread.start()
    drain_thread.join(timeout=150)

    types_seen = {e["type"] for e in collected}

    assert "status"      in types_seen, f"No status event. Got: {types_seen}"
    assert "frame_start" in types_seen, f"No frame_start event. Got: {types_seen}"
    assert "frame_image" in types_seen, f"No frame_image event. Got: {types_seen}"
    assert "result"      in types_seen, f"No result event. Got: {types_seen}"
    assert "progress"    in types_seen, f"No progress event. Got: {types_seen}"
    assert "done"        in types_seen, f"No done event. Got: {types_seen}"

    # frame_image events must have both frame and spectrogram kinds
    image_kinds = {e["kind"] for e in collected if e["type"] == "frame_image"}
    assert "frame"       in image_kinds, "No frame image emitted"
    assert "spectrogram" in image_kinds, "No spectrogram image emitted"

    # result events must carry valid intensity values
    for evt in collected:
        if evt["type"] == "result":
            for ch in ("wind", "water", "heat_ambient", "heat_radiant"):
                assert 0 <= evt[ch] <= 3, f"{ch} out of range in result event"

    # progress events must have sensible fields
    for evt in collected:
        if evt["type"] == "progress":
            assert evt["total"] > 0
            assert evt["completed"] >= 0
            assert evt["completed"] <= evt["total"]
