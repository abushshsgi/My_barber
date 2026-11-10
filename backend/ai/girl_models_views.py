"""Explore Gen — qiz modellari (Runware) va Explore ayollarga joylash."""

from __future__ import annotations

from io import BytesIO

from django.http import FileResponse, Http404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ai.explore_gen_auth import ExploreGenAuthMixin
from ai.services.errors import AiStyleError
from ai.services.girl_models import (
    generate_girl_model,
    get_model,
    girl_model_configured,
    girl_model_name,
    list_looks,
    list_models,
    list_slots,
    model_bytes,
    publish_girl_model,
    set_model_liked,
)
from ai.unthrottled import UnthrottledAPIView


class GirlModelsStatusView(ExploreGenAuthMixin, UnthrottledAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        look_id = (request.query_params.get("look_id") or "").strip() or None
        liked_only = request.query_params.get("liked") in ("1", "true", "yes")
        items = list_models(look_id=look_id, liked_only=liked_only)
        return Response(
            {
                "configured": girl_model_configured(),
                "model": girl_model_name(),
                "looks": list_looks(),
                "slots": list_slots(),
                "items": items,
                "total": len(items),
                "liked_count": sum(1 for item in items if item.get("liked")),
            }
        )


class GirlModelsGenerateView(ExploreGenAuthMixin, UnthrottledAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        look_id = (request.data.get("look_id") or "").strip()
        prompt_extra = request.data.get("prompt_extra") or request.data.get("prompt") or ""
        if not look_id:
            return Response({"detail": "look_id kerak."}, status=400)
        try:
            item = generate_girl_model(look_id=look_id, prompt_extra=str(prompt_extra))
        except AiStyleError as exc:
            return Response({"detail": exc.message}, status=exc.status)
        return Response({"status": "created", "item": item})


class GirlModelsLikeView(ExploreGenAuthMixin, UnthrottledAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        model_id = (request.data.get("id") or "").strip()
        liked = request.data.get("liked", True)
        if isinstance(liked, str):
            liked = liked.lower() in ("1", "true", "yes")
        if not model_id:
            return Response({"detail": "id kerak."}, status=400)
        try:
            item = set_model_liked(model_id=model_id, liked=bool(liked))
        except FileNotFoundError:
            return Response({"detail": "Model topilmadi."}, status=404)
        return Response({"item": item})


class GirlModelsPublishView(ExploreGenAuthMixin, UnthrottledAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        model_id = (request.data.get("id") or "").strip()
        persona_id = (request.data.get("persona_id") or "").strip()
        label = str(request.data.get("label") or "")
        if not model_id or not persona_id:
            return Response({"detail": "id va persona_id kerak."}, status=400)
        try:
            item = publish_girl_model(model_id=model_id, persona_id=persona_id, label=label)
        except FileNotFoundError:
            return Response({"detail": "Model topilmadi."}, status=404)
        except AiStyleError as exc:
            return Response({"detail": exc.message}, status=exc.status)
        return Response({"item": item})


class GirlModelsDownloadView(ExploreGenAuthMixin, UnthrottledAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        model_id = (request.query_params.get("id") or "").strip()
        if not model_id:
            return Response({"detail": "id kerak."}, status=400)
        try:
            raw = model_bytes(model_id)
        except FileNotFoundError as exc:
            raise Http404("Rasm topilmadi.") from exc
        item = get_model(model_id) or {}
        filename = f"{item.get('look_id', 'girl')}-{model_id}.webp"
        force_download = str(request.query_params.get("download") or "").lower() in (
            "1",
            "true",
            "yes",
        )
        response = FileResponse(
            BytesIO(raw),
            as_attachment=force_download,
            filename=filename,
            content_type="image/webp",
        )
        response["Cache-Control"] = "private, max-age=300"
        return response
