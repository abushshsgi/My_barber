"""DRF throttles for auth and salon MVP endpoints (IP or user scoped)."""

from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle, UserRateThrottle


class AuthIPThrottle(SimpleRateThrottle):
    """Limit login and barber registration by client IP."""

    scope = "auth"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class PhoneSendThrottle(SimpleRateThrottle):
    """OTP yuborish — IP bo'yicha qattiq limit (SMS spam / DDoS)."""

    scope = "phone_send"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class PhoneVerifyThrottle(SimpleRateThrottle):
    """OTP tekshirish — brute-force oldini olish."""

    scope = "phone_verify"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class SalonSearchThrottle(SimpleRateThrottle):
    scope = "salon_search"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class SalonJoinThrottle(SimpleRateThrottle):
    scope = "salon_join"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class ApiAnonRateThrottle(AnonRateThrottle):
    """Anonim so'rovlar — umumiy DDoS himoya."""

    scope = "anon"


class ApiUserRateThrottle(UserRateThrottle):
    """Autentifikatsiyalangan foydalanuvchi — umumiy limit."""

    scope = "user"


class WalletGiftThrottle(AuthIPThrottle):
    scope = "wallet_gift"


class WalletTopUpThrottle(AuthIPThrottle):
    scope = "wallet_topup"
