"""Vaqtinchalik Explore rasm generatsiya API — EXPLORE_GEN_SECRET yoki DEBUG."""

from __future__ import annotations

from django.http import FileResponse, Http404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ai.explore_gen_auth import ExploreGenAuthMixin, explore_gen_is_allowed
from ai.explore_published import publish_explore_asset, publish_explore_persona
from ai.explore_views import EXPLORE_VIEW_IDS, EXPLORE_VIEW_LABELS, normalize_explore_view
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
                "views": [
                    {"id": view_id, "label": EXPLORE_VIEW_LABELS[view_id]} for view_id in EXPLORE_VIEW_IDS
                ],
            }
        )


class ExploreGenGenerateView(ExploreGenAuthMixin, APIView):
    """POST — bitta reference yoki uslub rasmini generatsiya qilish."""

    permission_classes = [AllowAny]

    def post(self, request):
        persona_id = (request.data.get("persona_id") or "").strip()
        slug = (request.data.get("slug") or "").strip()
        view = normalize_explore_view(request.data.get("view"))
        force = bool(request.data.get("force"))

        if not persona_id or not slug:
            return Response({"detail": "persona_id va slug kerak."}, status=400)

        try:
            result = generate_explore_asset(
                persona_id=persona_id,
                slug=slug,
                force=force,
                view=view,
            )
        except AiStyleError as exc:
            return Response({"detail": exc.message}, status=exc.status)

        return Response(result)


class ExploreGenPublishView(ExploreGenAuthMixin, APIView):
    """POST — tasdiqlangan rasmni haqiqiy Explore katalogiga joylash."""

    permission_classes = [AllowAny]

    def post(self, request):
        persona_id = (request.data.get("persona_id") or "").strip()
        slug = (request.data.get("slug") or "").strip()
        view = normalize_explore_view(request.data.get("view"))
        publish_all = bool(request.data.get("all"))

        if not persona_id:
            return Response({"detail": "persona_id kerak."}, status=400)

        try:
            if publish_all:
                result = publish_explore_persona(persona_id=persona_id)
            else:
                if not slug:
                    return Response({"detail": "slug kerak."}, status=400)
                result = publish_explore_asset(persona_id=persona_id, slug=slug, view=view)
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
        view = normalize_explore_view(request.query_params.get("view"))
        if not persona_id or not slug:
            return Response({"detail": "persona_id va slug kerak."}, status=400)

        path = asset_file_path(persona_id=persona_id, slug=slug, view=view)
        if not path.is_file():
            from ai.explore_published import live_asset_path

            path = live_asset_path(persona_id=persona_id, slug=slug, view=view)
        if not path.is_file():
            raise Http404("Fayl topilmadi.")

        from ai.explore_views import explore_asset_storage_slug

        from ai.explore_personas import normalize_persona_id

        pid = normalize_persona_id(persona_id) or persona_id
        storage = explore_asset_storage_slug(slug, view)
        filename = f"{pid}-{storage}.webp"
        return FileResponse(
            path.open("rb"),
            filename=filename,
            content_type="image/webp",
            as_attachment=True,
        )
