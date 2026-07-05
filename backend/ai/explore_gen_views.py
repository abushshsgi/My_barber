"""Vaqtinchalik Explore rasm generatsiya API — EXPLORE_GEN_SECRET yoki DEBUG."""

from __future__ import annotations

from django.http import FileResponse, Http404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ai.explore_gen_auth import ExploreGenAuthMixin, explore_gen_is_allowed
from ai.services.explore_image_gen import (
    asset_file_path,
    explore_gen_configured,
    generate_explore_asset,
    list_explore_gen_jobs,
    output_mode,
)
from ai.services.gemini_style import AiStyleError


class ExploreGenStatusView(ExploreGenAuthMixin, APIView):
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
                "output_mode": output_mode(),
            }
        )


class ExploreGenGenerateView(ExploreGenAuthMixin, APIView):
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


class ExploreGenDownloadView(APIView):
    """GET — generatsiya qilingan faylni yuklab olish (production media)."""

    permission_classes = [AllowAny]

    def get(self, request):
        if not explore_gen_is_allowed(request):
            return Response({"detail": "Ruxsat yo'q."}, status=403)

        persona_id = (request.query_params.get("persona_id") or "").strip()
        slug = (request.query_params.get("slug") or "").strip()
        if not persona_id or not slug:
            return Response({"detail": "persona_id va slug kerak."}, status=400)

        path = asset_file_path(persona_id=persona_id, slug=slug)
        if not path.is_file():
            raise Http404("Fayl topilmadi.")

        return FileResponse(path.open("rb"), filename=path.name, content_type="image/webp")
