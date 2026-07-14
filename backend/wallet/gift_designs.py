"""Sovg'a karta dizayn katalogi — narx faqat shu yerda (server haqiqati)."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass(frozen=True, slots=True)
class GiftDesign:
    id: str
    name: str
    name_uz: str
    fee: Decimal
    preview: dict[str, str]
    sort_order: int = 0


# fee: 5_000 … 1_000_000 — client yuborgan narxga ishonilmaydi.
GIFT_DESIGNS: tuple[GiftDesign, ...] = (
    GiftDesign(
        id="classic",
        name="Classic",
        name_uz="Klassik",
        fee=Decimal("5000"),
        preview={
            "from": "oklch(0.18 0 0)",
            "to": "oklch(0.32 0 0)",
            "accent": "oklch(0.97 0.01 85)",
            "pattern": "none",
        },
        sort_order=10,
    ),
    GiftDesign(
        id="soft",
        name="Soft Cream",
        name_uz="Yumshoq krem",
        fee=Decimal("10000"),
        preview={
            "from": "oklch(0.92 0.03 85)",
            "to": "oklch(0.78 0.05 70)",
            "accent": "oklch(0.2 0 0)",
            "pattern": "dots",
        },
        sort_order=20,
    ),
    GiftDesign(
        id="midnight",
        name="Midnight",
        name_uz="Tun",
        fee=Decimal("25000"),
        preview={
            "from": "oklch(0.22 0.04 260)",
            "to": "oklch(0.12 0.03 280)",
            "accent": "oklch(0.92 0.02 85)",
            "pattern": "lines",
        },
        sort_order=30,
    ),
    GiftDesign(
        id="bloom",
        name="Bloom",
        name_uz="Gul",
        fee=Decimal("50000"),
        preview={
            "from": "oklch(0.55 0.14 20)",
            "to": "oklch(0.35 0.12 350)",
            "accent": "oklch(0.98 0.01 85)",
            "pattern": "bloom",
        },
        sort_order=40,
    ),
    GiftDesign(
        id="forest",
        name="Forest",
        name_uz="O'rmon",
        fee=Decimal("100000"),
        preview={
            "from": "oklch(0.42 0.08 145)",
            "to": "oklch(0.22 0.05 160)",
            "accent": "oklch(0.95 0.02 95)",
            "pattern": "leaf",
        },
        sort_order=50,
    ),
    GiftDesign(
        id="prestige",
        name="Prestige",
        name_uz="Nufuz",
        fee=Decimal("250000"),
        preview={
            "from": "oklch(0.28 0.02 85)",
            "to": "oklch(0.16 0.01 80)",
            "accent": "oklch(0.86 0.08 85)",
            "pattern": "foil",
        },
        sort_order=60,
    ),
    GiftDesign(
        id="royal",
        name="Royal",
        name_uz="Qirollik",
        fee=Decimal("500000"),
        preview={
            "from": "oklch(0.35 0.1 300)",
            "to": "oklch(0.18 0.06 280)",
            "accent": "oklch(0.9 0.06 95)",
            "pattern": "crest",
        },
        sort_order=70,
    ),
    GiftDesign(
        id="legend",
        name="Legend",
        name_uz="Afsona",
        fee=Decimal("1000000"),
        preview={
            "from": "oklch(0.14 0 0)",
            "to": "oklch(0.08 0.02 40)",
            "accent": "oklch(0.88 0.1 75)",
            "pattern": "legend",
        },
        sort_order=80,
    ),
)

_BY_ID: dict[str, GiftDesign] = {d.id: d for d in GIFT_DESIGNS}

MIN_DESIGN_FEE = Decimal("5000")
MAX_DESIGN_FEE = Decimal("1000000")


def get_gift_design(design_id: str) -> GiftDesign | None:
    return _BY_ID.get((design_id or "").strip().lower())


def list_gift_designs() -> list[GiftDesign]:
    return sorted(GIFT_DESIGNS, key=lambda d: d.sort_order)


def gift_design_to_dict(design: GiftDesign) -> dict[str, Any]:
    return {
        "id": design.id,
        "name": design.name,
        "name_uz": design.name_uz,
        "fee": str(design.fee.quantize(Decimal("1"))),
        "preview": design.preview,
    }
