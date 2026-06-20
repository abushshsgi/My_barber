import os

from django.db import transaction
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.customer_email import send_customer_email_verification
from accounts.email_otp import (
    OTP_RESEND_COOLDOWN_SECONDS,
    clear_pending_email,
    generate_email_otp,
    get_pending_email,
    mark_email_otp_sent,
    resend_blocked,
    resend_seconds_remaining,
    set_pending_email,
    store_email_otp,
    verify_email_otp,
)
from accounts.email_utils import normalize_customer_email
from accounts.email_verification import unsign_customer_email_token
from accounts.models import User
from accounts.serializers import UserSerializer
from barbers.models import Barber


def _expose_debug_code() -> bool:
    from django.conf import settings

    if settings.DEBUG:
        return os.environ.get("OTP_EXPOSE_CODE", "").lower() in ("1", "true", "yes")
    return False


def _email_taken(email: str, user: User) -> bool:
    if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
        return True
    return Barber.objects.filter(email__iexact=email).exists()


class UserEmailSendCodeView(APIView):
    """POST { email } — yangi emailga tasdiq kodi yuborish."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = normalize_customer_email(request.data.get("email"))
        if not email:
            return Response({"detail": "To'g'ri email manzilini kiriting."}, status=400)
        if _email_taken(email, request.user):
            return Response({"detail": "Bu email allaqachon band."}, status=400)

        user_id = request.user.pk
        pending = get_pending_email(user_id)
        if pending and pending != email and resend_blocked(user_id):
            retry_after = resend_seconds_remaining(user_id) or OTP_RESEND_COOLDOWN_SECONDS
            return Response(
                {"detail": "Yangi kod uchun biroz kuting.", "retry_after": retry_after},
                status=429,
            )
        if pending == email and resend_blocked(user_id):
            retry_after = resend_seconds_remaining(user_id) or OTP_RESEND_COOLDOWN_SECONDS
            return Response(
                {"detail": "Yangi kod uchun biroz kuting.", "retry_after": retry_after},
                status=429,
            )

        code = generate_email_otp()
        set_pending_email(user_id, email)
        store_email_otp(user_id, code)
        ok, err = send_customer_email_verification(user_id, email, code)
        mark_email_otp_sent(user_id)

        body = {
            "detail": "Tasdiq kodi emailga yuborildi." if ok else "Kod yaratildi, lekin email yuborilmadi.",
            "email": email,
            "resend_after": OTP_RESEND_COOLDOWN_SECONDS,
            "delivery": "email" if ok else "app",
        }
        if not ok and err:
            body["email_error"] = err
        if _expose_debug_code() or not ok:
            body["debug_code"] = code
        return Response(body)


class UserEmailVerifyView(APIView):
    """POST { code } — OTP bilan emailni tasdiqlash."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = (request.data.get("code") or "").strip()
        user = request.user
        pending = get_pending_email(user.pk)
        if not pending:
            return Response({"detail": "Avval email manzilini kiriting va kod so'rang."}, status=400)

        ok, err = verify_email_otp(user.pk, code)
        if not ok:
            return Response({"detail": err}, status=400)
        if _email_taken(pending, user):
            clear_pending_email(user.pk)
            return Response({"detail": "Bu email allaqachon band."}, status=400)

        with transaction.atomic():
            user.email = pending
            user.username = pending
            user.email_verified_at = timezone.now()
            user.save(update_fields=["email", "username", "email_verified_at"])
        clear_pending_email(user.pk)
        return Response(
            {
                "detail": "Email tasdiqlandi.",
                "user": UserSerializer(user, context={"request": request}).data,
            }
        )


class UserEmailVerifyLinkView(APIView):
    """GET ?token= — havola orqali email tasdiqlash."""

    permission_classes = [AllowAny]

    def get(self, request):
        token = (request.query_params.get("token") or "").strip()
        parsed = unsign_customer_email_token(token)
        if not parsed:
            return Response({"detail": "Havola muddati tugagan yoki noto'g'ri."}, status=400)

        user_id, email = parsed
        try:
            user = User.objects.get(pk=user_id, role=User.Role.USER)
        except User.DoesNotExist:
            return Response({"detail": "Foydalanuvchi topilmadi."}, status=404)

        if _email_taken(email, user):
            return Response({"detail": "Bu email allaqachon band."}, status=400)

        with transaction.atomic():
            user.email = email
            user.username = email
            user.email_verified_at = timezone.now()
            user.save(update_fields=["email", "username", "email_verified_at"])
        clear_pending_email(user.pk)
        return Response(
            {
                "detail": "Email tasdiqlandi.",
                "user": UserSerializer(user, context={"request": request}).data,
            }
        )
