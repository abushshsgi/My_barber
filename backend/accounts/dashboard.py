"""Yagona mijoz dashboard — MySaloon va Morph AI bitta User JWT."""

from __future__ import annotations

from typing import Any

from rest_framework.request import Request

from accounts.email_utils import is_internal_email
from accounts.models import User
from accounts.serializers import UserSerializer
from ai.models import (
    GENERATION_HISTORY_MAX_PER_USER,
    AiStyleHistoryEntry,
    MorphAiGenerationEntry,
)
from ai.serializers import MorphAiGenerationSerializer
from bookings.models import Booking
from salons.models import FavoriteSalon
from subscriptions.services import build_me_payload
from wallet.serializers import WalletMeSerializer
from wallet.services.wallet_service import WalletService

HISTORY_PREVIEW_LIMIT = 8

_ACTIVE_BOOKING = {
    Booking.Status.PENDING,
    Booking.Status.ACCEPTED,
    Booking.Status.IN_PROGRESS,
}


def account_verified(user: User) -> bool:
    """Telefon OTP yoki haqiqiy email tasdiqlangan bo‘lsa galochka."""
    if (user.phone or "").strip():
        return True
    if is_internal_email(user.email):
        return False
    return user.email_verified_at is not None


def build_customer_dashboard(user: User, request: Request) -> dict[str, Any]:
    """Profil UI uchun identity + hamyon + Morph tarif + tarix + bronlar."""
    sub_payload = build_me_payload(user)
    wallet = WalletService.ensure_wallet(user)
    generations = list(
        MorphAiGenerationEntry.objects.filter(user=user).order_by("-created_at")[
            :HISTORY_PREVIEW_LIMIT
        ]
    )
    photo_count = MorphAiGenerationEntry.objects.filter(user=user).count()
    scan_count = AiStyleHistoryEntry.objects.filter(user=user).count()

    bookings = Booking.objects.filter(customer=user)
    upcoming = bookings.filter(status__in=_ACTIVE_BOOKING).count()
    history = bookings.exclude(status__in=_ACTIVE_BOOKING).count()

    sub = sub_payload.get("subscription") or {}
    plan = sub.get("plan") if isinstance(sub, dict) else None
    plan_name = None
    if isinstance(plan, dict):
        plan_name = plan.get("name_uz") or plan.get("name") or None

    return {
        "user": UserSerializer(user, context={"request": request}).data,
        "verified": account_verified(user),
        "wallet": WalletMeSerializer(wallet).data,
        "subscription": {
            "has_active": bool(sub_payload.get("has_active")),
            "plan_code": sub.get("plan_code") if isinstance(sub, dict) else None,
            "plan_name": plan_name,
            "badge": sub_payload.get("badge"),
            "days_remaining": sub_payload.get("days_remaining"),
            "morph_care": bool(sub_payload.get("morph_care")),
            "usage": sub_payload.get("usage") or {},
            "access": sub_payload.get("access") or {},
            "upgrade": sub_payload.get("upgrade"),
        },
        "morph": {
            "photo_count": photo_count,
            "photo_limit": GENERATION_HISTORY_MAX_PER_USER,
            "scan_count": scan_count,
            "history": MorphAiGenerationSerializer(
                generations,
                many=True,
                context={"request": request},
            ).data,
        },
        "mysaloon": {
            "upcoming_bookings": upcoming,
            "history_bookings": history,
            "favorites": FavoriteSalon.objects.filter(user=user).count(),
        },
    }
