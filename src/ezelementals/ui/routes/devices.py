"""Device configuration CRUD routes."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from ezelementals.ui.config import load_devices, save_devices

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("")
def get_devices() -> dict:
    return load_devices()


@router.put("")
def put_devices(body: dict) -> dict:
    """Replace entire devices config."""
    save_devices(body)
    return body


@router.post("")
def add_device(device: dict) -> dict:
    """Append a single device; auto-assigns an id if missing."""
    data = load_devices()
    if "id" not in device or not device["id"]:
        device["id"] = str(uuid.uuid4())[:8]
    data["devices"].append(device)
    save_devices(data)
    return device


@router.put("/{device_id}")
def update_device(device_id: str, device: dict) -> dict:
    data = load_devices()
    for i, d in enumerate(data["devices"]):
        if d.get("id") == device_id:
            data["devices"][i] = {**d, **device, "id": device_id}
            save_devices(data)
            return data["devices"][i]
    raise HTTPException(status_code=404, detail=f"Device {device_id!r} not found")


@router.delete("/{device_id}")
def delete_device(device_id: str) -> dict:
    data = load_devices()
    before = len(data["devices"])
    data["devices"] = [d for d in data["devices"] if d.get("id") != device_id]
    if len(data["devices"]) == before:
        raise HTTPException(status_code=404, detail=f"Device {device_id!r} not found")
    save_devices(data)
    return {"deleted": device_id}
