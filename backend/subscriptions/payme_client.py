"""Payme Subscribe API (JSON-RPC 2.0).

Rasmiy endpointlar:
- test: https://checkout.test.paycom.uz/api
- live: https://checkout.paycom.uz/api  (PAYME_ALLOW_LIVE=true bo'lsa)

X-Auth: {kassa_id}:{kassa_paroli} — parol logga yozilmaydi.
Karta raqami / CVV qabul qilinmaydi va saqlanmaydi.
"""

from __future__ import annotations

import json
import logging
import re
import time
import urllib.error
import urllib.request
from decimal import Decimal, ROUND_HALF_UP
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

from django.conf import settings

logger = logging.getLogger(__name__)

SANDBOX_API_URL = "https://checkout.test.paycom.uz/api"
SANDBOX_CHECKOUT_BASE = "https://checkout.test.paycom.uz"
LIVE_API_URL = "https://checkout.paycom.uz/api"
LIVE_CHECKOUT_BASE = "https://checkout.paycom.uz"

_LIVE_HOSTS = frozenset(
    {
        "checkout.paycom.uz",
        "pay.paycom.uz",
        "checkout.payme.uz",
    }
)


class PaymeError(Exception):
    """Payme JSON-RPC yoki transport xatosi (maxfiy ma'lumotsiz)."""


class PaymeNotConfigured(PaymeError):
    """Sandbox kassa identifikatori yoki paroli yo'q."""


class PaymeSandboxOnly(PaymeError):
    """Jonli Payme hostiga so'rov taqiqlangan."""


