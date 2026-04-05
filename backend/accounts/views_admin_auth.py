import jwt
from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .admin_auth import encode_admin_tokens
from .models import AdminAccount
from .permissions import IsAdmin
from .throttles import AuthIPThrottle


class AdminTokenView(APIView):
    """POST { email, password } -> { access, refresh } (admin JWT)."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        account = AdminAccount.objects.filter(email__iexact=email, is_active=True).first()
        if not account or not account.check_password(password):
            return Response(
                {"detail": "Noto‘g‘ri email yoki parol."},
                status=401,
            )
        access, refresh = encode_admin_tokens(account.id)
        AdminAccount.objects.filter(pk=account.pk).update(last_login=timezone.now())
        return Response({"access": access, "refresh": refresh})


class AdminTokenRefreshView(APIView):
    """POST { refresh } -> { access, refresh }."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        raw = request.data.get("refresh") or ""
        if not raw:
            return Response({"detail": "Refresh token required."}, status=400)
        try:
            payload = jwt.decode(
                raw,
                settings.JWT_HS256_SIGNING_KEY,
                algorithms=["HS256"],
            )
        except jwt.PyJWTError:
            return Response({"detail": "Token invalid."}, status=401)
        if payload.get("type") != "admin_refresh":
            return Response({"detail": "Wrong token type."}, status=401)
        admin_id = payload.get("admin_id")
        account = AdminAccount.objects.filter(pk=admin_id, is_active=True).first()
        if not account:
            return Response({"detail": "Admin not found."}, status=401)
        access, refresh = encode_admin_tokens(account.id)
        return Response({"access": access, "refresh": refresh})


class AdminMeView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        a = request.user.admin_account
        return Response({"email": a.email, "role": "ADMIN"})
