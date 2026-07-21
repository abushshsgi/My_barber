"""Obuna to'lovi — faqat server narxi, idempotent tasdiqlash."""

from __future__ import annotations

import secrets
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from subscriptions.models import SubscriptionEvent, SubscriptionPayment, UserSubscription
from subscriptions.plans import get_plan, plan_price
from subscriptions.services import activate_subscription, log_event
from wallet.payments import _provider_configured, init_checkout
from wallet.services.wallet_service import InsufficientBalanceError, WalletService, WalletServiceError


def build_subscription_order_id(*, user_id: int, plan_code: str, amount: int) -> str:
    nonce = secrets.token_hex(4)
    return f"sub-{user_id}-{plan_code}-{amount}-{nonce}"


def parse_subscription_order(order_id: str) -> tuple[int, str, Decimal] | None:
    parts = (order_id or "").strip().split("-")
    # sub-{user_id}-{plan}-{amount}-{nonce}
    if len(parts) < 5 or parts[0] != "sub":
        return None
    try:
        user_id = int(parts[1])
        plan_code = parts[2].lower()
        amount = Decimal(parts[3])
    except (ValueError, IndexError):
        return None
    # Narx to'liq yoki promokod chegirmasi bilan bo'lishi mumkin —
    # yakuniy tekshiruv SubscriptionPayment.amount_uzs bilan qilinadi.
    if get_plan(plan_code) is None:
        return None
    if amount < 0:
        return None
    return user_id, plan_code, amount


@transaction.atomic
def pay_with_wallet(*, user: User, plan_code: str, request=None, promo_code: str | None = None) -> UserSubscription:
    from subscriptions.promos import resolve_checkout_price

    plan = get_plan(plan_code)
    if not plan:
        raise WalletServiceError("Noto'g'ri obuna rejasi.")

    try:
        priced = resolve_checkout_price(plan_code=plan_code, promo_code=promo_code, user=user)
    except ValueError as exc:
        raise WalletServiceError(str(exc)) from exc

    price = Decimal(priced["amount_uzs"])
    order_id = build_subscription_order_id(
        user_id=user.pk, plan_code=plan_code, amount=int(price)
    )
    idempotency_key = f"sub-wallet-{user.pk}-{plan_code}-{order_id}"[:128]

    wallet = WalletService.ensure_wallet(user)
    try:
        entry = WalletService.post_entry(
            wallet=wallet,
            entry_type="subscription",
            amount=-price,
            idempotency_key=idempotency_key,
            reference_type="subscription",
            reference_id=order_id,
            metadata={
                "plan_code": plan_code,
                "source": "wallet",
                "promo_code": priced.get("promo_code"),
                "base_uzs": priced.get("base_uzs"),
                "discount_uzs": priced.get("discount_uzs"),
            },
        )
    except InsufficientBalanceError:
        raise
    except WalletServiceError:
        raise

    payment = SubscriptionPayment.objects.create(
        user=user,
        plan_code=plan_code,
        amount_uzs=price,
        provider="wallet",
        status=SubscriptionPayment.Status.PAID,
        order_id=order_id,
        transaction_id=str(entry.pk),
        idempotency_key=idempotency_key,
        paid_at=timezone.now(),
        metadata={
            "wallet_entry_id": str(entry.pk),
            "promo_code": priced.get("promo_code"),
            "base_uzs": priced.get("base_uzs"),
            "discount_uzs": priced.get("discount_uzs"),
        },
    )

    sub = activate_subscription(
        user=user,
        plan_code=plan_code,
        source=UserSubscription.Source.WALLET,
        price_uzs=price,
        payment_provider="wallet",
        payment_order_id=order_id,
        payment_transaction_id=str(entry.pk),
        wallet_entry_id=str(entry.pk),
        actor=f"user:{user.pk}",
        request=request,
    )
    payment.subscription = sub
    payment.save(update_fields=["subscription", "updated_at"])
    log_event(
        action=SubscriptionEvent.Action.PAYMENT_PAID,
        user=user,
        subscription=sub,
        actor=f"user:{user.pk}",
        detail={
            "provider": "wallet",
            "amount": str(price),
            "order_id": order_id,
            "promo_code": priced.get("promo_code"),
        },
        request=request,
    )
    return sub


