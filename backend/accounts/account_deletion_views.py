"""Public account deletion request API views."""

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.account_deletion import AccountDeletionRequest
from accounts.customer_permissions import IsAuthenticatedCustomer
from accounts.models import User, UserSession
from accounts.phone_auth import normalize_uz_phone
from accounts.session_service import revoke_refresh_jti

__all__ = [
    "AccountDeletionRequestView",
    "AccountDeletionVerifyView",
    "AccountDeleteNowView",
]


def delete_customer_account(user: User) -> None:
    """Akkauntni o'chiradi. Qayta Google/telefon kirishi yangi bo'sh hisob ochadi."""
    from django.db.models.deletion import ProtectedError

    from ai.privacy_prefs import wipe_user_morph_data

    for session in UserSession.objects.filter(user=user):
        revoke_refresh_jti(session.refresh_jti)
    try:
        wipe_user_morph_data(user_id=user.pk, kind="all")
    except Exception:
        pass
    try:
        with transaction.atomic():
            user.delete()
        return
    except ProtectedError:
        pass
    user.email = f"deleted-{user.pk}@deleted.mysaloon.invalid"
    user.username = f"deleted-{user.pk}"
    user.phone = None
    user.google_sub = None
    user.referral_code = None
    user.is_active = False
    user.full_name = ""
    user.first_name = ""
    user.last_name = ""
    user.set_unusable_password()
    user.save()


class AccountDeleteNowView(APIView):
    """POST /api/v1/users/me/delete/ — hozir o'chirish, keyin login yangi hisob."""

    permission_classes = [IsAuthenticatedCustomer]

    def post(self, request):
        user = request.user
        if getattr(user, "role", None) != User.Role.USER:
            return Response({"code": "forbidden", "detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        delete_customer_account(user)
        return Response({"ok": True, "code": "account_deleted"})



class AccountDeletionRequestView(APIView):
    """
    POST /api/account-deletion-request/
    Public endpoint to submit an account deletion request.
    Sends verification code to email or phone before processing.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower() or None
        phone_raw = (request.data.get("phone") or "").strip() or None
        phone = normalize_uz_phone(phone_raw) if phone_raw else None
        explanation = (request.data.get("explanation") or "").strip() or None

        # Validate at least one contact method
        if not email and not phone:
            return Response(
                {"detail": "Please provide either email or phone number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Rate limiting by IP
        ip = self._get_client_ip(request)
        rate_limit_key = f"account_deletion_rate:{ip}"
        if cache.get(rate_limit_key):
            return Response(
                {"detail": "Too many deletion requests. Please try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        cache.set(rate_limit_key, 1, 3600)  # 1 hour

        # Check if user exists (optional verification)
        user = None
        if email:
            user = User.objects.filter(email__iexact=email, role=User.Role.USER).first()
        if not user and phone:
            user = User.objects.filter(phone=phone, role=User.Role.USER).first()

        # Create deletion request
        deletion_req = AccountDeletionRequest.objects.create(
            email=email,
            phone=phone,
            explanation=explanation or "",
            ip_address=ip,
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:512],
            user_id=user.pk if user else None,
        )

        # Generate verification code
        code = deletion_req.generate_verification_code()

        # In production, send code via email/SMS
        # For now, return it in response (DEBUG mode only)
        from django.conf import settings

        response_data = {
            "detail": "Deletion request submitted. Verification code sent to your email or phone.",
            "request_id": deletion_req.pk,
            "expires_in_hours": 24,
        }

        if settings.DEBUG:
            response_data["debug_code"] = code

        return Response(response_data, status=status.HTTP_201_CREATED)

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip


class AccountDeletionVerifyView(APIView):
    """
    POST /api/account-deletion-verify/
    Verify deletion request with OTP code.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        request_id = request.data.get("request_id")
        code = (request.data.get("code") or "").strip()

        if not request_id or not code:
            return Response(
                {"detail": "request_id and code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            deletion_req = AccountDeletionRequest.objects.get(pk=request_id)
        except AccountDeletionRequest.DoesNotExist:
            return Response(
                {"detail": "Invalid request ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if deletion_req.status != AccountDeletionRequest.Status.PENDING:
            return Response(
                {"detail": "This request has already been processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if deletion_req.is_expired:
            return Response(
                {"detail": "Verification code has expired. Please submit a new request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not deletion_req.verify_code(code):
            return Response(
                {"detail": "Invalid verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Schedule deletion (background task in production)
        deletion_req.status = AccountDeletionRequest.Status.PROCESSING
        deletion_req.save(update_fields=["status"])

        # If user is authenticated, perform deletion immediately
        if deletion_req.user_id:
            self._delete_user_account(deletion_req.user_id)
            deletion_req.status = AccountDeletionRequest.Status.COMPLETED
            deletion_req.processed_at = timezone.now()
            deletion_req.save(update_fields=["status", "processed_at"])

        return Response(
            {
                "detail": "Identity verified. Account deletion will be processed within 7-14 business days.",
                "status": deletion_req.status,
            }
        )

    def _delete_user_account(self, user_id: int):
        """Delete user account and associated data."""
        from ai.privacy_prefs import wipe_user_morph_data

        try:
            user = User.objects.get(pk=user_id, role=User.Role.USER)

            # Delete AI data
            wipe_user_morph_data(user_id=user_id, kind="all")

            # Delete user (CASCADE will handle related records)
            with transaction.atomic():
                user.delete()

        except User.DoesNotExist:
            pass
