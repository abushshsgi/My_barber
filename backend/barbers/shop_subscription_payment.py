"""Sartarosh obuna to'lovi — server narxi, idempotent, throttle-ready."""

from __future__ import annotations

import hashlib
import secrets
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from barbers.models import Barber, BarberShopSubscriptionPayment
from barbers.shop_plans import PLAN_CODES, get_plan, plan_price
from barbers.shop_subscription_services import activate_subscription, log_event
from wallet.payments import _provider_configured, init_checkout


def build_order_id(*, barber_id: int, plan_code: str, amount: int) -> str:
    nonce = secrets.token_hex(4)
    return f"bsub-{barber_id}-{plan_code}-{amount}-{nonce}"


def parse_order_id(order_id: str) -> tuple[int, str, Decimal] | None:
    parts = (order_id or "").strip().split("-")
    # bsub-{barber_id}-{plan}-{amount}-{nonce}
    if len(parts) < 5 or parts[0] != "bsub":
        return None
    try:
        barber_id = int(parts[1])
        plan_code = parts[2].lower()
        amount = Decimal(parts[3])
    except (ValueError, IndexError):
        return None
    if plan_code not in PLAN_CODES or amount < 0:
        return None
    return barber_id, plan_code, amount


def _safe_return_url(raw: str) -> str | None:
    """Open redirect himoya — faqat barber frontend originlari."""
    url = (raw or "").strip()
    if not url.startswith(("https://", "http://")):
        return None
    allowed: list[str] = []
    for key in ("FRONTEND_BARBER_ORIGIN", "FRONTEND_USER_ORIGIN"):
        env = __import__("os").environ.get(key, "").strip()
        if env:
            for part in env.split(","):
                cleaned = part.strip().strip('"').strip("'").rstrip("/")
                if cleaned:
                    allowed.append(cleaned.lower())
    debug = getattr(settings, "DEBUG", False)
    if debug:
        allowed.extend(
            [
                "http://localhost:3001",
                "http://127.0.0.1:3001",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
            ]
        )
    # Production default
    allowed.append("https://barber.mysaloon.uz")
    allowed.append("https://mysaloon.uz")
    lower = url.lower()
    for origin in allowed:
        if lower == origin or lower.startswith(origin + "/"):
            return url
    return None


def _idempotency_key(*, barber_id: int, plan_code: str, provider: str, client_key: str) -> str:
    raw = f"{barber_id}:{plan_code}:{provider}:{client_key}".encode()
    return hashlib.sha256(raw).hexdigest()[:64]


@transaction.atomic
def pay_with_barber_wallet(*, barber: Barber, plan_code: str, request=None) -> object:
    from wallet.services.barber_wallet import BarberWalletService
    from wallet.services.wallet_service import InsufficientBalanceError

    plan = get_plan(plan_code)
    price = plan_price(plan_code)
    if not plan or price is None:
        raise ValueError("Noto'g'ri tarif.")

    amount_int = int(price)
    order_id = build_order_id(barber_id=barber.pk, plan_code=plan_code, amount=amount_int)
    idem = _idempotency_key(
        barber_id=barber.pk,
        plan_code=plan_code,
        provider="wallet",
        client_key=order_id,
    )
    existing = BarberShopSubscriptionPayment.objects.filter(idempotency_key=idem).first()
    if existing and existing.status == BarberShopSubscriptionPayment.Status.PAID:
        from barbers.shop_subscription_services import get_active_subscription

        return get_active_subscription(barber)

    wallet = BarberWalletService.ensure_wallet(barber)
    if wallet.balance < price:
        raise InsufficientBalanceError(
            f"Hisobda mablag' yetarli emas. Kerak: {amount_int} so'm."
        )

    entry = BarberWalletService.debit_subscription(
        barber=barber,
        amount=price,
        order_id=order_id,
        plan_code=plan_code,
        idempotency_key=f"bsub-wallet-{idem}",
    )

    payment = BarberShopSubscriptionPayment.objects.create(
        barber=barber,
        plan_code=plan_code,
        amount_uzs=price,
        provider="wallet",
        status=BarberShopSubscriptionPayment.Status.PAID,
        order_id=order_id,
        transaction_id=str(entry.pk),
        idempotency_key=idem,
        metadata={"wallet_balance_after": str(entry.balance_after)},
        paid_at=timezone.now(),
    )
    sub = activate_subscription(
        barber=barber,
        plan_code=plan_code,
        source="wallet",
        price_uzs=price,
        payment_provider="wallet",
        payment_order_id=order_id,
        payment_transaction_id=str(entry.pk),
        wallet_entry_id=str(entry.pk),
        request=request,
    )
    payment.subscription = sub
    payment.save(update_fields=["subscription", "updated_at"])
    log_event(
        action="paid_wallet",
        barber=barber,
        subscription=sub,
        actor="wallet",
        detail={"order_id": order_id, "amount": str(price)},
        request=request,
    )
    return sub


