import concurrent.futures
import jwt
from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.phone_validation import validate_uz_mobile_phone
from accounts.throttles import AuthIPThrottle
from barbers.barber_auth import encode_barber_tokens, validate_and_rotate_barber_refresh
from barbers.barber_email import (
    barber_has_verifiable_email,
    maybe_schedule_verification_email_once,
    send_barber_email_verification_with_timeout,
)
from barbers.email_verification import unsign_barber_email_token
from barbers.models import Barber
from barbers.permissions import IsBarber
from barbers.readiness import build_onboarding_status_payload, compute_barber_readiness


def _barber_me_salon_fields(b: Barber):
    """Panel: salon egasi vs ishchini ajratish (BarberOnboarding bilan mos)."""
    from salons.models import Salon, SalonMembership

    owns_salon = Salon.objects.filter(owner_barber=b).exists()
    owned_salon = (
        Salon.objects.filter(owner_barber=b).order_by("-id").values_list("id", flat=True).first()
    )
    active_mem = SalonMembership.objects.filter(
        barber=b,
        invite_state=SalonMembership.InviteState.ACTIVE,
    ).select_related("salon").first()
    owner_mem = (
        SalonMembership.objects.filter(barber=b, salon__owner_barber=b)
        .select_related("salon")
        .first()
    )
    # Egasi boshqa salonda ishchi bo'lsa ham panel o'z saloniga yo'nalsin.
    if owned_salon:
        active_salon_id = owned_salon
    elif active_mem:
        active_salon_id = active_mem.salon_id
    elif owner_mem:
        active_salon_id = owner_mem.salon_id
    else:
        active_salon_id = None
    return owns_salon, active_salon_id


def _resolve_barber_by_identifier(identifier: str) -> tuple[Barber | None, str | None, int | None]:
    identifier = (identifier or "").strip()
    if not identifier:
        return None, "Email/telefon va parol kiriting.", 400
    if "@" in identifier:
        email = identifier.lower()
        has_user = User.objects.filter(email__iexact=email).exists()
        has_barber = Barber.objects.filter(email__iexact=email).exists()
        if has_user and not has_barber:
            return (
                None,
                "Bu email mijoz akkauntiga tegishli. Sartarosh panelidan kirish mumkin emas — mijoz ilovasidan kiring.",
                401,
            )
        return Barber.objects.filter(email__iexact=email, is_active=True).first(), None, None

    normalized, err = validate_uz_mobile_phone(identifier)
    if err:
        return None, err, 400
    assert normalized is not None
    return Barber.objects.filter(phone=normalized, is_active=True).first(), None, None


class BarberTokenView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        identifier = (request.data.get("email") or request.data.get("phone") or "").strip()
        password = request.data.get("password") or ""
        if not identifier or not password:
            return Response({"detail": "Email/telefon va parol kiriting."}, status=400)

        barber, err, status_code = _resolve_barber_by_identifier(identifier)
        if err:
            return Response({"detail": err}, status=status_code or 400)

        if not barber or not barber.check_password(password):
            return Response({"detail": "Noto'g'ri email/telefon yoki parol."}, status=401)
        access, refresh = encode_barber_tokens(barber.id)
        Barber.objects.filter(pk=barber.pk).update(last_login=timezone.now())
        return Response({"access": access, "refresh": refresh})


class LegacyBarberSendOtpEmailCompatView(APIView):
    """
    Legacy partner build compatibility.

    Old frontend occasionally calls /accounts/auth/barber/send-otp/email/.
    We accept POST and return a non-405 response.
    """

    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        # If old client sent password together with identifier, allow direct sign in.
        identifier = (request.data.get("email") or request.data.get("phone") or "").strip()
        password = request.data.get("password") or ""
        if identifier and password:
            barber, err, status_code = _resolve_barber_by_identifier(identifier)
            if err:
                return Response({"detail": err}, status=status_code or 400)
            if not barber or not barber.check_password(password):
                return Response({"detail": "Noto'g'ri email/telefon yoki parol."}, status=401)
            access, refresh = encode_barber_tokens(barber.id)
            Barber.objects.filter(pk=barber.pk).update(last_login=timezone.now())
            return Response({"access": access, "refresh": refresh})

        # Fallback: avoid 405 for stale clients and guide upgrade.
        return Response(
            {
                "detail": "Auth endpoint yangilangan. Iltimos sahifani qayta yuklang (Ctrl+F5).",
                "legacy_endpoint": True,
            },
            status=200,
        )


class BarberTokenRefreshView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        raw = request.data.get("refresh") or ""
        if not raw:
            return Response({"detail": "Refresh token required."}, status=400)
        try:
            payload = jwt.decode(
                raw, settings.JWT_HS256_SIGNING_KEY, algorithms=["HS256"]
            )
        except jwt.PyJWTError:
            return Response({"detail": "Token invalid."}, status=401)
        if payload.get("type") != "barber_refresh":
            return Response({"detail": "Wrong token type."}, status=401)
        bid = payload.get("barber_id")
        jti = payload.get("jti")
        if not validate_and_rotate_barber_refresh(bid, jti):
            return Response({"detail": "Refresh token invalid or expired."}, status=401)
        b = Barber.objects.filter(pk=bid, is_active=True).first()
        if not b:
            return Response({"detail": "Barber not found."}, status=401)
        access, refresh = encode_barber_tokens(b.id)
        return Response({"access": access, "refresh": refresh})


