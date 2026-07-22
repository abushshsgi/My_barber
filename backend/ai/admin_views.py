"""Admin Morph AI API — analytics, catalog, ops, settings."""

from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response
from ai.unthrottled import UnthrottledAPIView

from accounts.permissions import IsAdmin
from ai.models import Hairstyle, MorphAiSettings
from ai.morph_analytics import build_morph_ai_analytics
from ai.morph_lists import LIST_KINDS, build_morph_list, build_morph_list_export_csv
from ai.morph_ops import (
    build_budget_status,
    build_conversion,
    build_errors_analytics,
    build_export_csv,
    build_gallery,
    build_limits_overview,
    build_popularity,
    clear_tryon_queue,
    get_settings_payload,
    queue_snapshot_admin,
    update_settings,
)


def _int_param(raw, default: int, *, lo: int = 1, hi: int = 200) -> int:
    try:
        return max(lo, min(hi, int(raw)))
    except (TypeError, ValueError):
        return default


class AdminMorphAiAnalyticsView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(
            build_morph_ai_analytics(
                request.query_params.get("start"),
                request.query_params.get("end"),
                recent_limit=_int_param(request.query_params.get("limit"), 50),
                top_limit=_int_param(request.query_params.get("top"), 20, hi=100),
            )
        )


class AdminMorphAiErrorsView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(
            build_errors_analytics(
                request.query_params.get("start"),
                request.query_params.get("end"),
                limit=_int_param(request.query_params.get("limit"), 50),
            )
        )


class AdminMorphAiPopularityView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(
            build_popularity(
                request.query_params.get("start"),
                request.query_params.get("end"),
                limit=_int_param(request.query_params.get("limit"), 40, hi=100),
            )
        )


class AdminMorphAiConversionView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(
            build_conversion(
                request.query_params.get("start"),
                request.query_params.get("end"),
            )
        )


class AdminMorphAiBudgetView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(
            build_budget_status(
                request.query_params.get("start"),
                request.query_params.get("end"),
            )
        )


class AdminMorphAiLimitsView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(build_limits_overview())


class AdminMorphAiQueueView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(queue_snapshot_admin())

    def post(self, request):
        action = str((request.data or {}).get("action") or "").strip()
        if action == "clear":
            return Response(clear_tryon_queue())
        return Response({"detail": "Unknown action"}, status=status.HTTP_400_BAD_REQUEST)


class AdminMorphAiGalleryView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(
            build_gallery(
                limit=_int_param(request.query_params.get("limit"), 40, hi=100),
                request=request,
            )
        )


class AdminMorphAiSettingsView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        MorphAiSettings.load()
        return Response(get_settings_payload())

    def patch(self, request):
        return Response(update_settings(request.data or {}))


class AdminMorphAiExportView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return build_export_csv(
            request.query_params.get("start"),
            request.query_params.get("end"),
        )


class AdminMorphAiListView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request, kind: str):
        if kind not in LIST_KINDS:
            return Response({"detail": "Noma'lum ro'yxat"}, status=status.HTTP_404_NOT_FOUND)
        try:
            return Response(
                build_morph_list(
                    kind,
                    start_raw=request.query_params.get("start"),
                    end_raw=request.query_params.get("end"),
                    page_raw=request.query_params.get("page"),
                    page_size_raw=request.query_params.get("page_size"),
                    request=request,
                )
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class AdminMorphAiListExportView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request, kind: str):
        if kind not in LIST_KINDS:
            return Response({"detail": "Noma'lum ro'yxat"}, status=status.HTTP_404_NOT_FOUND)
        return build_morph_list_export_csv(
            kind,
            start_raw=request.query_params.get("start"),
            end_raw=request.query_params.get("end"),
        )


