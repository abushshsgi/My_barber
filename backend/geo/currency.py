"""Valyuta kurslari — bazaviy UZS, O'zbekiston Markaziy banki (cbu.uz) rasmiy API."""

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
CBU_RATES_URL = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/"
RATES_MAX_AGE = timedelta(hours=24)
CBU_META_DATE_KEY = "_cbu_date"

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

FALLBACK_UZS_PER_UNIT: dict[str, Decimal] = {
    "UZS": Decimal("1"),
    "USD": Decimal("12085.56"),
    "EUR": Decimal("13870.60"),
    "RUB": Decimal("164.52"),
    "KZT": Decimal("24.76"),
    "KGS": Decimal("138.16"),
    "TJS": Decimal("1302.32"),
    "TRY": Decimal("260.21"),
    "CNY": Decimal("1785.74"),
    "AED": Decimal("3290.65"),
}


def _quantize_rate(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP))


def _rates_to_json(rates: dict[str, Decimal], *, rate_date: str = "") -> dict[str, str]:
    payload = {code: _quantize_rate(amount) for code, amount in rates.items()}
    if rate_date:
        payload[CBU_META_DATE_KEY] = rate_date
    return payload


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


def get_rate_date_from_snapshot(raw: dict[str, Any]) -> str | None:
    value = raw.get(CBU_META_DATE_KEY)
    return str(value) if value else None


def _http_get_json(url: str) -> Any:
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "MySaloon/1.0"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_from_cbu() -> tuple[dict[str, Decimal], str, str]:
    """
    O'zbekiston Markaziy banki rasmiy kurslari.
    https://cbu.uz/uz/arkhiv-kursov-valyut/json/
    Ish kunlarida kuniga yangilanadi.
    """
    payload = _http_get_json(CBU_RATES_URL)
    if not isinstance(payload, list) or not payload:
        raise ValueError("CBU returned empty payload")

    by_code = {str(row.get("Ccy", "")).upper(): row for row in payload if row.get("Ccy")}
    computed: dict[str, Decimal] = {"UZS": Decimal("1")}
    rate_date = str((payload[0] or {}).get("Date") or "")

    for code in SUPPORTED_CURRENCIES:
        if code == "UZS":
            continue
        row = by_code.get(code)
        if not row:
            computed[code] = FALLBACK_UZS_PER_UNIT[code]
            continue
        nominal = Decimal(str(row.get("Nominal") or "1"))
        rate = Decimal(str(row.get("Rate") or "0"))
        if nominal <= 0 or rate <= 0:
            computed[code] = FALLBACK_UZS_PER_UNIT[code]
            continue
        computed[code] = (rate / nominal).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)

    return computed, "cbu.uz", rate_date


def fetch_live_uzs_per_unit() -> tuple[dict[str, Decimal], str, str]:
    try:
        return fetch_from_cbu()
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
        logger.warning("CBU exchange rate API failed: %s", exc)

    cached = _load_last_cbu_snapshot()
    if cached is not None:
        return cached

    logger.warning("No CBU cache available, using static fallback rates")
    return dict(FALLBACK_UZS_PER_UNIT), "fallback", ""


def _load_last_cbu_snapshot() -> tuple[dict[str, Decimal], str, str] | None:
    from geo.models import ExchangeRateSnapshot

    last_cbu = (
        ExchangeRateSnapshot.objects.filter(source="cbu.uz")
        .order_by("-fetched_at")
        .first()
    )
    if last_cbu is None:
        return None

    rates = _parse_rates_json(last_cbu.rates)
    if len(rates) <= 1:
        return None

    rate_date = get_rate_date_from_snapshot(last_cbu.rates) or ""
    return rates, "cbu.uz (cached)", rate_date


def sync_exchange_rates(*, force: bool = False) -> ExchangeRateSnapshot:
    from geo.models import ExchangeRateSnapshot

    latest = ExchangeRateSnapshot.objects.order_by("-fetched_at").first()
    if (
        not force
        and latest is not None
        and timezone.now() - latest.fetched_at < RATES_MAX_AGE
    ):
        return latest

    rates, source, rate_date = fetch_live_uzs_per_unit()
    return ExchangeRateSnapshot.objects.create(
        base_currency=BASE_CURRENCY,
        rates=_rates_to_json(rates, rate_date=rate_date),
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


def build_currency_rates_payload() -> dict[str, Any]:
    """API javobi — DB xatoligida ham 200 qaytarish uchun."""
    try:
        snapshot = get_latest_exchange_rates(auto_sync=True)
        rates = _parse_rates_json(snapshot.rates)
        rate_date = get_rate_date_from_snapshot(snapshot.rates)
        source = snapshot.source
        updated_at = snapshot.fetched_at.isoformat()
    except Exception as exc:
        logger.warning("Currency snapshot unavailable, using live/static fallback: %s", exc)
        rates, source, rate_date = fetch_live_uzs_per_unit()
        updated_at = timezone.now().isoformat()

    return {
        "base": BASE_CURRENCY,
        "updated_at": updated_at,
        "rate_date": rate_date or None,
        "source": source,
        "currencies": [
            {
                "code": code,
                "label": CURRENCY_LABELS.get(code, code),
                "symbol": CURRENCY_SYMBOLS.get(code, code),
                "uzs_per_unit": str(rates.get(code, FALLBACK_UZS_PER_UNIT.get(code, Decimal("1")))),
            }
            for code in SUPPORTED_CURRENCIES
        ],
    }
