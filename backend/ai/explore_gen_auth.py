"""Explore generatsiya — DEBUG (lokal) yoki EXPLORE_GEN_SECRET (production)."""

from __future__ import annotations

from django.conf import settings
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request


def explore_gen_secret() -> str:
    return (getattr(settings, "EXPLORE_GEN_SECRET", None) or "").strip()


def explore_gen_request_key(request: object) -> str:
    headers = getattr(request, "headers", None)
    if headers is not None:
        header = (headers.get("X-Explore-Gen-Secret") or "").strip()
        if header:
            return header
    query = getattr(request, "query_params", None)
    if query is not None:
        return (query.get("key") or "").strip()
    get = getattr(request, "GET", None)
    if get is not None:
        return (get.get("key") or "").strip()
    return ""


def explore_gen_is_allowed(request: object) -> bool:
    # Lokal: DEBUG=true yetarli. Production: faqat to'g'ri secret.
    if settings.DEBUG:
        return True
    expected = explore_gen_secret()
    if not expected:
        return False
    return explore_gen_request_key(request) == expected


class ExploreGenAuthMixin:
    def initial(self, request: Request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not explore_gen_is_allowed(request):
            raise PermissionDenied("Ruxsat yo'q. ?key= yoki X-Explore-Gen-Secret kerak.")
