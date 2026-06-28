"""Mustaqil usta ish sharoiti va to'lov usullari."""

from __future__ import annotations

WORK_LOCATION_CHOICES = (
    ("studio", {"uz": "Studiya / xona", "ru": "Студия", "en": "Studio"}),
    ("home", {"uz": "Uyda", "ru": "На дому", "en": "At home"}),
    ("mobile", {"uz": "Mijozga boraman", "ru": "Выезд к клиенту", "en": "Mobile / home visits"}),
)

PAYMENT_METHOD_CHOICES = (
    ("cash", {"uz": "Naqd", "ru": "Наличные", "en": "Cash"}),
    ("card", {"uz": "Bank kartasi", "ru": "Карта", "en": "Card"}),
    ("payme", {"uz": "Payme", "ru": "Payme", "en": "Payme"}),
    ("click", {"uz": "Click", "ru": "Click", "en": "Click"}),
    ("uzum", {"uz": "Uzum Bank", "ru": "Uzum Bank", "en": "Uzum Bank"}),
)

ALLOWED_WORK_LOCATIONS = frozenset(c[0] for c in WORK_LOCATION_CHOICES)
ALLOWED_PAYMENT_METHODS = frozenset(c[0] for c in PAYMENT_METHOD_CHOICES)


def serialize_work_location(code: str | None, lang: str = "uz") -> dict | None:
    if not code:
        return None
    labels = next((labels for c, labels in WORK_LOCATION_CHOICES if c == code), None)
    if labels is None:
        return None
    return {"code": code, "label": labels.get(lang) or labels.get("uz") or code}


def serialize_payment_methods(codes: list | None, lang: str = "uz") -> list[dict]:
    if not codes:
        return []
    out = []
    label_map = {c: labels for c, labels in PAYMENT_METHOD_CHOICES}
    for raw in codes:
        code = str(raw).strip().lower()
        if code not in ALLOWED_PAYMENT_METHODS:
            continue
        labels = label_map.get(code, {})
        out.append({"code": code, "label": labels.get(lang) or labels.get("uz") or code})
    return out
