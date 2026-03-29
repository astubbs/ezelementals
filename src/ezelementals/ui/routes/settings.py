"""Settings CRUD routes."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ezelementals.ui.config import load_settings, save_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def get_settings() -> dict:
    return load_settings()


@router.put("")
def put_settings(body: dict) -> dict:
    save_settings(body)
    return body
