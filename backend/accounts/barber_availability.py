"""Barber email/telefon bandligini tekshirish (signup oldidan)."""

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.phone_validation import validate_uz_mobile_phone
from accounts.throttles import BarberCheckThrottle
from barbers.models import Barber

from .models import User


def check_barber_email_available(email: str) -> tuple[bool, str | None]:
    v = (email or "").strip().lower()
    if not v or "@" not in v:
        return False, "Email noto'g'ri."
    if User.objects.filter(email__iexact=v).exists():
        return False, "Bu email mijoz akkauntida band."
    if Barber.objects.filter(email__iexact=v).exists():
        return False, "Bu email sartarosh akkauntida band."
    return True, None


def check_barber_phone_available(phone: str) -> tuple[bool, str | None]:
    normalized, err = validate_uz_mobile_phone(phone)
    if err:
        return False, err
    assert normalized is not None
    if User.objects.filter(phone=normalized).exists():
        return False, "Bu telefon mijoz akkauntida band — boshqa raqam kiriting."
    if Barber.objects.filter(phone=normalized).exists():
        return False, "Bu telefon boshqa sartaroshda ro'yxatdan o'tgan."
    return True, None


class BarberCheckAvailabilityView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [BarberCheckThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        phone = request.data.get("phone") or ""

        email_ok, email_hint = check_barber_email_available(email) if email else (True, None)
        phone_ok, phone_hint = check_barber_phone_available(phone)

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