def start_provider_checkout(
    *,
    barber: Barber,
    plan_code: str,
    provider: str,
    return_url: str,
    request=None,
    client_idempotency: str = "",
) -> dict:
    plan = get_plan(plan_code)
    price = plan_price(plan_code)
    if not plan or price is None:
        raise ValueError("Noto'g'ri tarif.")
    if provider not in ("click", "payme"):
        raise ValueError("provider click yoki payme bo'lishi kerak.")

    safe_return = _safe_return_url(return_url)
    if not safe_return:
        raise ValueError("return_url ruxsat etilmagan.")

    amount_int = int(price)
    order_id = build_order_id(barber_id=barber.pk, plan_code=plan_code, amount=amount_int)
    client_key = (client_idempotency or "").strip()[:64] or order_id
    idem = _idempotency_key(
        barber_id=barber.pk, plan_code=plan_code, provider=provider, client_key=client_key
    )

    existing = BarberShopSubscriptionPayment.objects.filter(idempotency_key=idem).first()
    if existing and existing.status == BarberShopSubscriptionPayment.Status.PENDING:
        return {
            "ok": bool(existing.checkout_url) or not _provider_configured(provider),  # type: ignore[arg-type]
            "provider": provider,
            "order_id": existing.order_id,
            "checkout_url": existing.checkout_url or None,
            "amount_uzs": int(existing.amount_uzs),
            "plan_code": plan_code,
            "configured": _provider_configured(provider),  # type: ignore[arg-type]
        }

    init = init_checkout(
        provider=provider,  # type: ignore[arg-type]
        amount=price,
        order_id=order_id,
        return_url=safe_return,
    )
    payment = BarberShopSubscriptionPayment.objects.create(
        barber=barber,
        plan_code=plan_code,
        amount_uzs=price,
        provider=provider,
        status=BarberShopSubscriptionPayment.Status.PENDING,
        order_id=order_id,
        transaction_id=init.transaction_id or "",
        idempotency_key=idem,
        checkout_url=init.checkout_url or "",
        metadata={"return_url": safe_return, "configured": init.configured},
    )
    log_event(
        action="checkout_started",
        barber=barber,
        actor=provider,
        detail={"order_id": order_id, "provider": provider, "configured": init.configured},
        request=request,
    )

    debug = getattr(settings, "DEBUG", False)
    ok = bool(init.checkout_url) or (debug and not init.configured)
    return {
        "ok": ok,
        "provider": provider,
        "order_id": order_id,
        "checkout_url": init.checkout_url,
        "amount_uzs": amount_int,
        "plan_code": plan_code,
        "configured": init.configured,
        "message": init.message,
        "debug_confirm_allowed": debug and not init.configured,
        "payment_id": str(payment.pk),
    }


@transaction.atomic
def confirm_provider_payment(
    *,
    barber: Barber,
    order_id: str,
    provider: str,
    request=None,
) -> object:
    parsed = parse_order_id(order_id)
    if not parsed:
        raise ValueError("order_id noto'g'ri.")
    barber_id, plan_code, amount = parsed
    if barber_id != barber.pk:
        log_event(
            action="confirm_barber_mismatch",
            barber=barber,
            actor="security",
            detail={"order_id": order_id, "expected": barber_id},
            request=request,
        )
        raise ValueError("Bu to'lov sizga tegishli emas.")

    if provider not in ("click", "payme"):
        raise ValueError("provider noto'g'ri.")

    payment = (
        BarberShopSubscriptionPayment.objects.select_for_update()
        .filter(order_id=order_id, barber=barber)
        .first()
    )
    if not payment:
        raise ValueError("To'lov topilmadi.")
    if payment.provider != provider:
        raise ValueError("Provider mos kelmadi.")
    if payment.amount_uzs != amount:
        raise ValueError("Summa mos kelmadi.")
    if payment.plan_code != plan_code:
        raise ValueError("Tarif mos kelmadi.")

    if payment.status == BarberShopSubscriptionPayment.Status.PAID and payment.subscription_id:
        from barbers.shop_subscription_services import get_active_subscription

        return get_active_subscription(barber) or payment.subscription

    configured = _provider_configured(provider)  # type: ignore[arg-type]
    debug = getattr(settings, "DEBUG", False)
    if configured:
        # Production: faqat provider webhook/tasdiqdan keyin (hozircha stub)
        raise RuntimeError(
            f"{provider.upper()} tasdiqlash hali to'liq ulanmagan. "
            "To'lov holatini kuting yoki qo'llab-quvvatlashga murojaat qiling."
        )
    if not debug:
        raise RuntimeError(f"{provider.upper()} sozlanmagan.")

    # DEBUG stub — faqat development
    payment.status = BarberShopSubscriptionPayment.Status.PAID
    payment.paid_at = timezone.now()
    payment.transaction_id = payment.transaction_id or f"debug-{provider}-{order_id}"
    payment.save(update_fields=["status", "paid_at", "transaction_id", "updated_at"])

    sub = activate_subscription(
        barber=barber,
        plan_code=plan_code,
        source=provider,
        price_uzs=payment.amount_uzs,
        payment_provider=provider,
        payment_order_id=order_id,
        payment_transaction_id=payment.transaction_id,
        request=request,
        notes="debug_confirm",
    )
    payment.subscription = sub
    payment.save(update_fields=["subscription", "updated_at"])
    log_event(
        action="paid_debug",
        barber=barber,
        subscription=sub,
        actor=provider,
        detail={"order_id": order_id},
        request=request,
    )
    return sub
