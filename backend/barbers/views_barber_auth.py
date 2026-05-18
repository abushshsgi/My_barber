import concurrent.futures
import jwt
from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.throttles import AuthIPThrottle
from barbers.barber_auth import encode_barber_tokens
from barbers.barber_email import send_barber_email_verification_with_timeout
from barbers.email_verification import unsign_barber_email_token
from barbers.models import Barber
from barbers.permissions import IsBarber
from barbers.readiness import build_onboarding_status_payload, compute_barber_readiness


def _barber_me_salon_fields(b: Barber):
    """Panel: salon egasi vs ishchini ajratish (BarberOnboarding bilan mos)."""
    from salons.models import Salon, SalonMembership

    owns_salon = Salon.objects.filter(owner_barber=b).exists()
    active_mem = SalonMembership.objects.filter(
        barber=b,
        invite_state=SalonMembership.InviteState.ACTIVE,
    ).select_related("salon").first()
    owner_mem = (
        SalonMembership.objects.filter(barber=b, salon__owner_barber=b)
        .select_related("salon")
        .first()
    )
    active_salon_id = (
        active_mem.salon_id if active_mem else (owner_mem.salon_id if owner_mem else None)
    )
    return owns_salon, active_salon_id


class BarberTokenView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        if email:
            has_user = User.objects.filter(email__iexact=email).exists()
            has_barber = Barber.objects.filter(email__iexact=email).exists()
            if has_user and not has_barber:
                return Response(
                    {
                        "detail": "Bu email mijoz akkauntiga tegishli. Sartarosh panelidan kirish mumkin emas — mijoz ilovasidan kiring.",
                    },
                    status=401,
                )
        b = Barber.objects.filter(email__iexact=email, is_active=True).first()
        if not b or not b.check_password(password):
            return Response({"detail": "Noto‘g‘ri email yoki parol."}, status=401)
        access, refresh = encode_barber_tokens(b.id)
        Barber.objects.filter(pk=b.pk).update(last_login=timezone.now())
        return Response({"access": access, "refresh": refresh})


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
        b = request.user.barber
        full_name = request.data.get("full_name")
        phone = request.data.get("phone")
        if full_name is not None:
            b.full_name = str(full_name).strip()
        if phone is not None:
            b.phone = str(phone).strip()
        avatar = request.FILES.get("avatar")
        if avatar is not None:
            b.avatar = avatar
        try:
            b.save()
        except Exception as e:
            return Response({"detail": str(e)}, status=400)
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
        return Response(payload)