def uzs_to_tiyin(amount: Decimal | int | str) -> int:
    """So'm → butun tiyin. Floating-point pul hisobi yo'q."""
    value = Decimal(str(amount)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    tiyin = int(value) * 100
    if tiyin < 0:
        raise ValueError("Summa manfiy bo'lishi mumkin emas.")
    return tiyin


def _is_live_payme_host(host: str) -> bool:
    h = (host or "").lower().strip()
    if h in _LIVE_HOSTS:
        return True
    if h.endswith(".paycom.uz") and "test" not in h.split(".")[0]:
        # checkout.paycom.uz — live; checkout.test.paycom.uz — sandbox
        return h == "checkout.paycom.uz" or h == "pay.paycom.uz"
    return False


def live_allowed() -> bool:
    return bool(getattr(settings, "PAYME_ALLOW_LIVE", False))


def _reject_live_url(url: str, *, kind: str) -> None:
    if live_allowed():
        return
    host = urlparse(url).netloc.lower()
    if _is_live_payme_host(host) or ("checkout.paycom.uz" in host and "test" not in host):
        raise PaymeSandboxOnly(
            f"Payme {kind} faqat sandbox. Jonli host ({host}) uchun PAYME_ALLOW_LIVE=true qo'ying."
        )


def payme_api_url() -> str:
    raw = (getattr(settings, "PAYME_API_URL", None) or "").strip()
    if not raw:
        raw = LIVE_API_URL if live_allowed() else SANDBOX_API_URL
    if not raw.startswith("https://"):
        raise PaymeSandboxOnly("Payme API faqat HTTPS URL bo'lishi kerak.")
    _reject_live_url(raw, kind="API")
    return raw.rstrip("/")


def payme_checkout_base() -> str:
    raw = (getattr(settings, "PAYME_CHECKOUT_BASE", None) or "").strip()
    if not raw:
        raw = LIVE_CHECKOUT_BASE if live_allowed() else SANDBOX_CHECKOUT_BASE
    if not raw.startswith("https://"):
        raise PaymeSandboxOnly("Payme Checkout faqat HTTPS URL bo'lishi kerak.")
    _reject_live_url(raw, kind="Checkout")
    return raw.rstrip("/")


def require_merchant_config() -> tuple[str, str]:
    merchant = (getattr(settings, "PAYME_MERCHANT_ID", None) or "").strip()
    secret = (getattr(settings, "PAYME_SECRET_KEY", None) or "").strip()
    missing = []
    if not merchant:
        missing.append("PAYME_MERCHANT_ID")
    if not secret:
        missing.append("PAYME_SECRET_KEY")
    if missing:
        raise PaymeNotConfigured(
            "Payme kassa sozlanmagan: "
            + ", ".join(missing)
            + ". Qiymatlarni Payme Business kabinetdan oling, o'ylab yozmang."
        )
    return merchant, secret


def _x_auth_header() -> str:
    merchant, secret = require_merchant_config()
    return f"{merchant}:{secret}"


def _redact(value: Any) -> Any:
    """Log/metadata uchun karta va maxfiy maydonlarni olib tashlash."""
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            lk = str(key).lower()
            if lk in {"card", "pan", "cvv", "cvc", "password", "secret", "token", "number"}:
                continue
            if lk in {"x-auth", "authorization"}:
                continue
            out[key] = _redact(item)
        return out
    if isinstance(value, list):
        return [_redact(item) for item in value]
    return value


def _rpc(method: str, params: dict[str, Any], *, timeout: int = 20) -> dict[str, Any]:
    url = payme_api_url()
    payload = {
        "jsonrpc": "2.0",
        "id": int(time.time() * 1000) % 2_147_000_000,
        "method": method,
        "params": params,
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Auth": _x_auth_header(),
        },
    )
    logger.info("payme sandbox rpc method=%s", method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        err_body = ""
        try:
            err_body = exc.read().decode("utf-8", errors="replace")[:400]
        except Exception:
            err_body = ""
        logger.warning("payme sandbox http_error method=%s status=%s", method, exc.code)
        raise PaymeError(f"Payme sandbox HTTP {exc.code}. {err_body}".strip()) from exc
    except urllib.error.URLError as exc:
        logger.warning("payme sandbox transport method=%s", method)
        raise PaymeError("Payme sandboxga ulanib bo'lmadi.") from exc

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise PaymeError("Payme javobi JSON emas.") from exc

    if not isinstance(data, dict):
        raise PaymeError("Payme javobi noto'g'ri.")
    error = data.get("error")
    if error:
        if isinstance(error, dict):
            code = error.get("code")
            message = str(error.get("message") or "Payme xatosi")[:200]
            raise PaymeError(f"Payme JSON-RPC {code}: {message}")
        raise PaymeError("Payme JSON-RPC xatosi.")
    result = data.get("result")
    if not isinstance(result, dict):
        raise PaymeError("Payme result bo'sh.")
    return result


def _extract_receipt(result: dict[str, Any]) -> dict[str, Any]:
    receipt = result.get("receipt")
    if isinstance(receipt, dict):
        return receipt
    if "_id" in result or "state" in result:
        return result
    raise PaymeError("Payme cheki topilmadi.")


def receipts_create(
    *,
    amount_tiyin: int,
    account: dict[str, Any],
    description: str = "",
    detail: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if int(amount_tiyin) <= 0 or int(amount_tiyin) % 1 != 0:
        raise PaymeError("amount tiyinda butun son bo'lishi kerak.")
    params: dict[str, Any] = {
        "amount": int(amount_tiyin),
        "account": account,
    }
    if description:
        params["description"] = description[:256]
    if detail:
        params["detail"] = detail
    result = _rpc("receipts.create", params)
    return _extract_receipt(result)


def receipts_get(*, receipt_id: str) -> dict[str, Any]:
    rid = (receipt_id or "").strip()
    if not rid:
        raise PaymeError("receipt id bo'sh.")
    result = _rpc("receipts.get", {"id": rid})
    return _extract_receipt(result)


def receipts_check(*, receipt_id: str) -> int:
    rid = (receipt_id or "").strip()
    if not rid:
        raise PaymeError("receipt id bo'sh.")
    result = _rpc("receipts.check", {"id": rid})
    state = result.get("state")
    try:
        return int(state)
    except (TypeError, ValueError) as exc:
        raise PaymeError("Payme receipts.check state noto'g'ri.") from exc


def receipts_cancel(*, receipt_id: str) -> dict[str, Any]:
    """To'langan chekni bekor qilish navbatiga qo'yish (sandbox)."""
    rid = (receipt_id or "").strip()
    if not rid:
        raise PaymeError("receipt id bo'sh.")
    result = _rpc("receipts.cancel", {"id": rid})
    receipt = result.get("receipt")
    if isinstance(receipt, dict):
        return receipt
    return result


def receipts_send(*, receipt_id: str, phone: str) -> bool:
    """Invoice SMS: receipts.send. Telefon logga yozilmaydi."""
    rid = (receipt_id or "").strip()
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if not rid:
        raise PaymeError("receipt id bo'sh.")
    if len(digits) < 12:
        raise PaymeError("Invoice uchun telefon noto'g'ri.")
    result = _rpc("receipts.send", {"id": rid, "phone": digits})
    return bool(result.get("success"))


def receipts_set_fiscal_data(*, receipt_id: str, fiscal_data: dict[str, Any]) -> bool:
    """OFD fiskal chekini Payme ga biriktirish. Ma'lumot o'ylab yozilmaydi."""
    rid = (receipt_id or "").strip()
    if not rid:
        raise PaymeError("receipt id bo'sh.")
    if not isinstance(fiscal_data, dict) or not fiscal_data.get("qr_code_url"):
        raise PaymeError("fiscal_data.qr_code_url majburiy.")
    result = _rpc("receipts.set_fiscal_data", {"id": rid, "fiscal_data": fiscal_data})
    return bool(result.get("success"))


def _return_url_is_payme_status(ret: str) -> bool:
    """Qaytish havolasi faqat o'z to'lov holati sahifamiz bo'lishi mumkin."""
    parsed = urlparse((ret or "").strip())
    if parsed.scheme not in ("https", "http") or not parsed.hostname or "@" in (parsed.netloc or ""):
        return False
    if any(ch in ret for ch in "\r\n\t "):
        return False
    host = parsed.hostname.lower()
    if parsed.scheme != "https":
        if not (getattr(settings, "DEBUG", False) and host in ("localhost", "127.0.0.1")):
            return False
    if parsed.path.rstrip("/") != "/subscriptions/payme":
        return False
    order = (parse_qs(parsed.query).get("order_id") or [""])[0]
    return bool(order.startswith("sub-") and not any(ch in order for ch in " /?#&"))


def build_checkout_url(*, receipt_id: str, return_url: str = "") -> str:
    """Chek sahifasi: {checkout_base}/{receipt_id}.

    Payme `c` / `callback` — to'lov yoki bekor qilgandan keyin mijozni
    shu sahifaga qaytaradi. `ct` — muvaffaqiyatdan keyin kutish (ms).
    Chek identifikatori yo'lda qoladi, summa o'zgarmaydi.
    Boshqa manzil qaytish parametriga yozilmaydi.
    """
    rid = (receipt_id or "").strip()
    if not re.fullmatch(r"[A-Za-z0-9]{8,64}", rid):
        raise PaymeError("receipt id noto'g'ri.")
    base = f"{payme_checkout_base()}/{rid}"
    ret = (return_url or "").strip()
    if not _return_url_is_payme_status(ret):
        return base
    query = urlencode({"c": ret, "callback": ret, "ct": "1500"})
    return f"{base}?{query}"


def fiscal_detail(*, title: str, price_tiyin: int) -> dict[str, Any] | None:
    code = (getattr(settings, "PAYME_IKPU_CODE", None) or "").strip()
    package = (getattr(settings, "PAYME_PACKAGE_CODE", None) or "").strip()
    vat_raw = (getattr(settings, "PAYME_VAT_PERCENT", None) or "").strip()
    if not code or not package or not vat_raw:
        return None
    try:
        vat = int(vat_raw)
    except ValueError:
        return None
    return {
        "receipt_type": 0,
        "items": [
            {
                "title": title[:64],
                "price": int(price_tiyin),
                "count": 1,
                "code": code,
                "package_code": package,
                "vat_percent": vat,
            }
        ],
    }
