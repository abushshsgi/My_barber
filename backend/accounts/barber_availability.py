"""Barber email/telefon bandligini tekshirish (signup oldidan)."""

from __future__ import annotations

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.phone_validation import validate_uz_mobile_phone
from accounts.throttles import BarberCheckThrottle
from barbers.barber_auth import BarberJWTAuthentication, BarberPrincipal
from barbers.models import Barber

from .models import User


def _normalize_phone_allowlist(raw) -> set[str]:
    if not raw:
        return set()
    items = raw if isinstance(raw, list) else [raw]
    out: set[str] = set()
    for item in items:
        if not item:
            continue
        normalized, err = validate_uz_mobile_phone(str(item).strip())
        if normalized and not err:
            out.add(normalized)
    return out


def check_barber_email_available(
    email: str,
    *,
    exclude_barber_id: int | None = None,
) -> tuple[bool, str | None]:
    v = (email or "").strip().lower()
    if not v or "@" not in v:
        return False, "Email noto'g'ri."
    if User.objects.filter(email__iexact=v).exists():
        return False, "Bu email mijoz akkauntida band."
    barber_qs = Barber.objects.filter(email__iexact=v)
    if exclude_barber_id is not None:
        barber_qs = barber_qs.exclude(pk=exclude_barber_id)
    if barber_qs.exists():
        return False, "Bu email sartarosh akkauntida band."
    return True, None


def check_barber_phone_available(
    phone: str,
    *,
    exclude_barber_id: int | None = None,
    also_allow_phones: set[str] | None = None,
) -> tuple[bool, str | None]:
    normalized, err = validate_uz_mobile_phone(phone)
    if err:
        return False, err
    assert normalized is not None
    if also_allow_phones and normalized in also_allow_phones:
        return True, None
    if User.objects.filter(phone=normalized).exists():
        return False, "Bu telefon mijoz akkauntida band — boshqa raqam kiriting."
    barber_qs = Barber.objects.filter(phone=normalized)
    if exclude_barber_id is not None:
        barber_qs = barber_qs.exclude(pk=exclude_barber_id)
    if barber_qs.exists():
        return False, "Bu telefon boshqa sartaroshda ro'yxatdan o'tgan."
    return True, None


class BarberCheckAvailabilityView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [BarberJWTAuthentication]
    throttle_classes = [BarberCheckThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        phone = (request.data.get("phone") or "").strip()
        also_allow_phones = _normalize_phone_allowlist(
            request.data.get("also_allow_phones") or request.data.get("also_allow_phone")
        )

        exclude_barber_id: int | None = None
        if isinstance(request.user, BarberPrincipal):
            exclude_barber_id = request.user.barber.pk

        email_ok, email_hint = (
            check_barber_email_available(email, exclude_barber_id=exclude_barber_id)
            if email
            else (True, None)
        )
        phone_ok, phone_hint = (
            check_barber_phone_available(
                phone,
                exclude_barber_id=exclude_barber_id,
                also_allow_phones=also_allow_phones,
            )
            if phone
            else (True, None)
        )

        hints: list[str] = []
        if email_hint:
            hints.append(email_hint)
        if phone_hint:
            hints.append(phone_hint)

        return Response(
            {
                "email_available": email_ok,
                "phone_available": phone_ok,
                "hints": hints,
            }
        )
