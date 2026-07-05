"""Vaqtinchalik Explore rasm generatsiya API — faqat DJANGO_DEBUG=true."""

from __future__ import annotations

from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ai.services.explore_image_gen import (
    explore_gen_configured,
    generate_explore_asset,
    list_explore_gen_jobs,
)
from ai.services.gemini_style import AiStyleError


class DevOnlyMixin:
    def dispatch(self, request, *args, **kwargs):
        if not settings.DEBUG:
            return Response({"detail": "Faqat dev rejimida mavjud."}, status=404)
        return super().dispatch(request, *args, **kwargs)


class ExploreGenStatusView(DevOnlyMixin, APIView):
    """GET — generatsiya sozlamalari va job ro'yxati."""

    permission_classes = [AllowAny]

    def get(self, request):
        jobs = list_explore_gen_jobs()
        return Response(
            {
                "configured": explore_gen_configured(),
                "jobs": jobs,
                "total": len(jobs),
                "existing": sum(1 for job in jobs if job["exists"]),
            }
        )


class ExploreGenGenerateView(DevOnlyMixin, APIView):
    """POST — bitta reference yoki uslub rasmini generatsiya qilish."""

    permission_classes = [AllowAny]

    def post(self, request):
        persona_id = (request.data.get("persona_id") or "").strip()
        slug = (request.data.get("slug") or "").strip()
        force = bool(request.data.get("force"))

        if not persona_id or not slug:
            return Response({"detail": "persona_id va slug kerak."}, status=400)

        try:
            result = generate_explore_asset(persona_id=persona_id, slug=slug, force=force)
        except AiStyleError as exc:
            return Response({"detail": exc.message}, status=exc.status)

        return Response(result)
