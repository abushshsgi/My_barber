"""AI Premium obuna — Payme sandbox Checkout. Hamyon oqimidan alohida."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from decimal import Decimal
from urllib.parse import urlencode, urlparse

from django.core.cache import cache
from django.db import transaction

logger = logging.getLogger(__name__)
from django.utils import timezone

from accounts.models import User
from subscriptions.models import SubscriptionEvent, SubscriptionPayment, UserSubscription
from subscriptions.payme_client import (
    PaymeError,
    build_checkout_url,
    fiscal_detail,
    receipts_cancel,
    receipts_check,
    receipts_create,
    receipts_get,
    receipts_send,
    receipts_set_fiscal_data,
    require_merchant_config,
    uzs_to_tiyin,
)
from subscriptions.plans import get_plan
from subscriptions.promos import resolve_checkout_price
from subscriptions.services import activate_subscription, log_event, serialize_subscription

# Subscribe API chek holatlari (Payme receipts.check namunasi: to'langan = 4).
PAYME_STATE_PENDING = 0
PAYME_STATE_PAID = 4
PAYME_STATE_CANCELLED = -1
PAYME_STATE_REFUNDED = -2

__all__ = [
    "PaymePaymentError",
    "receipts_create",
    "receipts_get",
    "receipts_check",
    "receipts_cancel",
    "receipts_send",
    "receipts_set_fiscal_data",
    "serialize_payme_payment",
    "start_payme_checkout",
    "sync_payme_payment",
]


class PaymePaymentError(PaymeError):
    """Biznes qoidasi: summa, holat yoki takroriy aktivatsiya."""


def _attach_attempt_keys(payment: SubscriptionPayment, request) -> None:
    try:
        from analytics.hooks import visitor_keys_from_request

        visitor_key, session_key = visitor_keys_from_request(request)
    except Exception:
        logger.exception("analytics visitor keys failed")
        return
    fields = []
    if visitor_key and not payment.visitor_key:
        payment.visitor_key = visitor_key
        fields.append("visitor_key")
    if session_key and not payment.session_key:
        payment.session_key = session_key
        fields.append("session_key")
    if fields:
        payment.save(update_fields=fields + ["updated_at"])


def _note_transition(payment: SubscriptionPayment, previous_status: str, new_status: str) -> None:
    try:
        from analytics.hooks import note_payment_transition

        note_payment_transition(payment, previous_status, new_status)
    except Exception:
        logger.exception("analytics payment hook failed")


def _account_order_id(receipt: dict) -> str:
    account = receipt.get("account")
    if isinstance(account, list):
        for row in account:
            if isinstance(row, dict) and str(row.get("name") or "") == "order_id":
                return str(row.get("value") or "").strip()
        return ""
    if isinstance(account, dict):
        return str(account.get("order_id") or "").strip()
    return ""


def _map_status(state: int | None) -> str:
    if state is None:
        return SubscriptionPayment.Status.PENDING
    if state == PAYME_STATE_PAID:
        return SubscriptionPayment.Status.PAID
    if state == PAYME_STATE_CANCELLED:
        return SubscriptionPayment.Status.CANCELLED
    if state == PAYME_STATE_REFUNDED:
        return SubscriptionPayment.Status.REFUNDED
    if state == PAYME_STATE_PENDING:
        return SubscriptionPayment.Status.PENDING
    if state in (1, 20, 21):
        return SubscriptionPayment.Status.EXPIRED
    return SubscriptionPayment.Status.FAILED


def _epoch_ms_iso(value) -> str | None:
    try:
        ms = int(value)
    except (TypeError, ValueError):
        return None
    if ms <= 0:
        return None
    return datetime.fromtimestamp(ms / 1000, tz=timezone.get_current_timezone()).isoformat()


def _masked_card(receipt: dict) -> str:
    card = receipt.get("card")
    if not isinstance(card, dict):
        return ""
    number = str(card.get("number") or "").strip()
    # Faqat Payme allaqachon yashirgan raqam (8600****1234). To'liq PAN saqlanmaydi.
    if "*" not in number or len(number) < 8 or len(number) > 24:
        return ""
    return number


def _safe_receipt_meta(receipt: dict) -> dict:
    return {
        "payme_receipt_id": str(receipt.get("_id") or ""),
        "payme_state": receipt.get("state"),
        "payme_amount": receipt.get("amount"),
        "payme_currency": receipt.get("currency"),
        "payme_description": str(receipt.get("description") or "")[:180],
        "payme_create_time": _epoch_ms_iso(receipt.get("create_time")),
        "payme_pay_time": _epoch_ms_iso(receipt.get("pay_time")),
        "payme_cancel_time": _epoch_ms_iso(receipt.get("cancel_time")),
        "card_mask": _masked_card(receipt),
        "sandbox": True,
    }


def _default_user_origin() -> str:
    raw = os.environ.get("FRONTEND_USER_ORIGIN", "").strip()
    if raw:
        first = raw.split(",")[0].strip().strip('"').strip("'").rstrip("/")
        parsed = urlparse(first)
        if parsed.scheme in ("http", "https") and parsed.netloc and "@" not in parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"
    from django.conf import settings

    if getattr(settings, "DEBUG", False):
        return "http://localhost:8080"
    return "https://www.mysaloon.uz"


def _origin_allowed(origin: str) -> bool:
    from django.conf import settings

    parsed = urlparse((origin or "").strip())
    if not parsed.scheme or not parsed.hostname or "@" in (parsed.netloc or ""):
        return False
    if parsed.port and parsed.hostname.lower() not in ("localhost", "127.0.0.1"):
        return False
    host = parsed.hostname.lower()
    if parsed.scheme == "http":
        return bool(getattr(settings, "DEBUG", False) and host in ("localhost", "127.0.0.1"))
    if parsed.scheme != "https":
        return False
    allowed: set[str] = {"https://mysaloon.uz", "https://www.mysaloon.uz"}
    raw = os.environ.get("FRONTEND_USER_ORIGIN", "")
    for part in raw.split(","):
        cleaned = part.strip().strip('"').strip("'").rstrip("/").lower()
        if cleaned.startswith("https://"):
            allowed.add(cleaned)
    return f"{parsed.scheme}://{parsed.netloc}".lower().rstrip("/") in allowed


def safe_payme_return_url(raw: str, order_id: str) -> str:
    """Open redirect yo'q — faqat o'z saytimizdagi to'lov holati sahifasi."""
    order = (order_id or "").strip()
    if not order.startswith("sub-") or any(ch in order for ch in " /?#&"):
        raise PaymePaymentError("Buyurtma identifikatori noto'g'ri.")
    parsed = urlparse((raw or "").strip())
    origin = ""
    if parsed.scheme in ("http", "https") and parsed.netloc and "@" not in parsed.netloc:
        origin = f"{parsed.scheme}://{parsed.netloc}"
    if not origin or not _origin_allowed(origin):
        origin = _default_user_origin()
    return f"{origin}/subscriptions/payme?{urlencode({'order_id': order})}"


