import os

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from barbers.models import Barber

from .models import User
from .phone_auth import (
    generate_otp_code,
    mark_otp_sent,
    normalize_uz_phone,
    phone_to_internal_email,
    resend_blocked,
    store_otp,
    verify_otp,
)
from .serializers import UserSerializer
from .sms_otp import is_sms_provider_configured, send_login_otp
from .throttles import AuthIPThrottle, PhoneSendThrottle, PhoneVerifyThrottle


def _expose_debug_code() -> bool:
    """SMS ulanmagan — kod ilovada; yoki DEBUG + OTP_EXPOSE_CODE (dev)."""
    if not is_sms_provider_configured():
        return True
    if not settings.DEBUG:
        return False
    return os.environ.get("OTP_EXPOSE_CODE", "").lower() in (
        "1",
        "true",
        "yes",
    )


def _issue_tokens(user: User) -> tuple[str, str]:
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)


def _get_or_create_user_by_phone(phone: str) -> tuple[User, bool]:
    user = User.objects.filter(phone=phone).first()
    if user:
        return user, False

    email = phone_to_internal_email(phone)
    if User.objects.filter(email__iexact=email).exists():
        user = User.objects.get(email__iexact=email)
        if not user.phone:
            user.phone = phone
            user.save(update_fields=["phone"])
        return user, False

    user = User(
        email=email,
        username=email,
        phone=phone,
        role=User.Role.USER,
        password=make_password(None),
    )
    user.save()
    return user, True


class PhoneSendCodeView(APIView):
    """POST { phone } — 4 xonali OTP yuborish (login = signup)."""

    permission_classes = [AllowAny]
    throttle_classes = [PhoneSendThrottle, AuthIPThrottle]

    def post(self, request):
        phone = normalize_uz_phone(request.data.get("phone"))
        if not phone:
            return Response({"detail": "Telefon raqami noto'g'ri."}, status=400)

        if Barber.objects.filter(phone=phone).exists() and not User.objects.filter(
            phone=phone
        ).exists():
            return Response(
                {
                    "detail": "Bu raqam sartarosh akkauntiga biriktirilgan. Sartarosh ilovasidan kiring.",
                },
                status=400,
            )

        if resend_blocked(phone):
            return Response(
                {"detail": "Yangi kod uchun biroz kuting."},
                status=429,
            )

        code = generate_otp_code()
        store_otp(phone, code)
        send_login_otp(phone, code)
        mark_otp_sent(phone)

        body: dict[str, str] = {
            "detail": (
                "Tasdiq kodi yuborildi."
                if is_sms_provider_configured()
                else "Tasdiq kodi tayyor — quyidagi kodni kiriting (SMS hali ulanmagan)."
            ),
            "phone": phone,
            "delivery": "sms" if is_sms_provider_configured() else "app",
        }
        if _expose_debug_code():
            body["debug_code"] = code
        return Response(body)


def _auth_success_body(user: User, is_new: bool = False) -> dict:
    access, refresh = _issue_tokens(user)
    return {
        "access": access,
        "refresh": refresh,
        "user": UserSerializer(user).data,
        "is_new_user": is_new,
    }


class PhoneCheckView(APIView):
    """POST { phone } — parol o'rnatilganmi (login yo'lini tanlash uchun)."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        phone = normalize_uz_phone(request.data.get("phone"))
        if not phone:
            return Response({"detail": "Telefon raqami noto'g'ri."}, status=400)

        user = User.objects.filter(phone=phone, role=User.Role.USER).first()
        return Response(
            {
                "phone": phone,
                "has_password": bool(user and user.has_usable_password()),
                "registered": user is not None,
            }
        )


class PhonePasswordLoginView(APIView):
    """POST { phone, password } — parol bilan tez kirish."""

    permission_classes = [AllowAny]
    throttle_classes = [PhoneVerifyThrottle, AuthIPThrottle]

    def post(self, request):
        phone = normalize_uz_phone(request.data.get("phone"))
        password = request.data.get("password") or ""
        if not phone:
            return Response({"detail": "Telefon raqami noto'g'ri."}, status=400)
        if not password:
            return Response({"detail": "Parolni kiriting."}, status=400)

        user = User.objects.filter(phone=phone, role=User.Role.USER).first()
        if not user or not user.has_usable_password() or not user.check_password(password):
            return Response(
                {"detail": "Telefon yoki parol noto'g'ri."},
                status=400,
            )
        if not user.is_active:
            return Response({"detail": "Akkaunt faol emas."}, status=403)

        User.objects.filter(pk=user.pk).update(last_login=timezone.now())
        from wallet.services.wallet_service import WalletService

        WalletService.ensure_wallet(user)
        return Response(_auth_success_body(user, is_new=False))


class PhoneSetPasswordView(APIView):
    """POST { password } — OTP dan keyin yoki sozlamalardan (birinchi marta)."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        user = request.user
        if user.has_usable_password():
            return Response(
                {"detail": "Parol allaqachon o'rnatilgan. Sozlamalardan o'zgartiring."},
                status=400,
            )
        password = (request.data.get("password") or "").strip()
        if len(password) < 8:
            return Response(
                {"detail": "Parol kamida 8 belgidan iborat bo'lishi kerak."},
                status=400,
            )
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"detail": "Parol saqlandi.", "user": UserSerializer(user).data})


class PhoneChangePasswordView(APIView):
    """POST { old_password, new_password } — sozlamalardan parolni yangilash."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        user = request.user
        if not user.has_usable_password():
            return Response(
                {"detail": "Avval parol o'rnating."},
                status=400,
            )
        old_password = request.data.get("old_password") or ""
        new_password = (request.data.get("new_password") or "").strip()
        if not user.check_password(old_password):
            return Response({"detail": "Joriy parol noto'g'ri."}, status=400)
        if len(new_password) < 8:
            return Response(
                {"detail": "Yangi parol kamida 8 belgidan iborat bo'lishi kerak."},
                status=400,
            )
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"detail": "Parol yangilandi.", "user": UserSerializer(user).data})


class PhoneVerifyView(APIView):
    """POST { phone, code } -> { access, refresh, user, is_new_user }."""

    permission_classes = [AllowAny]
    throttle_classes = [PhoneVerifyThrottle, AuthIPThrottle]

    def post(self, request):
        phone = normalize_uz_phone(request.data.get("phone"))
        code = (request.data.get("code") or "").strip()
        if not phone:
            return Response({"detail": "Telefon raqami noto'g'ri."}, status=400)
        if len(code) != 4 or not code.isdigit():
            return Response({"detail": "4 raqamli kodni kiriting."}, status=400)

        ok, err = verify_otp(phone, code)
        if not ok:
            return Response({"detail": err}, status=400)

        user, is_new = _get_or_create_user_by_phone(phone)
        if not user.is_active:
            return Response({"detail": "Akkaunt faol emas."}, status=403)

        User.objects.filter(pk=user.pk).update(last_login=timezone.now())
        from wallet.services.wallet_service import WalletService

        WalletService.ensure_wallet(user)
        return Response(_auth_success_body(user, is_new=is_new))
