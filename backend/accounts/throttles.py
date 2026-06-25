"""DRF throttles for auth and salon MVP endpoints (IP or user scoped)."""

from accounts.phone_auth import normalize_uz_phone
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle, UserRateThrottle


class AuthIPThrottle(SimpleRateThrottle):
    """Limit login and barber registration by client IP."""

    scope = "auth"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}

    def throttle_failure_message(self):
        return (
            "Juda ko'p urinish (daqiqada 12 ta). 1 daqiqa kutib qayta urinib ko'ring."
        )


class BarberCheckThrottle(SimpleRateThrottle):
    """Email/telefon mavjudligini tekshirish — enumeration himoya."""

    scope = "barber_check"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}

    def throttle_failure_message(self):
        return "Tekshiruv limiti tugadi. Biroz kutib qayta urinib ko'ring."


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


class PhoneScopedSendThrottle(SimpleRateThrottle):
    """OTP yuborish — telefon raqami bo'yicha limit (IP almashtirish hujumlari)."""

    scope = "phone_send_per_number"

    def get_cache_key(self, request, view):
        phone = normalize_uz_phone(getattr(request, "data", {}).get("phone"))
        if not phone:
            return None
        return self.cache_format % {"scope": self.scope, "ident": phone}


class PhoneScopedVerifyThrottle(SimpleRateThrottle):
    """OTP tekshirish — telefon raqami bo'yicha limit."""

    scope = "phone_verify_per_number"

    def get_cache_key(self, request, view):
        phone = normalize_uz_phone(getattr(request, "data", {}).get("phone"))
        if not phone:
            return None
        return self.cache_format % {"scope": self.scope, "ident": phone}


class AiStyleThrottle(SimpleRateThrottle):
    """AI selfie tahlili va yuz tekshiruvi."""

    scope = "ai_style"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f"user-{request.user.pk}"
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}

    def throttle_failure_message(self):
        return "So'rov limiti tugadi (soatiga 30 ta). Biroz kutib qayta urinib ko'ring."


class AiTryOnThrottle(SimpleRateThrottle):
    """AI rasm generatsiya (try-on) — qimmat, alohida limit."""

    scope = "ai_tryon"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f"user-{request.user.pk}"
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}

    def throttle_failure_message(self):
        return "Rasm generatsiya limiti tugadi (soatiga 12 ta). Biroz kutib qayta urinib ko'ring."


class PhoneCheckThrottle(SimpleRateThrottle):
    """Telefon tekshirish — enumeration / spam."""

    scope = "phone_check"

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


class BarberWriteThrottle(SimpleRateThrottle):
    scope = "barber_write"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = getattr(request.user, "pk", None) or self.get_ident(request)
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class BarberPayoutThrottle(SimpleRateThrottle):
    scope = "barber_payout"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = getattr(request.user, "pk", None) or self.get_ident(request)
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class BarberBroadcastThrottle(SimpleRateThrottle):
    scope = "barber_broadcast"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = getattr(request.user, "pk", None) or self.get_ident(request)
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class BarberPromoThrottle(SimpleRateThrottle):
    scope = "barber_promo"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = getattr(request.user, "pk", None) or self.get_ident(request)
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