def start_provider_checkout(
    *,
    user: User,
    plan_code: str,
    provider: str,
    return_url: str,
    request=None,
    promo_code: str | None = None,
) -> dict:
    from subscriptions.promos import resolve_checkout_price

    plan = get_plan(plan_code)
    if not plan:
        raise ValueError("Noto'g'ri obuna rejasi.")
    if provider not in ("click", "payme"):
        raise ValueError("provider must be click or payme.")

    priced = resolve_checkout_price(plan_code=plan_code, promo_code=promo_code, user=user)
    price = Decimal(priced["amount_uzs"])
    order_id = build_subscription_order_id(
        user_id=user.pk, plan_code=plan_code, amount=int(price)
    )
    idempotency_key = f"sub-checkout-{order_id}"[:128]

    result = init_checkout(
        provider=provider,  # type: ignore[arg-type]
        amount=price,
        order_id=order_id,
        return_url=return_url,
    )

    payment = SubscriptionPayment.objects.create(
        user=user,
        plan_code=plan_code,
        amount_uzs=price,
        provider=provider,
        status=SubscriptionPayment.Status.PENDING,
        order_id=order_id,
        transaction_id=result.transaction_id or "",
        idempotency_key=idempotency_key,
        checkout_url=result.checkout_url or "",
        metadata={
            "configured": result.configured,
            "message": result.message,
            "promo_code": priced.get("promo_code"),
            "base_uzs": priced.get("base_uzs"),
            "discount_uzs": priced.get("discount_uzs"),
        },
    )
    log_event(
        action=SubscriptionEvent.Action.CHECKOUT,
        user=user,
        actor=f"user:{user.pk}",
        detail={
            "provider": provider,
            "order_id": order_id,
            "amount": str(price),
            "configured": result.configured,
            "promo_code": priced.get("promo_code"),
        },
        request=request,
    )

    # DEBUG da provider sozlanmagan bo'lsa ham test uchun checkout URL qaytaramiz
    code_ok = result.configured or settings.DEBUG
    return {
        "payment_id": str(payment.pk),
        "provider": provider,
        "configured": result.configured,
        "checkout_url": result.checkout_url,
        "transaction_id": result.transaction_id,
        "order_id": order_id,
        "amount_uzs": int(price),
        "base_uzs": priced["base_uzs"],
        "discount_uzs": priced["discount_uzs"],
        "promo_code": priced.get("promo_code"),
        "plan_code": plan_code,
        "message": result.message,
        "ok": code_ok,
    }


@transaction.atomic
def confirm_provider_payment(
    *,
    user: User,
    order_id: str,
    provider: str,
    transaction_id: str = "",
    request=None,
) -> UserSubscription:
    parsed = parse_subscription_order(order_id)
    if not parsed:
        raise ValueError("Noto'g'ri buyurtma identifikatori.")

    user_id, plan_code, amount = parsed
    if user.pk != user_id:
        raise PermissionError("Buyurtma boshqa foydalanuvchiga tegishli.")

    base = plan_price(plan_code)
    if base is None or amount > base:
        raise ValueError("Narx mos kelmadi — xavfsizlik tekshiruvi.")

    if provider not in ("click", "payme"):
        raise ValueError("provider must be click or payme.")

    configured = _provider_configured(provider)  # type: ignore[arg-type]
    if not configured and not settings.DEBUG:
        raise RuntimeError(f"{provider.upper()} hali sozlanmagan.")

    payment = (
        SubscriptionPayment.objects.select_for_update()
        .filter(order_id=order_id, user=user)
        .first()
    )
    if not payment:
        raise ValueError("To'lov topilmadi.")

    if payment.status == SubscriptionPayment.Status.PAID and payment.subscription_id:
        sub = payment.subscription
        assert sub is not None
        return sub

    if payment.amount_uzs != amount or payment.plan_code != plan_code:
        raise ValueError("To'lov ma'lumotlari buzilgan.")

    tx = (transaction_id or payment.transaction_id or order_id).strip()
    payment.status = SubscriptionPayment.Status.PAID
    payment.transaction_id = tx[:128]
    payment.paid_at = timezone.now()
    payment.save(update_fields=["status", "transaction_id", "paid_at", "updated_at"])

    source = (
        UserSubscription.Source.CLICK
        if provider == "click"
        else UserSubscription.Source.PAYME
    )
    sub = activate_subscription(
        user=user,
        plan_code=plan_code,
        source=source,
        price_uzs=amount,
        payment_provider=provider,
        payment_order_id=order_id,
        payment_transaction_id=tx,
        actor=f"user:{user.pk}",
        request=request,
    )
    payment.subscription = sub
    payment.save(update_fields=["subscription", "updated_at"])
    log_event(
        action=SubscriptionEvent.Action.PAYMENT_PAID,
        user=user,
        subscription=sub,
        actor=f"user:{user.pk}",
        detail={"provider": provider, "amount": str(amount), "order_id": order_id, "tx": tx},
        request=request,
    )
    return sub
