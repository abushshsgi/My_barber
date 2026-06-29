"""JWT auth for barbers (Barber model), alohida User dan."""

from __future__ import annotations

import uuid

import jwt
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from barbers.models import Barber

REFRESH_JTI_CACHE_PREFIX = "barber_refresh_jti:"
REFRESH_JTI_TTL_SECONDS = 7 * 24 * 60 * 60


class BarberPrincipal:
    """DRF request.user when authenticated via barber_access JWT."""

    is_authenticated = True
    is_anonymous = False
    is_staff = False
    is_superuser = False

    def __init__(self, barber: Barber):
        self.barber = barber
        self.pk = barber.pk
        self.id = barber.pk

    def __str__(self) -> str:
        return f"Barber({self.barber.email})"


class BarberJWTAuthentication(BaseAuthentication):
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
        except jwt.ExpiredSignatureError as exc:
            raise AuthenticationFailed("Token expired.") from exc
        except jwt.PyJWTError:
            return None
        if payload.get("type") != "barber_access":
            return None
        barber_id = payload.get("barber_id")
        if not barber_id:
            return None
        try:
            b = Barber.objects.get(pk=barber_id, is_active=True)
        except Barber.DoesNotExist:
            raise AuthenticationFailed("Barber not found or inactive.")
        return (BarberPrincipal(b), None)


def _refresh_cache_key(barber_id: int) -> str:
    return f"{REFRESH_JTI_CACHE_PREFIX}{barber_id}"


def store_barber_refresh_jti(barber_id: int, jti: str) -> None:
    cache.set(_refresh_cache_key(barber_id), jti, timeout=REFRESH_JTI_TTL_SECONDS)


def validate_and_rotate_barber_refresh(
    barber_id: int, jti: str | None
) -> bool:
    if not jti:
        return False
    cached = cache.get(_refresh_cache_key(barber_id))
    if cached == jti:
        return True
    # Redis blip / deploy: refresh JWT yaroqli bo'lsa cache qayta tiklanadi.
    if cached is None:
        return True
    return False


def encode_barber_tokens(barber_id: int) -> tuple[str, str]:
    from datetime import timedelta

    sj = getattr(settings, "SIMPLE_JWT", {})
    access_delta = sj.get("ACCESS_TOKEN_LIFETIME") or timedelta(minutes=60)
    refresh_delta = sj.get("REFRESH_TOKEN_LIFETIME") or timedelta(days=7)

    now = timezone.now()
    refresh_jti = str(uuid.uuid4())
    access = jwt.encode(
        {
            "type": "barber_access",
            "barber_id": barber_id,
            "exp": now + access_delta,
            "iat": now,
        },
        settings.JWT_HS256_SIGNING_KEY,
        algorithm="HS256",
    )
    refresh = jwt.encode(
        {
            "type": "barber_refresh",
            "barber_id": barber_id,
            "jti": refresh_jti,
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
    store_barber_refresh_jti(barber_id, refresh_jti)
    return access, refresh
