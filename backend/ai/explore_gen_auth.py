"""Explore generatsiya — maxfiy kalit (production) yoki DEBUG (lokal)."""

from __future__ import annotations

from django.conf import settings
from rest_framework.request import Request
from rest_framework.response import Response


def explore_gen_secret() -> str:
    return (getattr(settings, "EXPLORE_GEN_SECRET", None) or "").strip()


def explore_gen_request_key(request: Request) -> str:
    header = (request.headers.get("X-Explore-Gen-Secret") or "").strip()
    if header:
        return header
    return (request.query_params.get("key") or "").strip()


def explore_gen_is_allowed(request: Request) -> bool:
    expected = explore_gen_secret()
    if expected:
        return explore_gen_request_key(request) == expected
    return bool(settings.DEBUG)


class ExploreGenAuthMixin:
    def dispatch(self, request, *args, **kwargs):
        if not explore_gen_is_allowed(request):
            return Response({"detail": "Ruxsat yo'q. ?key= yoki X-Explore-Gen-Secret kerak."}, status=403)
        return super().dispatch(request, *args, **kwargs)
