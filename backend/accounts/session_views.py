from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.models import UserSession
from accounts.session_service import (
    current_session_jti_from_request,
    is_refresh_jti_revoked,
    revoke_other_sessions,
    rotate_session_jti,
)


class UserSessionSerializerMixin:
    def _serialize(self, session: UserSession, current_jti: str | None) -> dict:
        return {
            "id": session.id,
            "device_name": session.device_name or "Noma'lum qurilma",
            "platform": session.platform or "unknown",
            "client_kind": session.client_kind or "web",
            "app_version": session.app_version or "",
            "ip_address": session.ip_address,
            "last_seen_at": session.last_seen_at.isoformat(),
            "created_at": session.created_at.isoformat(),
            "is_current": bool(current_jti and session.refresh_jti == current_jti),
        }


class UserSessionListView(APIView, UserSessionSerializerMixin):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_jti = current_session_jti_from_request(request)
        qs = UserSession.objects.filter(user=request.user, revoked_at__isnull=True).order_by(
            "-last_seen_at"
        )
        data = [self._serialize(s, current_jti) for s in qs]
        return Response(data)


class UserSessionRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk: int):
        current_jti = current_session_jti_from_request(request)
        try:
            session = UserSession.objects.get(pk=pk, user=request.user, revoked_at__isnull=True)
        except UserSession.DoesNotExist:
            return Response({"detail": "Sessiya topilmadi."}, status=404)
        if current_jti and session.refresh_jti == current_jti:
            return Response(
                {
                    "detail": (
                        "Joriy sessiyani bu yerda bekor qilib bo'lmaydi. "
                        "Chiqish tugmasidan foydalaning."
                    )
                },
                status=400,
            )
        session.revoked_at = timezone.now()
        session.save(update_fields=["revoked_at"])
        from accounts.session_service import revoke_refresh_jti

        revoke_refresh_jti(session.refresh_jti)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserSessionRevokeOthersView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_jti = current_session_jti_from_request(request)
        count = revoke_other_sessions(request.user, current_jti)
        return Response({"detail": f"{count} ta sessiya bekor qilindi.", "revoked_count": count})


class UserTokenRefreshView(TokenRefreshView):
    """SimpleJWT refresh — bekor qilingan / o'chirilgan sessiyalarni 401 bilan rad etadi."""

    def post(self, request, *args, **kwargs):
        from django.contrib.auth import get_user_model
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh_raw = request.data.get("refresh")
        old_jti = None
        if isinstance(refresh_raw, str) and refresh_raw.strip():
            try:
                old_token = RefreshToken(refresh_raw.strip())
                old_jti = str(old_token.get("jti", "") or "") or None
                if is_refresh_jti_revoked(old_jti):
                    return Response({"detail": "Sessiya bekor qilingan. Qayta kiring."}, status=401)
            except Exception:
                pass

        try:
            response = super().post(request, *args, **kwargs)
        except (InvalidToken, TokenError, get_user_model().DoesNotExist) as exc:
            return Response(
                {"detail": getattr(exc, "detail", None) or "Sessiya yaroqsiz. Qayta kiring."},
                status=401,
            )
        except Exception as exc:
            # SimpleJWT ba'zan Serializer.validate ichida DoesNotExist ni ushlamaydi.
            if exc.__class__.__name__ == "DoesNotExist" or "matching query does not exist" in str(exc):
                return Response({"detail": "Sessiya yaroqsiz. Qayta kiring."}, status=401)
            raise

        if response.status_code == 200 and old_jti:
            new_refresh = response.data.get("refresh")
            if isinstance(new_refresh, str) and new_refresh.strip():
                try:
                    new_jti = str(RefreshToken(new_refresh.strip()).get("jti", "") or "") or None
                    rotate_session_jti(old_jti, new_jti)
                except Exception:
                    pass
        return response
