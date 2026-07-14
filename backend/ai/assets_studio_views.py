"""Explore Gen — Assets Studio API (logo / banner / hero generatsiya)."""

from __future__ import annotations

from django.http import FileResponse, Http404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ai.explore_gen_auth import ExploreGenAuthMixin
from ai.services.assets_studio import (
    assets_studio_configured,
    asset_bytes,
    generate_asset,
    get_asset,
    list_assets,
    list_templates,
    set_asset_selected,
)
from ai.services.gemini_style import AiStyleError


class AssetsStudioStatusView(ExploreGenAuthMixin, APIView):
    """GET — shablonlar + kutubxona."""

    permission_classes = [AllowAny]

    def get(self, request):
        template_id = (request.query_params.get("template_id") or "").strip() or None
        selected_only = request.query_params.get("selected") in ("1", "true", "yes")
        items = list_assets(template_id=template_id, selected_only=selected_only)
        return Response(
            {
                "configured": assets_studio_configured(),
                "templates": list_templates(),
                "items": items,
                "total": len(items),
                "selected_count": sum(1 for i in items if i.get("selected")),
            }
        )


class AssetsStudioGenerateView(ExploreGenAuthMixin, APIView):
    """POST — shablon bo'yicha yangi rasm."""

    permission_classes = [AllowAny]

    def post(self, request):
        template_id = (request.data.get("template_id") or "").strip()
        prompt_extra = request.data.get("prompt_extra") or request.data.get("prompt") or ""
        aspect_ratio = (request.data.get("aspect_ratio") or "").strip() or None
        if not template_id:
            return Response({"detail": "template_id kerak."}, status=400)
        try:
            item = generate_asset(
                template_id=template_id,
                prompt_extra=str(prompt_extra),
                aspect_ratio=aspect_ratio,
            )
        except AiStyleError as exc:
            return Response({"detail": exc.message}, status=exc.status)
        return Response({"status": "created", "item": item})


class AssetsStudioSelectView(ExploreGenAuthMixin, APIView):
    """POST — saytga qo'yish uchun tanlash / bekor qilish."""

    permission_classes = [AllowAny]

    def post(self, request):
        asset_id = (request.data.get("id") or "").strip()
        selected = request.data.get("selected", True)
        if isinstance(selected, str):
            selected = selected.lower() in ("1", "true", "yes")
        if not asset_id:
            return Response({"detail": "id kerak."}, status=400)
        try:
            item = set_asset_selected(asset_id=asset_id, selected=bool(selected))
        except FileNotFoundError:
            return Response({"detail": "Rasm topilmadi."}, status=404)
        return Response({"item": item})


class AssetsStudioDownloadView(ExploreGenAuthMixin, APIView):
    """GET — preview (inline) yoki yuklab olish (?download=1)."""

    permission_classes = [AllowAny]

    def get(self, request):
        asset_id = (request.query_params.get("id") or "").strip()
        if not asset_id:
            return Response({"detail": "id kerak."}, status=400)
        try:
            path, _raw = asset_bytes(asset_id)
        except FileNotFoundError as exc:
            raise Http404("Rasm topilmadi.") from exc
        item = get_asset(asset_id) or {}
        filename = f"{item.get('template_id', 'asset')}-{asset_id}.webp"
        # as_attachment=True bo'lsa <img src> bo'sh qoladi — preview uchun inline.
        force_download = str(request.query_params.get("download") or "").lower() in (
            "1",
            "true",
            "yes",
        )
        response = FileResponse(
            path.open("rb"),
            as_attachment=force_download,
            filename=filename,
            content_type="image/webp",
        )
        response["Cache-Control"] = "private, max-age=300"
        return response
