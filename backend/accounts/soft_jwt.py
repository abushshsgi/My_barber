"""Customer JWT auth — o'chirilgan user tokenlarini AllowAny endpointlarda soft-fail qiladi."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken


class SoftUserJWTAuthentication(JWTAuthentication):
    """
    Oddiy JWTAuthentication deleted user uchun AuthenticationFailed ko'taradi —
    AllowAny viewlar ham 403 bo'ladi (Authorization header yuborilganda).

    User topilmasa: None (anonymous) — public katalog ochiq qoladi;
    himoyalangan endpointlar esa IsAuthenticated bilan 401/403 beradi.
    """

    def get_user(self, validated_token):
        try:
            return super().get_user(validated_token)
        except (InvalidToken, AuthenticationFailed):
            return None
        except get_user_model().DoesNotExist:
            return None

    def authenticate(self, request):
        try:
            result = super().authenticate(request)
        except (InvalidToken, AuthenticationFailed):
            # Muddati o'tgan / yaroqsiz token: public endpointlar uchun anonymous.
            return None
        if result is None:
            return None
        user, validated = result
        if user is None:
            return None
        return user, validated
