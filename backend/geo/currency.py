"""Valyuta kurslari — bazaviy UZS, open.er-api.com (ECB ma'lumotlari) orqali."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import TYPE_CHECKING, Any

from django.utils import timezone

if TYPE_CHECKING:
    from geo.models import ExchangeRateSnapshot

logger = logging.getLogger(__name__)

BASE_CURRENCY = "UZS"
RATES_API_URL = "https://open.er-api.com/v6/latest/USD"
RATES_MAX_AGE = timedelta(hours=24)

SUPPORTED_CURRENCIES: tuple[str, ...] = (
    "UZS",
    "USD",
    "EUR",
    "RUB",
    "KZT",
    "KGS",
    "TJS",
    "TRY",
    "CNY",
    "AED",
)

CURRENCY_LABELS: dict[str, str] = {
    "UZS": "O'zbek so'mi",
    "USD": "AQSH dollari",
    "EUR": "Yevro",
    "RUB": "Rossiya rubli",
    "KZT": "Qozog'iston tengesi",
    "KGS": "Qirg'iz somi",
    "TJS": "Tojik somonisi",
    "TRY": "Turk lirasi",
    "CNY": "Xitoy yuani",
    "AED": "BAA dirhami",
}

CURRENCY_SYMBOLS: dict[str, str] = {
    "UZS": "so'm",
    "USD": "$",
    "EUR": "€",
    "RUB": "₽",
    "KZT": "₸",
    "KGS": "с",
    "TJS": "SM",
    "TRY": "₺",
    "CNY": "¥",
    "AED": "د.إ",
}

# API ishlamasa — taxminiy kurslar (1 birlik = N so'm)
FALLBACK_UZS_PER_UNIT: dict[str, Decimal] = {
    "UZS": Decimal("1"),
    "USD": Decimal("12650"),
    "EUR": Decimal("13750"),
    "RUB": Decimal("140"),
    "KZT": Decimal("25"),
    "KGS": Decimal("145"),
    "TJS": Decimal("1150"),
    "TRY": Decimal("365"),
    "CNY": Decimal("1750"),
    "AED": Decimal("3440"),
}


def _quantize_rate(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP))


def _rates_to_json(rates: dict[str, Decimal]) -> dict[str, str]:
    return {code: _quantize_rate(amount) for code, amount in rates.items()}


def _parse_rates_json(raw: dict[str, Any]) -> dict[str, Decimal]:
    out: dict[str, Decimal] = {}
    for code in SUPPORTED_CURRENCIES:
        val = raw.get(code)
        if val is None:
            continue
        out[code] = Decimal(str(val))
    if "UZS" not in out:
        out["UZS"] = Decimal("1")
    return out


def fetch_live_uzs_per_unit() -> tuple[dict[str, Decimal], str]:
    """
    open.er-api.com — bepul, API kalitsiz.
    Manba: ECB va boshqa markaziy banklar agregati; kuniga bir necha marta yangilanadi.
    """
    req = urllib.request.Request(
        RATES_API_URL,
        headers={"Accept": "application/json", "User-Agent": "MySaloon/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError) as exc:
        logger.warning("Exchange rate API failed: %s", exc)
        return dict(FALLBACK_UZS_PER_UNIT), "fallback"

    if payload.get("result") != "success":
        return dict(FALLBACK_UZS_PER_UNIT), "fallback"

    api_rates = payload.get("rates") or {}
    uzs_per_usd = api_rates.get("UZS")
    if not uzs_per_usd:
        return dict(FALLBACK_UZS_PER_UNIT), "fallback"

    uzs_per_usd_dec = Decimal(str(uzs_per_usd))
    computed: dict[str, Decimal] = {"UZS": Decimal("1")}

    for code in SUPPORTED_CURRENCIES:
        if code == "UZS":
            continue
        foreign_per_usd = api_rates.get(code)
        if not foreign_per_usd:
            computed[code] = FALLBACK_UZS_PER_UNIT[code]
            continue
        # 1 USD = uzs_per_usd UZS va 1 USD = foreign_per_usd CODE
        # => 1 CODE = uzs_per_usd / foreign_per_usd UZS
        computed[code] = (uzs_per_usd_dec / Decimal(str(foreign_per_usd))).quantize(
            Decimal("0.0001"), rounding=ROUND_HALF_UP
        )

    return computed, "open.er-api.com"


def sync_exchange_rates(*, force: bool = False) -> ExchangeRateSnapshot:
    from geo.models import ExchangeRateSnapshot

    latest = ExchangeRateSnapshot.objects.order_by("-fetched_at").first()
    if (
        not force
        and latest is not None
        and timezone.now() - latest.fetched_at < RATES_MAX_AGE
    ):
        return latest

    rates, source = fetch_live_uzs_per_unit()
    return ExchangeRateSnapshot.objects.create(
        base_currency=BASE_CURRENCY,
        rates=_rates_to_json(rates),
        source=source,
        fetched_at=timezone.now(),
    )


def get_latest_exchange_rates(*, auto_sync: bool = True) -> ExchangeRateSnapshot:
    from geo.models import ExchangeRateSnapshot

    latest = ExchangeRateSnapshot.objects.order_by("-fetched_at").first()
    if latest is None:
        return sync_exchange_rates(force=True)
    if auto_sync and timezone.now() - latest.fetched_at >= RATES_MAX_AGE:
        return sync_exchange_rates(force=False)
    return latest


def convert_uzs(amount_uzs: Decimal | float | int, target: str, rates: dict[str, Decimal]) -> Decimal:
    code = (target or BASE_CURRENCY).upper()
    if code == BASE_CURRENCY:
        return Decimal(str(amount_uzs)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    uzs_per_unit = rates.get(code)
    if not uzs_per_unit or uzs_per_unit <= 0:
        uzs_per_unit = FALLBACK_UZS_PER_UNIT.get(code, Decimal("1"))
    return (Decimal(str(amount_uzs)) / uzs_per_unit).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