def start_payme_checkout(
    *,
    user: User,
    plan_code: str,
    request=None,
    promo_code: str | None = None,
    return_url: str = "",
) -> dict:
    merchant_id, _secret = require_merchant_config()
    del _secret  # xotirada ushlab qolmaslik uchun aniq o'chirish shart emas, lekin logga chiqmaydi

    plan = get_plan(plan_code)
    if not plan:
        raise PaymePaymentError("Noto'g'ri obuna rejasi.")

    from subscriptions.plans import official_price_uzs

    try:
        catalog_uzs = official_price_uzs(plan_code)
    except ValueError as exc:
        raise PaymePaymentError(str(exc)) from exc
    priced = resolve_checkout_price(plan_code=plan_code, promo_code=promo_code, user=user)
    # Klient yoki chegirma summasi Payme ga ketmaydi. Faqat katalog narxi.
    if int(priced["amount_uzs"]) != catalog_uzs or int(priced.get("discount_uzs") or 0) != 0:
        raise PaymePaymentError("Payme summasi tarif narxiga teng emas.")
    price = Decimal(catalog_uzs)
    amount_tiyin = uzs_to_tiyin(price)
    if amount_tiyin != catalog_uzs * 100:
        raise PaymePaymentError("Payme tiyin hisobi noto'g'ri.")
    if amount_tiyin <= 0:
        raise PaymePaymentError("To'lov summasi 0 bo'lishi mumkin emas.")

    reusable = (
        SubscriptionPayment.objects.filter(
            user=user,
            provider="payme",
            plan_code=plan_code,
            amount_tiyin=amount_tiyin,
            status=SubscriptionPayment.Status.PENDING,
            created_at__gte=timezone.now() - timedelta(minutes=15),
        )
        .exclude(payme_receipt_id="")
        .order_by("-created_at")
        .first()
    )
    if reusable:
        origin = safe_payme_return_url(return_url, reusable.order_id)
        reusable.checkout_url = build_checkout_url(
            receipt_id=reusable.payme_receipt_id, return_url=origin
        )
        meta = dict(reusable.metadata or {})
        meta["return_url"] = origin
        reusable.metadata = meta
        reusable.save(update_fields=["checkout_url", "metadata", "updated_at"])
        _attach_attempt_keys(reusable, request)
        return serialize_payme_payment(reusable)

    from subscriptions.payment import build_subscription_order_id

    order_id = build_subscription_order_id(
        user_id=user.pk, plan_code=plan_code, amount=int(price)
    )
    idempotency_key = f"sub-payme-{order_id}"[:128]
    description = f"Mysaloon AI Premium {plan_code}"
    detail = fiscal_detail(title=description, price_tiyin=amount_tiyin)

    receipt = receipts_create(
        amount_tiyin=amount_tiyin,
        account={"order_id": order_id},
        description=description,
        detail=detail,
    )
    receipt_id = str(receipt.get("_id") or "").strip()
    if not receipt_id:
        raise PaymePaymentError("Payme chek identifikatori qaytmadi.")

    origin = safe_payme_return_url(return_url, order_id)
    # Chek yo'li + Payme qaytish parametri (c/callback). Summani klient belgilamaydi.
    checkout_url = build_checkout_url(receipt_id=receipt_id, return_url=origin)

    payment = SubscriptionPayment.objects.create(
        user=user,
        plan_code=plan_code,
        amount_uzs=price,
        amount_tiyin=amount_tiyin,
        provider="payme",
        status=SubscriptionPayment.Status.PENDING,
        order_id=order_id,
        payme_receipt_id=receipt_id,
        payme_state=int(receipt.get("state") or 0),
        idempotency_key=idempotency_key,
        checkout_url=checkout_url,
        metadata={
            "sandbox": True,
            "promo_code": priced.get("promo_code"),
            "base_uzs": priced.get("base_uzs"),
            "discount_uzs": priced.get("discount_uzs"),
            "discount_pct": priced.get("discount_pct"),
            "return_url": origin,
        },
    )
    log_event(
        action=SubscriptionEvent.Action.CHECKOUT,
        user=user,
        actor=f"user:{user.pk}",
        detail={
            "provider": "payme",
            "order_id": order_id,
            "amount_tiyin": amount_tiyin,
            "sandbox": True,
        },
        request=request,
    )
    try:
        from analytics.hooks import attach_payment_context

        attach_payment_context(payment, request)
    except Exception:
        logger.exception("analytics checkout hook failed")
    return serialize_payme_payment(payment)


