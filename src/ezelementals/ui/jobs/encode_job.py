"""
Async encode job manager.

Each job wraps the existing pipeline in a background thread (via asyncio's
run_in_executor) so the event loop stays free.  Progress events are pushed
onto a per-job asyncio.Queue; the WebSocket handler consumes that queue.

Parallel workers: if the caller supplies multiple {url, model} worker dicts,
the frame list is distributed round-robin across ThreadPoolExecutor workers,
one thread per Ollama instance.
"""

from __future__ import annotations

import asyncio
import base64
import concurrent.futures
import logging
import threading
import time
import uuid
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

# Status values
S_RUNNING = "running"
S_DONE = "done"
S_CANCELLED = "cancelled"
S_ERROR = "error"


class EncodeJob:
    def __init__(self, job_id: str, params: dict[str, Any]) -> None:
        self.job_id = job_id
        self.params = params
        self.status: str = S_RUNNING
        self.progress: dict[str, Any] = {"completed": 0, "total": 0}
        self.error: str | None = None
        self.output_path: str | None = None
        self.flagged_count: int = 0
        self._cancel_event = threading.Event()
        # Subscribers: set of asyncio.Queue (one per connected WS client)
        self._queues: set[asyncio.Queue] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=500)
        self._queues.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._queues.discard(q)

    def _emit(self, event: dict[str, Any]) -> None:
        """Thread-safe broadcast to all subscriber queues."""
        if self._loop is None:
            return
        for q in list(self._queues):
            try:
                self._loop.call_soon_threadsafe(q.put_nowait, event)
            except asyncio.QueueFull:
                pass  # slow client — drop event

    def cancel(self) -> None:
        self._cancel_event.set()

    def _run(self) -> None:
        """Blocking work — runs in a thread pool."""
        import tempfile

        from ezelementals.classify import ClassifyConfig, classify_frame
        from ezelementals.compress import write_3fx
        from ezelementals.extract import FrameSample, extract_frames, extract_spectrograms

        params = self.params
        video_path = Path(params["video_path"])
        output_path = Path(params.get("output_path") or video_path.with_suffix(".3fx"))
        fps = float(params.get("fps", 0.5))
        stub = bool(params.get("stub_llm", False))

        # Build worker configs
        workers_param = params.get("workers") or []
        if workers_param:
            worker_cfgs = [
                ClassifyConfig(
                    ollama_base_url=w.get("url", "http://localhost:11434"),
                    model=w.get("model", "qwen2.5vl:7b"),
                    confidence_threshold=float(params.get("confidence_threshold", 0.7)),
                    stub=stub,
                )
                for w in workers_param
            ]
        else:
            worker_cfgs = [
                ClassifyConfig(
                    ollama_base_url=params.get("ollama_url", "http://localhost:11434"),
                    model=params.get("model", "qwen2.5vl:7b"),
                    confidence_threshold=float(params.get("confidence_threshold", 0.7)),
                    stub=stub,
                )
            ]

        # ── Extract frames ───────────────────────────────────────────────────
        log.info("[%s] Extracting frames from %s at %.2f fps", self.job_id, video_path.name, fps)
        self._emit({
            "type": "status",
            "message": f"Extracting frames at {fps} fps…",
            "phase": "extracting_frames",
        })
        tmp_dir = tempfile.mkdtemp(prefix="ezelementals_")
        frames_dir = Path(tmp_dir)
        try:
            samples: list[FrameSample] = extract_frames(video_path, frames_dir, fps=fps)
        except Exception as exc:
            log.error("[%s] extract_frames failed: %s", self.job_id, exc)
            self.status = S_ERROR
            self.error = str(exc)
            self._emit({"type": "error", "worker": 0, "frame_index": -1, "message": str(exc)})
            return

        log.info("[%s] Extracted %d frames", self.job_id, len(samples))
        self._emit({
            "type": "status",
            "message": f"Extracted {len(samples)} frames. Generating spectrograms…",
            "phase": "extracting_spectrograms",
            "total_frames": len(samples),
        })

        # ── Extract spectrograms ─────────────────────────────────────────────
        try:
            samples = extract_spectrograms(video_path, frames_dir, samples)
        except Exception as exc:
            log.error("[%s] extract_spectrograms failed: %s", self.job_id, exc)
            self.status = S_ERROR
            self.error = str(exc)
            self._emit({"type": "error", "worker": 0, "frame_index": -1, "message": str(exc)})
            return

        total = len(samples)
        self.progress["total"] = total
        n_workers = len(worker_cfgs)
        log.info(
            "[%s] Spectrograms ready. Starting classification of %d frames with %d worker(s)",
            self.job_id, total, n_workers,
        )
        self._emit({
            "type": "status",
            "message": f"Classifying {total} frames with {n_workers} worker(s)…",
            "phase": "classifying",
        })
        self._emit({"type": "progress", "completed": 0, "total": total, "eta_s": None})

        # ── Classify frames (parallel workers) ──────────────────────────────
        results = []
        completed = 0
        start_time = time.monotonic()

        def _process_frame(args: tuple[int, FrameSample, int]) -> Any:
            """Run in thread pool. Returns ClassificationResult or None on cancel."""
            frame_idx, sample, worker_idx = args
            if self._cancel_event.is_set():
                return None
            cfg = worker_cfgs[worker_idx % n_workers]

            # Emit frame_start + images
            self._emit(
                {
                    "type": "frame_start",
                    "worker": worker_idx,
                    "frame_index": frame_idx,
                    "timestamp_s": sample.timestamp_s,
                }
            )
            # Send frame image
            try:
                img_data = base64.b64encode(Path(sample.frame_path).read_bytes()).decode()
                self._emit(
                    {
                        "type": "frame_image",
                        "worker": worker_idx,
                        "frame_index": frame_idx,
                        "data": img_data,
                        "kind": "frame",
                    }
                )
            except OSError:
                pass
            # Send spectrogram image
            try:
                spec_data = base64.b64encode(Path(sample.spectrogram_path).read_bytes()).decode()
                self._emit(
                    {
                        "type": "frame_image",
                        "worker": worker_idx,
                        "frame_index": frame_idx,
                        "data": spec_data,
                        "kind": "spectrogram",
                    }
                )
            except OSError:
                pass

            result = classify_frame(sample, cfg)

            self._emit(
                {
                    "type": "result",
                    "worker": worker_idx,
                    "frame_index": frame_idx,
                    "timestamp_s": sample.timestamp_s,
                    "wind": result.wind,
                    "water": result.water,
                    "heat_ambient": result.heat_ambient,
                    "heat_radiant": result.heat_radiant,
                    "confidence": result.confidence,
                    "flagged": result.flagged_for_review,
                }
            )
            return result

        # Distribute frames across workers round-robin
        work_items = [(i, s, i % n_workers) for i, s in enumerate(samples)]

        with concurrent.futures.ThreadPoolExecutor(max_workers=max(n_workers, 1)) as executor:
            futures = {executor.submit(_process_frame, item): item for item in work_items}
            for future in concurrent.futures.as_completed(futures):
                if self._cancel_event.is_set():
                    executor.shutdown(wait=False, cancel_futures=True)
                    break
                result = future.result()
                if result is not None:
                    results.append(result)
                    completed += 1
                    elapsed = time.monotonic() - start_time
                    fps_rate = completed / elapsed if elapsed > 0 else 0
                    eta = int((total - completed) / fps_rate) if fps_rate > 0 else None
                    self.progress = {"completed": completed, "total": total}
                    self._emit(
                        {
                            "type": "progress",
                            "completed": completed,
                            "total": total,
                            "eta_s": eta,
                        }
                    )

        if self._cancel_event.is_set():
            self.status = S_CANCELLED
            self._emit({"type": "cancelled"})
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)
            return

        # ── Compress + write ─────────────────────────────────────────────────
        from ezelementals.compress import compress_results

        log.info("[%s] Classification complete. Compressing %d results…", self.job_id, len(results))
        self._emit({"type": "status", "message": "Compressing and writing .3fx…", "phase": "compressing"})
        entries = compress_results(results)
        write_3fx(entries, output_path)

        flagged = sum(1 for r in results if r.flagged_for_review)
        self.flagged_count = flagged
        self.output_path = str(output_path)
        self.status = S_DONE
        log.info("[%s] Done. Written %s  flagged=%d", self.job_id, output_path, flagged)
        self._emit(
            {
                "type": "done",
                "flagged_count": flagged,
                "output_path": str(output_path),
            }
        )

        # Clean up temp frames/spectrograms directory
        import shutil
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass


class JobManager:
    """Thread-safe store of active and recent encode jobs."""

    def __init__(self) -> None:
        self._jobs: dict[str, EncodeJob] = {}
        self._lock = threading.Lock()

    def start(self, params: dict[str, Any]) -> str:
        job_id = str(uuid.uuid4())[:8]
        job = EncodeJob(job_id, params)

        async def _launch() -> None:
            job._loop = asyncio.get_running_loop()
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, job._run)

        with self._lock:
            self._jobs[job_id] = job

        # Schedule the coroutine on whichever event loop is running
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_launch())
        except RuntimeError:
            # Not called from async context (tests) — run synchronously
            import threading as _t

            def _thread_run() -> None:
                asyncio.run(_launch())

            _t.Thread(target=_thread_run, daemon=True).start()

        return job_id

    def cancel(self, job_id: str) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
        if job is None or job.status != S_RUNNING:
            return False
        job.cancel()
        return True

    def status(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            job = self._jobs.get(job_id)
        if job is None:
            return None
        return {
            "job_id": job_id,
            "status": job.status,
            "progress": job.progress,
            "flagged_count": job.flagged_count,
            "output_path": job.output_path,
            "error": job.error,
        }

    def list_all(self) -> list[dict[str, Any]]:
        with self._lock:
            jobs = list(self._jobs.values())
        return [
            {
                "job_id": j.job_id,
                "status": j.status,
                "progress": j.progress,
                "video_path": j.params.get("video_path"),
            }
            for j in jobs
        ]

    def get_job(self, job_id: str) -> EncodeJob | None:
        with self._lock:
            return self._jobs.get(job_id)
