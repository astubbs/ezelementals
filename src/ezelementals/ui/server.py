"""
ezElementals UI server.

Entry point: `uv run ezelementals-ui`   (or  python -m ezelementals.ui.server)

Serves:
  /api/*        — REST endpoints
  /ws/encoder/* — WebSocket live encode stream
  /*            — React SPA (static build from ui/dist/)
"""

from __future__ import annotations

import importlib.resources
import logging
import os
import webbrowser
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from ezelementals.ui.config import is_first_run
from ezelementals.ui.routes import devices, editor, encoder, library, player, settings
from ezelementals.ui.ws.encoder_stream import router as ws_router

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(title="ezElementals", version="0.1.0")

# Allow Vite dev server (port 5173) during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers
app.include_router(library.router)
app.include_router(encoder.router)
app.include_router(editor.router)
app.include_router(player.router)
app.include_router(devices.router)
app.include_router(settings.router)

# WebSocket
app.include_router(ws_router)


# ---------------------------------------------------------------------------
# Static SPA serving
# ---------------------------------------------------------------------------

# The built React app lives at  src/ezelementals/ui/static/
_STATIC_DIR = Path(__file__).parent / "static"


@app.get("/api/first-run")
def first_run_status() -> dict:
    return {"first_run": is_first_run()}


if _STATIC_DIR.exists():
    # Serve assets under /assets (Vite output)
    _assets = _STATIC_DIR / "assets"
    if _assets.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets)), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str) -> FileResponse:
        """Serve index.html for all non-API routes (React Router)."""
        return FileResponse(str(_STATIC_DIR / "index.html"))

else:
    @app.get("/")
    async def dev_notice() -> dict:
        return {
            "message": "Frontend not built. Run `npm run build` inside ui/ then restart.",
            "docs": "/docs",
        }


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def run_ui(host: str = "0.0.0.0", port: int = 8765, open_browser: bool = True) -> None:
    """Entry point called by `ezelementals-ui` console script."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")

    if open_browser:
        import threading

        def _open() -> None:
            import time
            time.sleep(1.2)
            webbrowser.open(f"http://localhost:{port}")

        threading.Thread(target=_open, daemon=True).start()

    uvicorn.run(
        "ezelementals.ui.server:app",
        host=host,
        port=port,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    run_ui()