@transaction.atomic
def sync_payme_payment(*, user: User, order_id: str, request=None) -> SubscriptionPayment:
    payment = (
        SubscriptionPayment.objects.select_for_update()
        .filter(order_id=order_id, user=user, provider="payme")
        .first()
    )
    if not payment:
        raise PaymePaymentError("Payme to'lovi topilmadi.")

    previous_status = payment.status
    if (payment.plan_code or "") == "flash" and payment.status == SubscriptionPayment.Status.PAID:
        from subscriptions.flash_tryon import flash_payment_settled

        if flash_payment_settled(payment):
            payment.last_verified_at = timezone.now()
            payment.save(update_fields=["last_verified_at", "updated_at"])
            _note_transition(payment, previous_status, payment.status)
            return payment

    if payment.status == SubscriptionPayment.Status.PAID and payment.subscription_id:
        payment.last_verified_at = timezone.now()
        payment.save(update_fields=["last_verified_at", "updated_at"])
        _note_transition(payment, previous_status, payment.status)
        return payment

    receipt_id = (payment.payme_receipt_id or "").strip()
    if not receipt_id:
        raise PaymePaymentError("Payme chek ID yo'q.")

    receipt = receipts_get(receipt_id=receipt_id)
    remote_id = str(receipt.get("_id") or "").strip()
    if remote_id and remote_id != receipt_id:
        raise PaymePaymentError("Payme chek ID mos kelmadi.")

    remote_order = _account_order_id(receipt)
    if remote_order and remote_order != payment.order_id:
        raise PaymePaymentError("Payme account.order_id mos kelmadi.")

    try:
        remote_amount = int(receipt.get("amount"))
    except (TypeError, ValueError) as exc:
        raise PaymePaymentError("Payme summasi noto'g'ri.") from exc
    if remote_amount != int(payment.amount_tiyin):
        raise PaymePaymentError("Payme summasi server narxiga mos kelmadi.")

    try:
        state = int(receipt.get("state"))
    except (TypeError, ValueError) as exc:
        raise PaymePaymentError("Payme chek holati noto'g'ri.") from exc

    try:
        check_state = receipts_check(receipt_id=receipt_id)
    except PaymeError as exc:
        logger.warning("payme receipts.check failed order=%s", payment.order_id)
        raise PaymePaymentError("Payme to'lov holati tasdiqlanmadi.") from exc

    # Obuna faqat ikkala Payme javobi ham aniq to'langan (state 4) bo'lsa yoqiladi.
    # Bittasi to'lanmagan desa, ikkinchisiga qarab to'langan deb yozilmaydi.
    if check_state in (PAYME_STATE_CANCELLED, PAYME_STATE_REFUNDED):
        mapped = _map_status(check_state)
    elif state == PAYME_STATE_PAID and check_state == PAYME_STATE_PAID:
        mapped = SubscriptionPayment.Status.PAID
    elif state == PAYME_STATE_PAID or check_state == PAYME_STATE_PAID:
        mapped = SubscriptionPayment.Status.PENDING
    else:
        mapped = _map_status(state)
    payment.payme_state = state
    meta = dict(payment.metadata or {})
    meta.update(_safe_receipt_meta(receipt))
    payment.metadata = meta

    if mapped == SubscriptionPayment.Status.PAID:
        if payment.status == SubscriptionPayment.Status.PAID and payment.subscription_id:
            payment.last_verified_at = timezone.now()
            payment.save(update_fields=["payme_state", "metadata", "last_verified_at", "updated_at"])
            _note_transition(payment, previous_status, payment.status)
            return payment
        payment.status = SubscriptionPayment.Status.PAID
        payment.transaction_id = receipt_id[:128]
        payment.paid_at = timezone.now()
        payment.last_verified_at = payment.paid_at
        payment.completed_at = payment.paid_at
        payment.outcome_source = "provider"
        payment.abandoned_at = None
        payment.save(
            update_fields=[
                "status",
                "transaction_id",
                "paid_at",
                "payme_state",
                "metadata",
                "last_verified_at",
                "completed_at",
                "outcome_source",
                "abandoned_at",
                "updated_at",
            ]
        )
        _note_transition(payment, previous_status, payment.status)
        if (payment.plan_code or "") == "flash":
            from subscriptions.flash_tryon import grant_flash_after_payme

            grant_flash_after_payme(payment, request=request)
            return payment
        sub = activate_subscription(
            user=user,
            plan_code=payment.plan_code,
            source=UserSubscription.Source.PAYME,
            price_uzs=payment.amount_uzs,
            payment_provider="payme",
            payment_order_id=payment.order_id,
            payment_transaction_id=receipt_id,
            actor=f"user:{user.pk}",
            request=request,
            notes="payme-sandbox",
        )
        payment.subscription = sub
        payment.save(update_fields=["subscription", "updated_at"])
        log_event(
            action=SubscriptionEvent.Action.PAYMENT_PAID,
            user=user,
            subscription=sub,
            actor=f"user:{user.pk}",
            detail={
                "provider": "payme",
                "order_id": payment.order_id,
                "amount_tiyin": payment.amount_tiyin,
                "sandbox": True,
            },
            request=request,
        )
        return payment

    payment.status = mapped
    payment.last_verified_at = timezone.now()
    terminal = {
        SubscriptionPayment.Status.FAILED,
        SubscriptionPayment.Status.CANCELLED,
        SubscriptionPayment.Status.EXPIRED,
        SubscriptionPayment.Status.REFUNDED,
    }
    extra = ["status", "payme_state", "metadata", "last_verified_at", "updated_at"]
    if mapped in terminal and mapped != previous_status:
        payment.completed_at = payment.last_verified_at
        payment.outcome_source = "provider"
        payment.abandoned_at = None
        extra.extend(["completed_at", "outcome_source", "abandoned_at"])
    payment.save(update_fields=extra)
    _note_transition(payment, previous_status, payment.status)
    return payment


