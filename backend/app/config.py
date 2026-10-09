"""Minimal .env loader (no external dependency).

Environment variables already set in the shell always win. Looks for a `.env`
next to this package, in `backend/`, in the repo root, or in the CWD. Set
`ENV_FILE` to point at a specific file.
"""
from __future__ import annotations

import os


def _candidates() -> list[str]:
    here = os.path.dirname(os.path.abspath(__file__))
    cwd = os.getcwd()
    return [
        os.environ.get("ENV_FILE", ""),
        os.path.join(here, ".env"),
        os.path.join(here, "..", ".env"),
        os.path.join(here, "..", "..", ".env"),
        os.path.join(cwd, ".env"),
    ]


def load_dotenv() -> str | None:
    for path in _candidates():
        if not path or not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8-sig") as handle:
            for raw in handle:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
        return path
    return None


load_dotenv()