class AdminMorphAiCatalogListCreateView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = Hairstyle.objects.all().order_by("audience", "sort_order", "style_id")
        audience = (request.query_params.get("audience") or "").strip()
        q = (request.query_params.get("q") or "").strip().lower()
        published = request.query_params.get("published")
        if audience in ("men", "women"):
            qs = qs.filter(audience=audience)
        if published in ("0", "1"):
            qs = qs.filter(is_published=published == "1")
        if q:
            qs = qs.filter(
                models_q_style(q)
            )
        return Response([serialize_hairstyle(h) for h in qs[:500]])

    def post(self, request):
        data = request.data or {}
        style_id = str(data.get("style_id") or "").strip()
        slug = str(data.get("slug") or "").strip()
        audience = str(data.get("audience") or "men").strip()
        if not style_id:
            if slug and audience:
                style_id = f"{audience}-{slug}"
            else:
                return Response({"detail": "style_id yoki slug kerak"}, status=400)
        if Hairstyle.objects.filter(pk=style_id).exists():
            return Response({"detail": "Bu style_id allaqachon mavjud"}, status=400)
        try:
            obj = Hairstyle.objects.create(
                style_id=style_id,
                slug=slug or style_id,
                audience=audience if audience in ("men", "women") else "men",
                category=str(data.get("category") or "barber"),
                title=str(data.get("title") or style_id),
                title_uz=str(data.get("title_uz") or data.get("title") or style_id),
                face_shapes=data.get("face_shapes") if isinstance(data.get("face_shapes"), list) else [],
                hair_length=str(data.get("hair_length") or "medium"),
                image_path=str(data.get("image_path") or ""),
                description_uz=str(data.get("description_uz") or ""),
                tags=data.get("tags") if isinstance(data.get("tags"), list) else [],
                age_groups=data.get("age_groups") if isinstance(data.get("age_groups"), list) else [],
                is_published=bool(data.get("is_published", True)),
                sort_order=int(data.get("sort_order") or 0),
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(serialize_hairstyle(obj), status=201)


class AdminMorphAiCatalogDetailView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request, style_id: str):
        try:
            obj = Hairstyle.objects.get(pk=style_id)
        except Hairstyle.DoesNotExist:
            return Response({"detail": "Topilmadi"}, status=404)
        return Response(serialize_hairstyle(obj))

    def patch(self, request, style_id: str):
        try:
            obj = Hairstyle.objects.get(pk=style_id)
        except Hairstyle.DoesNotExist:
            return Response({"detail": "Topilmadi"}, status=404)
        data = request.data or {}
        for field in (
            "slug",
            "audience",
            "category",
            "title",
            "title_uz",
            "hair_length",
            "image_path",
            "description_uz",
        ):
            if field in data and data[field] is not None:
                setattr(obj, field, data[field])
        if "face_shapes" in data and isinstance(data["face_shapes"], list):
            obj.face_shapes = data["face_shapes"]
        if "tags" in data and isinstance(data["tags"], list):
            obj.tags = data["tags"]
        if "age_groups" in data and isinstance(data["age_groups"], list):
            obj.age_groups = data["age_groups"]
        if "is_published" in data and data["is_published"] is not None:
            obj.is_published = bool(data["is_published"])
        if "sort_order" in data and data["sort_order"] is not None:
            obj.sort_order = int(data["sort_order"])
        obj.save()
        return Response(serialize_hairstyle(obj))

    def delete(self, request, style_id: str):
        deleted, _ = Hairstyle.objects.filter(pk=style_id).delete()
        if not deleted:
            return Response({"detail": "Topilmadi"}, status=404)
        return Response({"ok": True})


def serialize_hairstyle(h: Hairstyle) -> dict:
    return {
        "style_id": h.style_id,
        "slug": h.slug,
        "audience": h.audience,
        "category": h.category,
        "title": h.title,
        "title_uz": h.title_uz,
        "face_shapes": h.face_shapes or [],
        "hair_length": h.hair_length,
        "image_path": h.image_path,
        "description_uz": h.description_uz,
        "tags": h.tags or [],
        "age_groups": h.age_groups or [],
        "is_published": h.is_published,
        "sort_order": h.sort_order,
        "created_at": h.created_at.isoformat() if h.created_at else None,
        "updated_at": h.updated_at.isoformat() if h.updated_at else None,
    }


def models_q_style(q: str):
    from django.db.models import Q

    return Q(style_id__icontains=q) | Q(slug__icontains=q) | Q(title__icontains=q) | Q(title_uz__icontains=q)
