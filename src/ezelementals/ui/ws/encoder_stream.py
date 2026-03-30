"""
WebSocket endpoint for live encoder progress.

Clients connect to  ws://<host>/ws/encoder/<job_id>
and receive a stream of JSON messages (see plan for message schema).

The client can send {"type": "cancel"} to abort the job.
"""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ezelementals.ui.routes.encoder import manager

log = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/encoder/{job_id}")
async def encoder_ws(websocket: WebSocket, job_id: str) -> None:
    await websocket.accept()

    job = manager.get_job(job_id)
    if job is None:
        await websocket.send_text(json.dumps({"type": "error", "message": f"Job {job_id!r} not found"}))
        await websocket.close()
        return

    queue = job.subscribe()
    try:
        # If job already finished before we connected, drain any queued events
        # then send current status
        async def _send_loop() -> None:
            while True:
                event = await queue.get()
                try:
                    await websocket.send_text(json.dumps(event))
                except Exception:
                    break
                if event.get("type") in ("done", "cancelled", "error"):
                    break

        async def _recv_loop() -> None:
            try:
                while True:
                    text = await websocket.receive_text()
                    msg = json.loads(text)
                    if msg.get("type") == "cancel":
                        manager.cancel(job_id)
                        break
            except (WebSocketDisconnect, Exception):
                pass

        await asyncio.gather(_send_loop(), _recv_loop())
    except WebSocketDisconnect:
        pass
    finally:
        job.unsubscribe(queue)
        try:
            await websocket.close()
        except Exception:
            pass