def reconcile_pending_payme(user: User) -> None:
    """Oxirgi ochiq chekni Payme dan so'raydi. To'lanmagan bo'lsa obuna yoqilmaydi.

    Har bir profil ochilishida Payme ga yopishmaydi: foydalanuvchiga 20 soniyada bir marta,
    faqat oxirgi 6 soatdagi bitta kutilayotgan chek.
    """
    try:
        if not cache.add(f"payme-reconcile:{user.pk}", 1, timeout=20):
            return
    except Exception:
        logger.warning("payme reconcile cache skip user=%s", user.pk, exc_info=True)
        return
    cutoff = timezone.now() - timedelta(hours=6)
    payment = (
        SubscriptionPayment.objects.filter(
            user=user,
            provider="payme",
            status=SubscriptionPayment.Status.PENDING,
            created_at__gte=cutoff,
        )
        .exclude(payme_receipt_id="")
        .order_by("-created_at")
        .first()
    )
    if not payment:
        return
    try:
        sync_payme_payment(user=user, order_id=payment.order_id)
    except PaymeError:
        logger.warning("payme reconcile failed order=%s", payment.order_id)


def serialize_payme_payment(payment: SubscriptionPayment) -> dict:
    sub = None
    if payment.subscription_id:
        sub = serialize_subscription(payment.subscription)
    message = {
        SubscriptionPayment.Status.PENDING: "Payme sandbox to'lovi kutilmoqda.",
        SubscriptionPayment.Status.PAID: "Payme to'lovi tasdiqlandi.",
        SubscriptionPayment.Status.FAILED: "Payme to'lovi amalga oshmadi.",
        SubscriptionPayment.Status.CANCELLED: "Payme to'lovi bekor qilindi.",
        SubscriptionPayment.Status.EXPIRED: "Payme cheki muddati o'tgan.",
        SubscriptionPayment.Status.REFUNDED: "Payme to'lovi qaytarilgan.",
    }.get(payment.status, "")
    if (payment.plan_code or "") == "flash" and (payment.metadata or {}).get("flash_expired"):
        message = "To'lov qabul qilindi, lekin 30 daqiqa tugagan. Rasm ochilmadi."
    elif (payment.plan_code or "") == "flash" and payment.status == SubscriptionPayment.Status.PAID:
        message = "1 000 so'm tasdiqlandi. 1 ta rasm ochildi."
    me = None
    if payment.status == SubscriptionPayment.Status.PAID:
        from subscriptions.services import build_me_payload

        me = build_me_payload(payment.user)
    return {
        "payment_id": str(payment.pk),
        "provider": payment.provider,
        "method": payment.provider,
        "configured": True,
        "status": payment.status,
        "order_id": payment.order_id,
        "plan_code": payment.plan_code,
        "amount_uzs": int(payment.amount_uzs),
        "amount_tiyin": int(payment.amount_tiyin),
        "checkout_url": payment.checkout_url or None,
        "payme_receipt_id": payment.payme_receipt_id or None,
        "payme_state": payment.payme_state,
        "sandbox": True,
        "message": message,
        "subscription": sub,
        "me": me,
        "transaction_id": payment.transaction_id or None,
        "base_uzs": (payment.metadata or {}).get("base_uzs"),
        "discount_uzs": (payment.metadata or {}).get("discount_uzs"),
        "promo_code": (payment.metadata or {}).get("promo_code"),
    }
