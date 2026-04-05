"""JWT auth for platform admins (AdminAccount), separate from User SimpleJWT."""

from __future__ import annotations

import jwt
from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from accounts.models import AdminAccount


class AdminPrincipal:
    """DRF request.user when authenticated via admin_access JWT."""

    is_authenticated = True
    is_anonymous = False
    is_staff = False
    is_superuser = False

    def __init__(self, account: AdminAccount):
        self.admin_account = account
        self.pk = account.pk
        self.id = account.pk

    def __str__(self) -> str:
        return f"Admin({self.admin_account.email})"


class AdminJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth.startswith("Bearer "):
            return None
        raw = auth[7:].strip()
        if not raw:
            return None
        try:
            payload = jwt.decode(
                raw,
                settings.JWT_HS256_SIGNING_KEY,
                algorithms=["HS256"],
            )
        except jwt.PyJWTError:
            return None
        if payload.get("type") != "admin_access":
            return None
        admin_id = payload.get("admin_id")
        if not admin_id:
            return None
        try:
            account = AdminAccount.objects.get(pk=admin_id, is_active=True)
        except AdminAccount.DoesNotExist:
            raise AuthenticationFailed("Admin not found or inactive.")
        return (AdminPrincipal(account), None)


def encode_admin_tokens(admin_id: int) -> tuple[str, str]:
    from datetime import timedelta

    sj = getattr(settings, "SIMPLE_JWT", {})
    access_delta = sj.get("ACCESS_TOKEN_LIFETIME")
    refresh_delta = sj.get("REFRESH_TOKEN_LIFETIME")
    if access_delta is None or refresh_delta is None:
        access_delta = timedelta(minutes=60)
        refresh_delta = timedelta(days=7)

    now = timezone.now()
    access = jwt.encode(
        {
            "type": "admin_access",
            "admin_id": admin_id,
            "exp": now + access_delta,
            "iat": now,
        },
        settings.JWT_HS256_SIGNING_KEY,
        algorithm="HS256",
    )
    refresh = jwt.encode(
        {
            "type": "admin_refresh",
            "admin_id": admin_id,
            "exp": now + refresh_delta,
            "iat": now,
        },
        settings.JWT_HS256_SIGNING_KEY,
        algorithm="HS256",
    )
    if isinstance(access, bytes):
        access = access.decode("ascii")
    if isinstance(refresh, bytes):
        refresh = refresh.decode("ascii")
    return access, refresh
