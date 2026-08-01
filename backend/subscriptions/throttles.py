from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle

from accounts.throttles import CacheFailOpenMixin, FriendlyThrottleMixin


class SubscriptionCheckoutThrottle(CacheFailOpenMixin, FriendlyThrottleMixin, UserRateThrottle):
    scope = "subscription_checkout"
    throttle_detail = "Obuna so'rovlari limiti. Biroz kutib qayta urinib ko'ring."


class SubscriptionConfirmThrottle(CacheFailOpenMixin, FriendlyThrottleMixin, UserRateThrottle):
    scope = "subscription_confirm"
    throttle_detail = "To'lov tasdiqlash limiti. Biroz kutib qayta urinib ko'ring."


class SubscriptionIPThrottle(CacheFailOpenMixin, FriendlyThrottleMixin, SimpleRateThrottle):
    """IP bo'yicha checkout spam / carding himoya."""

    scope = "subscription_ip"
    throttle_detail = "Juda ko'p obuna urinishi. Keyinroq qayta urinib ko'ring."

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
