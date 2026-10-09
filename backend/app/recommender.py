"""LLM-backed recommendation generator for customer segments.

Providers (selected by ``RECOMMENDER_PROVIDER`` or auto-detected):
    opencode  calls a running ``opencode serve`` instance (default)
    deepseek  calls the DeepSeek API directly (needs DEEPSEEK_API_KEY)
    off       disable AI, keep rule-based defaults

Environment:
    RECOMMENDER_PROVIDER   auto | opencode | deepseek | off   (default auto)
    OPENCODE_SERVER_URL    default http://127.0.0.1:4096
    OPENCODE_MODEL         default opencode-go/deepseek-v4.1-flash
    OPENCODE_SERVER_PASSWORD / OPENCODE_SERVER_USERNAME  optional basic auth
    DEEPSEEK_API_KEY       only needed for the deepseek provider
    DEEPSEEK_MODEL         default deepseek-chat
    DEEPSEEK_BASE_URL      default https://api.deepseek.com

When the chosen provider is unavailable or errors, callers keep the rule-based
default recommendations, so the dashboard always renders.
"""
from __future__ import annotations

import base64
import json
import os
import urllib.request

DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"
OPENCODE_SERVER_URL = "http://127.0.0.1:4096"
OPENCODE_MODEL = "opencode-go/deepseek-v4.1-flash"

_SYSTEM = (
    "You are a growth and CRM strategist for a Singapore car-ownership super-app: "
    "vehicle valuations, insurance quotes, COE and road-tax reminders, fines, "
    "mPoints rewards, Sentiance driving insights and workshop servicing. "
    "For each customer segment, write ONE precise, actionable recommendation of at "
    "most 30 words that names a specific offer, channel and timing. Respond with "
    "ONLY a JSON object mapping each segment key to its recommendation string."
)

_CACHE: dict[tuple, dict[str, str]] = {}


def _env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


def _api_key() -> str | None:
    key = _env("DEEPSEEK_API_KEY")
    return key or None


def provider() -> str:
    choice = _env("RECOMMENDER_PROVIDER", "auto").lower()
    if choice in ("opencode", "deepseek", "off"):
        return choice
    if _env("OPENCODE_SERVER_URL") or _env("OPENCODE_MODEL"):
        return "opencode"
    if _api_key():
        return "deepseek"
    return "opencode"


def available() -> bool:
    current = provider()
    if current == "off":
        return False
    if current == "deepseek":
        return _api_key() is not None
    return True


def _signature(payload: dict) -> tuple:
    return (
        provider(),
        payload.get("total"),
        tuple((s.get("key"), s.get("count")) for s in payload.get("segments", [])),
    )


def _prompt(payload: dict) -> str:
    lines = [f"Customers in scope: {payload.get('total', 0)}"]
    for s in payload.get("segments", []):
        lines.append(
            f"- key={s.get('key')} | {s.get('label')} | rule: {s.get('criteria')} | "
            f"{s.get('count')} customers ({s.get('pct')}%) | {s.get('detail', '')}"
        )
    return "\n".join(lines)


def _request(method: str, url: str, body: dict | None, timeout: float = 90) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    password = _env("OPENCODE_SERVER_PASSWORD")
    if password and "OPENCODE_SERVER_URL" in url.upper():  # basic auth for opencode
        user = _env("OPENCODE_SERVER_USERNAME", "opencode")
        token = base64.b64encode(f"{user}:{password}".encode("utf-8")).decode("ascii")
        request.add_header("Authorization", f"Basic {token}")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8")
    return json.loads(raw) if raw else {}


def _parse_json(text: str) -> dict | None:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`").strip()
        if text[:4].lower() == "json":
            text = text[4:]
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        parsed = json.loads(text[start : end + 1])
    except Exception:
        return None
    return parsed if isinstance(parsed, dict) else None


def _deepseek(system: str, user: str) -> str | None:
    key = _api_key()
    if not key:
        return None
    base = _env("DEEPSEEK_BASE_URL", DEEPSEEK_BASE_URL).rstrip("/")
    body = {
        "model": _env("DEEPSEEK_MODEL", DEEPSEEK_MODEL),
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.4,
        "response_format": {"type": "json_object"},
    }
    request = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            data = json.loads(response.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"]
    except Exception:
        return None


def _opencode(system: str, user: str) -> str | None:
    base = _env("OPENCODE_SERVER_URL", OPENCODE_SERVER_URL).rstrip("/")
    model_ref = _env("OPENCODE_MODEL", OPENCODE_MODEL)
    provider_id, _, model_id = model_ref.partition("/")
    if not model_id:
        provider_id, model_id = "opencode-go", model_ref
    session_id = ""
    try:
        session = _request("POST", f"{base}/session", {"title": "segment-recommendations"}, timeout=20)
        session_id = session.get("id", "")
        if not session_id:
            return None
        result = _request(
            "POST",
            f"{base}/session/{session_id}/message",
            {
                "model": {"providerID": provider_id, "modelID": model_id},
                "system": system,
                "parts": [{"type": "text", "text": user}],
            },
        )
        texts = [p.get("text", "") for p in result.get("parts", []) if p.get("type") == "text"]
        return "\n".join(t for t in texts if t) or None
    except Exception:
        return None
    finally:
        if session_id:
            try:
                _request("DELETE", f"{base}/session/{session_id}", None, timeout=15)
            except Exception:
                pass


def generate(payload: dict) -> dict[str, str] | None:
    current = provider()
    if current == "off":
        return None

    signature = _signature(payload)
    if signature in _CACHE:
        return _CACHE[signature]

    prompt = _prompt(payload)
    content = _deepseek(_SYSTEM, prompt) if current == "deepseek" else _opencode(_SYSTEM, prompt)
    parsed = _parse_json(content) if content else None
    if not parsed:
        return None

    valid_keys = {s.get("key") for s in payload.get("segments", [])}
    recs = {
        str(k): str(v).strip()
        for k, v in parsed.items()
        if k in valid_keys and str(v).strip()
    }
    if not recs:
        return None
    _CACHE[signature] = recs
    return recs


def apply(payload: dict) -> dict:
    current = provider()
    recs = generate(payload)
    source = current if recs else "default"
    for segment in payload.get("segments", []):
        if recs and segment.get("key") in recs:
            segment["recommendation"] = recs[segment["key"]]
            segment["recommendation_source"] = source
        else:
            segment["recommendation_source"] = "default"
    payload["recommendation_source"] = source
    return payload