class BarberEmailVerifyView(APIView):
    """Email tasdiqlash (havola tokeni)."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        token = (request.data.get("token") or request.query_params.get("token") or "").strip()
        if not token:
            return Response({"detail": "token majburiy."}, status=400)
        bid = unsign_barber_email_token(token)
        if bid is None:
            return Response({"detail": "Token yaroqsiz yoki muddati o‘tgan."}, status=400)
        b = Barber.objects.filter(pk=bid, is_active=True).first()
        if not b:
            return Response({"detail": "Barber topilmadi."}, status=400)
        if b.email_verified_at is None:
            Barber.objects.filter(pk=b.pk).update(email_verified_at=timezone.now())
        return Response({"detail": "Email tasdiqlandi.", "barber_id": b.id})


class BarberEmailResendView(APIView):
    permission_classes = [IsBarber]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        b = request.user.barber
        if b.email_verified_at is not None:
            return Response({"detail": "Email allaqachon tasdiqlangan."}, status=400)
        if not barber_has_verifiable_email(b):
            return Response(
                {
                    "detail": (
                        "Telefon orqali ro‘yxatdan o‘tgansiz — email tasdiqlash shart emas. "
                        "Aktivatsiya sahifasida keyingi qadamga o‘ting."
                    ),
                },
                status=400,
            )
        try:
            ok, err = send_barber_email_verification_with_timeout(b, timeout=25)
        except concurrent.futures.TimeoutError:
            return Response(
                {
                    "detail": (
                        "Email yuborish vaqt tugadi (SMTP blok yoki javob sodir). "
                        "Production uchun RESEND_API_KEY qo‘shing (Railway-da SMTP ulanishi ko‘pincha ishlamaydi) "
                        "yoki EMAIL_HOST/portni tekshiring."
                    ),
                },
                status=503,
            )
        if not ok:
            return Response(
                {
                    "detail": (
                        "Xat yuborilmadi. SMTP ulanmayotgan/Railway bo‘lsa, Resend uchun "
                        "RESEND_API_KEY o‘rnating (mysaloon.uz domeni Resend-da tasdiqlangan bo‘lishi kerak); "
                        "aks holda EMAIL_HOST / EMAIL_PORT / EMAIL_HOST_USER / EMAIL_HOST_PASSWORD. "
                        "FRONTEND_BARBER_ORIGIN=https://partner.mysaloon.uz bo‘lishi kerak."
                    ),
                    "error": (err or "")[:400],
                },
                status=503,
            )
        return Response({"detail": "Xat yuborildi. Pochtangizdagi havolani bosing."})


class BarberMeView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        b = request.user.barber
        owns_salon, active_salon_id = _barber_me_salon_fields(b)
        r = compute_barber_readiness(b)
        avatar_url = ""
        if b.avatar:
            avatar_url = request.build_absolute_uri(b.avatar.url)
        return Response(
            {
                "id": b.id,
                "email": b.email,
                "full_name": b.full_name,
                "phone": b.phone,
                "avatar": avatar_url,
                "role": "BARBER",
                "work_mode": b.work_mode,
                "onboarding_completed": bool(b.onboarding_completed_at),
                "owns_salon": owns_salon,
                "active_salon_id": active_salon_id,
                "email_verified_at": b.email_verified_at.isoformat() if b.email_verified_at else None,
                "fully_ready": r.fully_ready,
            }
        )

    def patch(self, request):
        """
        Barber panel: allow updating basic profile fields.
        Supports both JSON and multipart (avatar upload).
        """
        from django.db import IntegrityError
        from rest_framework.exceptions import ValidationError

        b = request.user.barber
        full_name = request.data.get("full_name")
        phone = request.data.get("phone")
        region = request.data.get("region")
        if full_name is not None:
            b.full_name = str(full_name).strip()
        if phone is not None:
            normalized, err = validate_uz_mobile_phone(str(phone).strip())
            if err:
                raise ValidationError({"phone": err})
            assert normalized is not None
            if User.objects.filter(phone=normalized).exists():
                raise ValidationError({"phone": "Bu telefon mijoz akkauntida band."})
            if (
                Barber.objects.filter(phone=normalized)
                .exclude(pk=b.pk)
                .exists()
            ):
                raise ValidationError({"phone": "Bu telefon boshqa sartaroshda band."})
            b.phone = normalized
        if region is not None:
            b.region = str(region).strip()
        avatar = request.FILES.get("avatar")
        if avatar is not None:
            b.avatar = avatar
        try:
            b.save()
        except IntegrityError:
            raise ValidationError({"detail": "Telefon yoki email allaqachon band."}) from None
        owns_salon, active_salon_id = _barber_me_salon_fields(b)
        r = compute_barber_readiness(b)
        avatar_url = ""
        if b.avatar:
            avatar_url = request.build_absolute_uri(b.avatar.url)
        return Response(
            {
                "id": b.id,
                "email": b.email,
                "full_name": b.full_name,
                "phone": b.phone,
                "avatar": avatar_url,
                "role": "BARBER",
                "work_mode": b.work_mode,
                "onboarding_completed": bool(b.onboarding_completed_at),
                "owns_salon": owns_salon,
                "active_salon_id": active_salon_id,
                "email_verified_at": b.email_verified_at.isoformat() if b.email_verified_at else None,
                "fully_ready": r.fully_ready,
            }
        )


class BarberOnboardingStatusView(APIView):
    """
    Barber panel uchun onboarding gate: qaysi sahifaga majburan yo'naltirish kerakligini
    backend hisoblaydi (source of truth).
    """

    permission_classes = [IsBarber]

    def get(self, request):
        b: Barber = request.user.barber
        payload = build_onboarding_status_payload(b)
        if payload["is_complete"] and not b.onboarding_completed_at:
            Barber.objects.filter(pk=b.pk).update(onboarding_completed_at=timezone.now())
        maybe_schedule_verification_email_once(b.pk)
        return Response(payload)
