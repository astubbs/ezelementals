"""
Encoder REST routes — start, cancel, and query encode jobs.
The actual work and WebSocket stream live in jobs/encode_job.py and ws/encoder_stream.py.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ezelementals.ui.jobs.encode_job import JobManager

router = APIRouter(prefix="/api/encoder", tags=["encoder"])

# Singleton job manager shared with the WS handler
manager = JobManager()


class StartRequest(BaseModel):
    video_path: str
    output_path: str | None = None
    fps: float = 0.5
    ollama_url: str = "http://localhost:11434"
    model: str = "qwen2.5-vl:7b"
    confidence_threshold: float = 0.7
    stub_llm: bool = False
    # For parallel: list of {url, model} dicts; overrides ollama_url/model if provided
    workers: list[dict] | None = None


@router.post("/start")
def start_encode(req: StartRequest) -> dict:
    job_id = manager.start(req.model_dump())
    return {"job_id": job_id, "status": "started"}


@router.post("/{job_id}/cancel")
def cancel_encode(job_id: str) -> dict:
    ok = manager.cancel(job_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Job not found or already finished")
    return {"job_id": job_id, "status": "cancelling"}


@router.get("/{job_id}/status")
def job_status(job_id: str) -> dict:
    status = manager.status(job_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return status


@router.get("")
def list_jobs() -> dict:
    return {"jobs": manager.list_all()}
