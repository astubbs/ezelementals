"""Shared helpers for loading .3fx track files from studio routes.

The editor and player routes both need to read a `.3fx` file (newline
-delimited JSON) into a sorted list of entries. Previously each
route module had its own `_read_fx` / `_load_fx` function with
identical bodies — flagged as an 11-line clone by PMD CPD (see the
duplicate-code report on PR #9). Consolidated here.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_fx(path: Path) -> list[dict[str, Any]]:
    """Read a `.3fx` file into a list of entries sorted by `t`.

    Each line in a `.3fx` file is a JSON object with a `t` (timestamp)
    key plus per-channel intensity fields. Blank lines are skipped.
    """
    entries: list[dict[str, Any]] = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return sorted(entries, key=lambda e: e["t"])
