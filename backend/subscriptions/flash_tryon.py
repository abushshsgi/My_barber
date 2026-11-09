"""Yangi foydalanuvchi: 30 daqiqa, 1 marta, 1 rasm, 1 000 so'm, faqat Payme.

Narx klientdan olinmaydi. Try-on Payme cheki ikki marta state=4 qaytarguncha yopiq.
30 daqiqa ro'yxatdan boshlanadi — tugasa rasm kuyadi. Kartadagi to'liq raqam saqlanmaydi.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from accounts.models import User
from subscriptions.models import FlashTryonPass, SubscriptionEvent, SubscriptionPayment
from subscriptions.payme_client import uzs_to_tiyin

FLASH_PLAN = "flash"
FLASH_PRICE_UZS = 1000
FLASH_WINDOW = timedelta(minutes=30)
FLASH_RESERVE_TTL = timedelta(minutes=20)
FLASH_MIN_SECONDS_TO_BUY = 60
# Shu vaqtdan keyin ochilgan hisoblar. Eski userlarga taklif chiqmaydi.
FLASH_TRYON_LAUNCH_AT = datetime(2026, 11, 9, 14, 30, tzinfo=dt_timezone.utc)

MSG_UNPAID = "Try-on uchun avval 1 000 so'm to'lov yoki obuna kerak."
MSG_BUSY = "1 ta rasm yaratilmoqda. Tugashini kuting."
MSG_BURNED = "30 daqiqa tugadi. 1 000 so'mlik rasm kuyadi."
MSG_ONCE = "1 000 so'mlik rasm faqat 1 marta."
MSG_NOT_NEW = "Bu taklif faqat yangi foydalanuvchilar uchun."
MSG_AMOUNT = "Payme summasi 1 000 so'm emas."


def _aware(value):
    if value is None:
        return None
    if timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())
    return value


def _joined(user: User):
    return _aware(getattr(user, "date_joined", None))


def is_new_flash_user(user: User) -> bool:
    joined = _joined(user)
    if joined is None:
        return False
    return joined >= FLASH_TRYON_LAUNCH_AT


def window_end(user: User):
    joined = _joined(user)
    if joined is None:
        return timezone.now()
    return joined + FLASH_WINDOW


def _seconds_left(expires, now) -> int:
    return max(0, int((expires - now).total_seconds()))


def _reserved_fresh(row: FlashTryonPass, now) -> bool:
    if not row.reserved_at or row.used_at:
        return False
    return row.reserved_at > now - FLASH_RESERVE_TTL


def flash_snapshot(user: User, *, now=None) -> dict:
    """Mijozga ko'rsatiladigan holat. To'lovni bu yerda yoqmaydi."""
    now = now or timezone.now()
    launched = is_new_flash_user(user)
    expires = window_end(user) if launched else None
    seconds = _seconds_left(expires, now) if expires else 0
    payload = {
        "price_uzs": FLASH_PRICE_UZS,
        "images": 1,
        "once": True,
        "window_minutes": 30,
        "expires_at": expires.isoformat() if expires else None,
        "seconds_left": seconds,
        "can_buy": False,
        "can_generate": False,
        "status": "unavailable",
        "used": False,
    }
    if not launched or expires is None:
        return payload

    row = FlashTryonPass.objects.filter(user_id=user.pk).first()
    if row and (row.used_at or row.status == FlashTryonPass.Status.USED):
        payload["status"] = "used"
        payload["used"] = True
        payload["seconds_left"] = 0
        payload["expires_at"] = row.expires_at.isoformat() if row.expires_at else payload["expires_at"]
        return payload

    if row and row.status == FlashTryonPass.Status.PAID and row.paid_at and not row.used_at:
        fresh = _reserved_fresh(row, now)
        if now < row.expires_at or fresh:
            payload["status"] = "paid"
            payload["can_generate"] = True
            payload["expires_at"] = row.expires_at.isoformat()
            payload["seconds_left"] = _seconds_left(row.expires_at, now)
            return payload
        payload["status"] = "burned"
        payload["seconds_left"] = 0
        payload["expires_at"] = row.expires_at.isoformat()
        return payload

    if now >= expires:
        payload["status"] = "burned"
        payload["seconds_left"] = 0
        return payload

    payload["status"] = "pending" if row and row.status == FlashTryonPass.Status.PENDING else "open"
    payload["can_buy"] = seconds >= FLASH_MIN_SECONDS_TO_BUY
    return payload


def flash_tryon_block(user: User, *, allow_reserved: bool = False) -> str | None:
    """
    "" — shu 1 000 so'mlik rasm try-on ni ochadi.
    matn — yangi user, lekin hozir ochilmaydi.
    None — taklif bu userga tegishli emas (eski hisob).
    """
    if not is_new_flash_user(user):
        return None
    now = timezone.now()
    row = FlashTryonPass.objects.filter(user_id=user.pk).first()
    if row and (row.used_at or row.status == FlashTryonPass.Status.USED):
        return MSG_ONCE
    if row and row.status == FlashTryonPass.Status.PAID and row.paid_at and not row.used_at:
        if _reserved_fresh(row, now):
            return "" if allow_reserved else MSG_BUSY
        if now < row.expires_at:
            return ""
        return MSG_BURNED
    if now >= window_end(user):
        return MSG_BURNED
    return MSG_UNPAID


def flash_needs_reserve(user: User) -> bool:
    """Obuna kvotasi yoki referal bor bo'lsa 1 000 so'mlik rasm ushlanmaydi."""
    if flash_tryon_block(user, allow_reserved=False) != "":
        return False
    from subscriptions.services import (
        _quota_int,
        _referral_credits,
        align_usage_to_plan,
        get_active_subscription,
        quota_for_subscription,
    )

    if _referral_credits(user) > 0:
        return False
    sub = get_active_subscription(user)
    if sub:
        usage = align_usage_to_plan(user, sub)
        limit = _quota_int(quota_for_subscription(sub), "morph_ai_monthly")
        if limit > 0 and int(usage.morph_ai_used or 0) < limit:
            return False
    return True


def reserve_flash_tryon(user: User) -> bool:
    now = timezone.now()
    stale_before = now - FLASH_RESERVE_TTL
    updated = FlashTryonPass.objects.filter(
        user=user,
        status=FlashTryonPass.Status.PAID,
        used_at__isnull=True,
        expires_at__gt=now,
    ).filter(Q(reserved_at__isnull=True) | Q(reserved_at__lt=stale_before)).update(reserved_at=now)
    return updated == 1


def commit_flash_tryon(user: User) -> bool:
    """Muvaffaqiyatli 1 ta rasm. Ikkinchi marta yozilmaydi."""
    now = timezone.now()
    updated = FlashTryonPass.objects.filter(
        user=user,
        status=FlashTryonPass.Status.PAID,
        used_at__isnull=True,
        reserved_at__isnull=False,
    ).update(status=FlashTryonPass.Status.USED, used_at=now, reserved_at=None)
    return updated == 1


def release_flash_reservation(user_id: int | None) -> None:
    if not user_id:
        return
    FlashTryonPass.objects.filter(
        user_id=user_id,
        status=FlashTryonPass.Status.PAID,
        used_at__isnull=True,
        reserved_at__isnull=False,
    ).update(reserved_at=None)


def flash_payment_settled(payment: SubscriptionPayment) -> bool:
    if (payment.plan_code or "") != FLASH_PLAN:
        return False
    if payment.status != SubscriptionPayment.Status.PAID:
        return False
    row = FlashTryonPass.objects.filter(payment_id=payment.pk).first()
    if not row:
        row = FlashTryonPass.objects.filter(user_id=payment.user_id, order_id=payment.order_id).first()
    if not row:
        return False
    return row.status in (
        FlashTryonPass.Status.PAID,
        FlashTryonPass.Status.USED,
        FlashTryonPass.Status.EXPIRED,
    ) and row.paid_at is not None


def _order_id(user_id: int) -> str:
    return f"sub-{user_id}-flash-{FLASH_PRICE_UZS}-{secrets.token_hex(4)}"


@transaction.atomic
def start_flash_checkout(*, user: User, return_url: str, request=None) -> dict:
    from subscriptions.payme_client import fiscal_detail, receipts_create, require_merchant_config
    from subscriptions.payme_service import (
        PaymePaymentError,
        build_checkout_url,
        log_event,
        safe_payme_return_url,
        serialize_payme_payment,
    )

    require_merchant_config()
    user = User.objects.select_for_update().get(pk=user.pk)
    snap = flash_snapshot(user)
    if not is_new_flash_user(user):
        raise PaymePaymentError(MSG_NOT_NEW)
    if snap.get("used"):
        raise PaymePaymentError(MSG_ONCE)
    if snap.get("can_generate"):
        raise PaymePaymentError(MSG_ONCE)
    if not snap.get("can_buy"):
        raise PaymePaymentError(MSG_BURNED)

    price = Decimal(FLASH_PRICE_UZS)
    amount_tiyin = uzs_to_tiyin(price)
    if amount_tiyin != FLASH_PRICE_UZS * 100:
        raise PaymePaymentError(MSG_AMOUNT)

    row = FlashTryonPass.objects.select_for_update().filter(user=user).first()
    expires = window_end(user)
    if row and row.status in (FlashTryonPass.Status.PAID, FlashTryonPass.Status.USED):
        raise PaymePaymentError(MSG_ONCE)
    if row and row.status == FlashTryonPass.Status.EXPIRED:
        raise PaymePaymentError(MSG_BURNED)

    reusable = None
    if row and row.order_id:
        reusable = (
            SubscriptionPayment.objects.filter(
                user=user,
                order_id=row.order_id,
                provider="payme",
                plan_code=FLASH_PLAN,
                amount_tiyin=amount_tiyin,
                status=SubscriptionPayment.Status.PENDING,
            )
            .exclude(payme_receipt_id="")
            .first()
        )
    if reusable:
        origin = safe_payme_return_url(return_url, reusable.order_id)
        reusable.checkout_url = build_checkout_url(
            receipt_id=reusable.payme_receipt_id,
            return_url=origin,
        )
        meta = dict(reusable.metadata or {})
        meta["return_url"] = origin
        meta["flash"] = True
        reusable.metadata = meta
        reusable.save(update_fields=["checkout_url", "metadata", "updated_at"])
        return serialize_payme_payment(reusable)

    order_id = _order_id(user.pk)
    origin = safe_payme_return_url(return_url, order_id)
    description = "Mysaloon 1 ta rasm"
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
    checkout_url = build_checkout_url(receipt_id=receipt_id, return_url=origin)
    payment = SubscriptionPayment.objects.create(
        user=user,
        plan_code=FLASH_PLAN,
        amount_uzs=price,
        amount_tiyin=amount_tiyin,
        provider="payme",
        status=SubscriptionPayment.Status.PENDING,
        order_id=order_id,
        payme_receipt_id=receipt_id,
        payme_state=int(receipt.get("state") or 0),
        idempotency_key=f"sub-payme-{order_id}"[:128],
        checkout_url=checkout_url,
        metadata={"sandbox": True, "flash": True, "images": 1, "return_url": origin},
    )
    if row is None:
        try:
            row = FlashTryonPass.objects.create(
                user=user,
                status=FlashTryonPass.Status.PENDING,
                amount_uzs=price,
                amount_tiyin=amount_tiyin,
                expires_at=expires,
                order_id=order_id,
                payme_receipt_id=receipt_id,
                payment=payment,
            )
        except IntegrityError as exc:
            raise PaymePaymentError(MSG_ONCE) from exc
    else:
        row.status = FlashTryonPass.Status.PENDING
        row.amount_uzs = price
        row.amount_tiyin = amount_tiyin
        row.expires_at = expires
        row.order_id = order_id
        row.payme_receipt_id = receipt_id
        row.payment = payment
        row.save(
            update_fields=[
                "status",
                "amount_uzs",
                "amount_tiyin",
                "expires_at",
                "order_id",
                "payme_receipt_id",
                "payment",
                "updated_at",
            ]
        )
    log_event(
        action=SubscriptionEvent.Action.CHECKOUT,
        user=user,
        actor=f"user:{user.pk}",
        detail={
            "provider": "payme",
            "order_id": order_id,
            "amount_tiyin": amount_tiyin,
            "plan_code": FLASH_PLAN,
        },
        request=request,
    )
    return serialize_payme_payment(payment)


@transaction.atomic
def grant_flash_after_payme(payment: SubscriptionPayment, *, request=None) -> FlashTryonPass:
    """Payme summasi va chek ID serverdagi 1 000 so'm bilan teng bo'lsa yoziladi."""
    from subscriptions.payme_service import PaymePaymentError, log_event

    if (payment.plan_code or "") != FLASH_PLAN:
        raise PaymePaymentError("Noto'g'ri to'lov turi.")
    if int(payment.amount_tiyin or 0) != FLASH_PRICE_UZS * 100 or int(payment.amount_uzs or 0) != FLASH_PRICE_UZS:
        raise PaymePaymentError(MSG_AMOUNT)
    if payment.status != SubscriptionPayment.Status.PAID:
        raise PaymePaymentError("To'lov tasdiqlanmagan.")

    user = User.objects.select_for_update().get(pk=payment.user_id)
    row = FlashTryonPass.objects.select_for_update().filter(user=user).first()
    if row is None:
        raise PaymePaymentError("Taklif yozuvi topilmadi.")
    if row.order_id and row.order_id != payment.order_id:
        raise PaymePaymentError("Buyurtma mos kelmadi.")
    if row.payme_receipt_id and payment.payme_receipt_id and row.payme_receipt_id != payment.payme_receipt_id:
        raise PaymePaymentError("Payme chek ID mos kelmadi.")
    if row.status == FlashTryonPass.Status.USED or row.used_at:
        if row.payment_id == payment.pk:
            return row
        raise PaymePaymentError(MSG_ONCE)
    if row.status == FlashTryonPass.Status.PAID and row.paid_at and row.payment_id == payment.pk:
        return row
    if row.status == FlashTryonPass.Status.PAID and row.paid_at and row.payment_id != payment.pk:
        raise PaymePaymentError(MSG_ONCE)

    now = timezone.now()
    row.payment = payment
    row.payme_receipt_id = payment.payme_receipt_id or row.payme_receipt_id
    row.paid_at = now
    row.amount_uzs = Decimal(FLASH_PRICE_UZS)
    row.amount_tiyin = FLASH_PRICE_UZS * 100
    if now >= row.expires_at:
        row.status = FlashTryonPass.Status.EXPIRED
        row.save(
            update_fields=[
                "payment",
                "payme_receipt_id",
                "paid_at",
                "amount_uzs",
                "amount_tiyin",
                "status",
                "updated_at",
            ]
        )
        meta = dict(payment.metadata or {})
        meta["flash_expired"] = True
        payment.metadata = meta
        payment.save(update_fields=["metadata", "updated_at"])
        log_event(
            action=SubscriptionEvent.Action.EXPIRED,
            user=user,
            actor=f"user:{user.pk}",
            detail={"order_id": payment.order_id, "plan_code": FLASH_PLAN, "burned": True},
            request=request,
        )
        return row

    row.status = FlashTryonPass.Status.PAID
    row.save(
        update_fields=[
            "payment",
            "payme_receipt_id",
            "paid_at",
            "amount_uzs",
            "amount_tiyin",
            "status",
            "updated_at",
        ]
    )
    log_event(
        action=SubscriptionEvent.Action.PAYMENT_PAID,
        user=user,
        actor=f"user:{user.pk}",
        detail={
            "provider": "payme",
            "order_id": payment.order_id,
            "amount_tiyin": payment.amount_tiyin,
            "plan_code": FLASH_PLAN,
            "images": 1,
        },
        request=request,
    )
    return row
