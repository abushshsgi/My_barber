"""Obunasiz / tarif cheklovlari — API path whitelist va feature map."""

from __future__ import annotations

from barbers.shop_subscription_services import get_entitlements, has_active_subscription

# fully_ready lekin obunasiz — faqat shu API lar
_SUBSCRIPTION_FREE_REL = (
    "barber/auth/me",
    "barber/auth/token",
    "barber/auth/token/refresh",
    "barber/onboarding/status",
    "barber/subscription",
    "barber/subscriptions",
    "barber/profile",
    "barber/settings",
    "barber/push-token",
    "barber/auth/verify-email",
    "barber/auth/resend-verification-email",
)

# Feature → API path prefix (obuna bor, lekin tarifda yo'q)
_FEATURE_PATH_PREFIXES: list[tuple[str, tuple[str, ...]]] = [
    ("expenses", ("barber/expenses",)),
    ("inventory", ("barber/inventory", "barber/inventory-movements")),
    ("stats_graphs", ("barber/goals",)),  # goals with graphs tier
    ("goals", ("barber/goals",)),
    ("marketing", ("barber/marketing", "barber/promos")),
    ("qr_pay", ("barber/qr-pay",)),
    ("withdrawals", ("barber/payouts",)),
]


def _strip_api_prefix(path: str) -> str:
    p = path.split("?")[0]
    for prefix in ("/api/v1/", "/api/"):
        if p.startswith(prefix):
            return p[len(prefix) :].lstrip("/")
    return p.lstrip("/")


def subscription_free_rel_allowed(http_path: str) -> bool:
    rel = _strip_api_prefix(http_path).rstrip("/")
    if not rel:
        return False
    for a in _SUBSCRIPTION_FREE_REL:
        a = a.rstrip("/")
        if rel == a or rel.startswith(a + "/"):
            return True
    return False


def feature_blocked_reason(barber, http_path: str) -> str | None:
    """None = ruxsat; string = 402/403 detail."""
    if not has_active_subscription(barber):
        if subscription_free_rel_allowed(http_path):
            return None
        return "Panel to'liq ishlashi uchun obuna kerak."

    ents = get_entitlements(barber)
    rel = _strip_api_prefix(http_path).rstrip("/")
    for feature_key, prefixes in _FEATURE_PATH_PREFIXES:
        for p in prefixes:
            p = p.rstrip("/")
            if rel == p or rel.startswith(p + "/"):
                if not ents.get(feature_key):
                    return (
                        f"Bu funksiya joriy tarifda yo'q. "
                        f"Business yoki Pro ga o'ting. ({feature_key})"
                    )
    return None
