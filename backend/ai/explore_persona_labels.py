"""Explore personaj ko'rinish nomlari — dev panel orqali o'zgartirish."""

from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings

from ai.explore_personas import EXPLORE_PERSONAS, normalize_persona_id
from ai.services.gemini_style import AiStyleError

LABELS_NAME = "explore_persona_labels.json"


def _labels_path() -> Path:
    return Path(settings.MEDIA_ROOT) / LABELS_NAME


def load_persona_labels() -> dict[str, str]:
    path = _labels_path()
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    if not isinstance(data, dict):
        return {}
    out: dict[str, str] = {}
    for key, value in data.items():
        pid = normalize_persona_id(str(key))
        label = str(value).strip()
        if pid and label:
            out[pid] = label
    return out


def save_persona_labels(data: dict[str, str]) -> None:
    path = _labels_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def persona_display_label(persona_id: str | None) -> str:
    pid = normalize_persona_id(persona_id)
    if not pid:
        return ""
    custom = load_persona_labels().get(pid)
    if custom:
        return custom
    return EXPLORE_PERSONAS[pid]["label"]


def set_persona_display_label(*, persona_id: str, label: str) -> dict[str, str]:
    pid = normalize_persona_id(persona_id)
    if not pid:
        raise AiStyleError("Noto'g'ri persona_id.", 400)
    cleaned = label.strip()
    if not cleaned or len(cleaned) > 40:
        raise AiStyleError("Nom 1–40 belgi bo'lishi kerak.", 400)
    data = load_persona_labels()
    data[pid] = cleaned
    save_persona_labels(data)
    return {"persona_id": pid, "label": cleaned}
