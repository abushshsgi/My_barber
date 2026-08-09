from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
import logging

from accounts.models import SkinProfile, User

from ai.age_groups import birth_year_to_group, normalize_age_group, resolve_hairstyle_image_path
from ai.explore_personas import has_persona_style_asset, list_explore_personas, normalize_persona_id
from subscriptions.services import can_use_morph_care

from .history_storage import image_file_from_source, save_history_photo, trim_user_history
from .models import (
    GENERATION_HISTORY_MAX_PER_USER,
    HISTORY_MAX_PER_USER,
    AiStyleHistoryEntry,
    Hairstyle,
    MorphAiGenerationEntry,
    MorphAiLookShare,
)
from .salon_match import attach_salons_to_suggestions
from .serializers import (
    AiStyleHistoryCreateSerializer,
    AiStyleHistoryEntrySerializer,
    HairstyleSerializer,
    MorphAiGenerationCreateSerializer,
    MorphAiGenerationSerializer,
    MorphAiLookShareCreateSerializer,
    MorphAiLookShareSerializer,
)
from .style_recommend import (
    build_suggestions_from_analysis,
    normalize_request_audience,
    resolve_ai_style_audience,
)
from .services.gemini_tryon import generate_tryon_multiview, generate_tryon_preview
from .services.tryon_queue import (
    enqueue_tryon_job,
    enqueue_tryon_multiview_job,
    get_tryon_job,
    is_queue_enabled,
)
from .services.gemini_barber_card import generate_barber_master_card
from .services.gemini_ingredient import analyze_ingredient_from_data_url
from .services.gemini_style import (
    NO_FACE_MESSAGE,
    AiStyleError,
    analyze_style_from_data_url,
    check_face_in_data_url,
)
from .unthrottled import UnthrottledAPIView
from .usage_log import record_ai_generation
from .morph_ops import check_user_can_generate, morph_generation_blocked_response

logger = logging.getLogger(__name__)


def _require_customer_user(request) -> User | Response:
    user = request.user
    if not isinstance(user, User):
        return Response({"detail": "Faqat mijoz akkaunti uchun."}, status=403)
    return user


def _resolve_age_group(request) -> str | None:
    explicit = normalize_age_group(request.query_params.get("age_group"))
    if explicit:
        return explicit
    user = getattr(request, "user", None)
    if isinstance(user, User) and user.is_authenticated:
        return birth_year_to_group(user.birth_year)
    return None


def _resolve_persona_id(request, audience: str | None) -> str | None:
    if audience != "men":
        return None
    return normalize_persona_id(request.query_params.get("persona"))


def _resolve_persona_from_body(request, audience: str | None) -> str | None:
    if audience != "men":
        return None
    return normalize_persona_id(request.data.get("persona"))


class ExplorePersonaListView(UnthrottledAPIView):
    """GET — erkak Explore personajlari ro'yxati."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(list_explore_personas())


class HairstyleListView(UnthrottledAPIView):
    """GET ?audience=men|women&age_group=kids|teen|young|adult|mature — Explore katalogi."""

    permission_classes = [AllowAny]

    def get(self, request):
        from config.api_cache import cached_json

        audience = (request.query_params.get("audience") or "").strip().lower()
        age_group = _resolve_age_group(request)
        persona_id = _resolve_persona_id(request, audience if audience in {"men", "women"} else None)
        cache_parts = {
            "audience": audience,
            "age_group": age_group or "",
            "persona_id": persona_id or "",
        }

        def produce():
            qs = Hairstyle.objects.filter(is_published=True)
            if audience in {"men", "women"}:
                qs = qs.filter(audience=audience)
            styles = list(qs)
            if age_group:
                styles = [
                    style
                    for style in styles
                    if age_group in (style.age_groups or [])
                ]
            if audience == "men" and not persona_id:
                ready_persona_ids = [p["id"] for p in list_explore_personas()]
                # Manifest bir marta — har style×persona uchun DB EXISTS emas
                styles = [
                    style
                    for style in styles
                    if any(has_persona_style_asset(pid, style.slug) for pid in ready_persona_ids)
                ]
            if persona_id:
                styles = [
                    style
                    for style in styles
                    if has_persona_style_asset(persona_id, style.slug)
                ]
            serializer = HairstyleSerializer(
                styles,
                many=True,
                context={
                    "age_group": age_group,
                    "persona_id": persona_id,
                    "skip_gallery": True,
                },
            )
            return serializer.data

        payload = cached_json(prefix="hairstyles_list", parts=cache_parts, producer=produce, ttl=120)
        return Response(payload)


class HairstyleDetailView(UnthrottledAPIView):
    """GET /hairstyles/{style_id}/ — bitta uslub."""

    permission_classes = [AllowAny]

    def get(self, request, style_id: str):
        age_group = _resolve_age_group(request)
        style = get_object_or_404(
            Hairstyle,
            style_id=style_id,
            is_published=True,
        )
        persona_id = _resolve_persona_id(request, style.audience)
        if persona_id and not has_persona_style_asset(persona_id, style.slug):
            return Response({"detail": "Uslub rasmi mavjud emas."}, status=404)
        serializer = HairstyleSerializer(
            style,
            context={"age_group": age_group, "persona_id": persona_id},
        )
        return Response(serializer.data)


class AiStyleAnalyzeView(UnthrottledAPIView):
    """POST { image: data-url, audience } — Gemini selfie tahlili."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        blocked = check_user_can_generate(user_id=user.pk, kind="analyze")
        if blocked:
            return morph_generation_blocked_response(blocked)

        image = request.data.get("image")
        request_audience = normalize_request_audience(request.data.get("audience"))
        face_hint = request.data.get("face_hint")
        if not image:
            return Response({"detail": "Selfie rasmini yuboring."}, status=400)

        try:
            analysis = analyze_style_from_data_url(
                str(image),
                request_audience,
                face_hint=face_hint if isinstance(face_hint, dict) else None,
            )
            usage = analysis.pop("_usage", None) or {}
            record_ai_generation(
                user_id=user.pk,
                kind="analyze",
                status="success",
                prompt=str(usage.get("prompt") or ""),
                model=str(usage.get("model") or ""),
                provider=str(usage.get("provider") or ""),
                prompt_tokens=int(usage.get("prompt_tokens") or 0),
                candidates_tokens=int(usage.get("candidates_tokens") or 0),
                thoughts_tokens=int(usage.get("thoughts_tokens") or 0),
                total_tokens=int(usage.get("total_tokens") or 0),
                cost_usd=usage.get("cost_usd") or 0,
                tokens_estimated=bool(usage.get("tokens_estimated")),
                latency_ms=int(usage.get("latency_ms") or 0),
            )
            resolved_audience = resolve_ai_style_audience(
                request_audience,
                analysis,
            )
            _, suggestions = build_suggestions_from_analysis(
                request_audience=request_audience,
                analysis=analysis,
                age_group=birth_year_to_group(user.birth_year),
                persona_id=_resolve_persona_from_body(request, resolved_audience),
            )
            suggestions = attach_salons_to_suggestions(suggestions)
            return Response(
                {
                    "face_shape": analysis["face_shape"],
                    "hair_type": analysis["hair_type"],
                    "hair_color": analysis.get("hair_color") or "other",
                    "hair_color_hex": analysis.get("hair_color_hex") or "#5C5C5C",
                    "hair_texture": analysis.get("hair_texture") or "straight",
                    "beard": analysis.get("beard") or "none",
                    "face_confidence": (
                        analysis["face_confidence"]
                        if isinstance(analysis.get("face_confidence"), (int, float))
                        else 0.74
                    ),
                    "hair_type_confidence": (
                        analysis["hair_type_confidence"]
                        if isinstance(analysis.get("hair_type_confidence"), (int, float))
                        else 0.7
                    ),
                    "hair_color_confidence": (
                        analysis["hair_color_confidence"]
                        if isinstance(analysis.get("hair_color_confidence"), (int, float))
                        else 0.68
                    ),
                    "summary_uz": analysis["summary_uz"],
                    "detected_gender": analysis["detected_gender"],
                    "suggestions": suggestions,
                }
            )
        except AiStyleError as exc:
            record_ai_generation(
                user_id=user.pk,
                kind="analyze",
                status="failed",
                error_detail=exc.message,
            )
            return Response({"detail": exc.message}, status=exc.status)


class AiStyleTryOnView(UnthrottledAPIView):
    """POST { image, style_id } — selfie + uslub bo'yicha AI preview rasm."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        blocked = check_user_can_generate(user_id=user.pk, kind="tryon")
        if blocked:
            return morph_generation_blocked_response(blocked)

        image = request.data.get("image")
        style_id = (request.data.get("style_id") or "").strip()
        if not image:
            return Response({"detail": "Selfie rasmini yuboring."}, status=400)
        if not style_id:
            return Response({"detail": "Uslub tanlang."}, status=400)

        style = get_object_or_404(Hairstyle, style_id=style_id, is_published=True)
        age_group = birth_year_to_group(user.birth_year)
        persona_id = _resolve_persona_from_body(request, style.audience)
        reference_url = resolve_hairstyle_image_path(
            image_path=style.image_path,
            slug=style.slug,
            audience=style.audience,
            age_group=age_group,
            persona_id=persona_id,
        )

        try:
            if is_queue_enabled():
                job_id = enqueue_tryon_job(
                    user_id=user.pk,
                    image=str(image),
                    style_id=style.style_id,
                    style_title=style.title_uz,
                    audience=style.audience,
                    slug=style.slug,
                    reference_image_url=reference_url,
                    persona_id=persona_id or "",
                )
                return Response(
                    {
                        "job_id": job_id,
                        "status": "queued",
                        "style_id": style.style_id,
                        "style_title": style.title_uz,
                    },
                    status=status.HTTP_202_ACCEPTED,
                )

            result = generate_tryon_preview(
                selfie_data_url=str(image),
                audience=style.audience,
                slug=style.slug,
                title=style.title_uz,
                reference_image_url=reference_url,
            )
            record_ai_generation(
                user_id=user.pk,
                kind="tryon",
                status="success",
                prompt=result.prompt,
                style_id=style.style_id,
                style_title=style.title_uz,
                model=result.model,
                provider=result.provider,
                prompt_tokens=result.prompt_tokens,
                candidates_tokens=result.candidates_tokens,
                thoughts_tokens=result.thoughts_tokens,
                total_tokens=result.total_tokens,
                cost_usd=result.cost_usd,
                tokens_estimated=result.tokens_estimated,
                latency_ms=result.latency_ms,
            )
            from ai.tryon_persist import persist_tryon_generation

            persist_tryon_generation(
                user=user,
                after_image=result.preview_image,
                before_image=str(image),
                style_id=style.style_id,
                title=style.title_uz,
                persona_id=persona_id or "",
            )
            return Response(
                {
                    "preview_image": result.preview_image,
                    "style_id": style.style_id,
                    "style_title": style.title_uz,
                }
            )
        except AiStyleError as exc:
            record_ai_generation(
                user_id=user.pk,
                kind="tryon",
                status="failed",
                style_id=style.style_id,
                style_title=style.title_uz,
                error_detail=exc.message,
            )
            return Response({"detail": exc.message}, status=exc.status)


class AiStyleTryOnJobView(UnthrottledAPIView):
    """GET /ai/style-tryon/{job_id}/ — navbat holati va natija."""

    permission_classes = [IsAuthenticated]

    def get(self, request, job_id: str):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user

        job = get_tryon_job(job_id.strip(), user_id=user.pk)
        if job is None:
            return Response({"detail": "Topilmadi yoki muddati tugagan."}, status=404)
        return Response(job)


class AiStyleTryOnViewsView(UnthrottledAPIView):
    """POST { image, style_id } — front try-on dan left/right/back 360° viewlar."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        blocked = check_user_can_generate(user_id=user.pk, kind="tryon")
        if blocked:
            return morph_generation_blocked_response(blocked)

        image = request.data.get("image")
        style_id = (request.data.get("style_id") or "").strip()
        if not image:
            return Response({"detail": "Front try-on rasmini yuboring."}, status=400)
        if not style_id:
            return Response({"detail": "Uslub tanlang."}, status=400)

        style = get_object_or_404(Hairstyle, style_id=style_id, is_published=True)

        try:
            if is_queue_enabled():
                job_id = enqueue_tryon_multiview_job(
                    user_id=user.pk,
                    front_image=str(image),
                    style_id=style.style_id,
                    style_title=style.title_uz,
                    audience=style.audience,
                    slug=style.slug,
                )
                return Response(
                    {
                        "job_id": job_id,
                        "status": "queued",
                        "style_id": style.style_id,
                        "style_title": style.title_uz,
                    },
                    status=status.HTTP_202_ACCEPTED,
                )

            multi = generate_tryon_multiview(
                front_data_url=str(image),
                audience=style.audience,
                slug=style.slug,
                title=style.title_uz,
            )
            record_ai_generation(
                user_id=user.pk,
                kind="tryon",
                status="success",
                prompt=str(multi.get("prompt") or "tryon_multiview"),
                style_id=style.style_id,
                style_title=style.title_uz,
                model=str(multi.get("model") or ""),
                provider=str(multi.get("provider") or ""),
                prompt_tokens=int(multi.get("prompt_tokens") or 0),
                candidates_tokens=int(multi.get("candidates_tokens") or 0),
                thoughts_tokens=int(multi.get("thoughts_tokens") or 0),
                total_tokens=int(multi.get("total_tokens") or 0),
                cost_usd=multi.get("cost_usd") or 0,
                tokens_estimated=bool(multi.get("tokens_estimated")),
                latency_ms=int(multi.get("latency_ms") or 0),
            )
            views = multi.get("views") or {}
            return Response(
                {
                    "preview_image": views.get("front") or str(image),
                    "views": views,
                    "style_id": style.style_id,
                    "style_title": style.title_uz,
                }
            )
        except AiStyleError as exc:
            record_ai_generation(
                user_id=user.pk,
                kind="tryon",
                status="failed",
                style_id=style.style_id,
                style_title=style.title_uz,
                error_detail=exc.message,
            )
            return Response({"detail": exc.message}, status=exc.status)


class AiFaceCheckView(UnthrottledAPIView):
    """POST { image } — yuz bormi (yuklashdan oldin tekshirish)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        blocked = check_user_can_generate(user_id=user.pk, kind="face_check")
        if blocked:
            return morph_generation_blocked_response(blocked)

        image = request.data.get("image")
        if not image:
            return Response({"detail": "Selfie rasmini yuboring."}, status=400)
        try:
            has_face, usage = check_face_in_data_url(str(image))
            record_ai_generation(
                user_id=user.pk,
                kind="face_check",
                status="success" if has_face else "failed",
                prompt=str(usage.get("prompt") or ""),
                model=str(usage.get("model") or ""),
                provider=str(usage.get("provider") or ""),
                prompt_tokens=int(usage.get("prompt_tokens") or 0),
                candidates_tokens=int(usage.get("candidates_tokens") or 0),
                thoughts_tokens=int(usage.get("thoughts_tokens") or 0),
                total_tokens=int(usage.get("total_tokens") or 0),
                cost_usd=usage.get("cost_usd") or 0,
                tokens_estimated=bool(usage.get("tokens_estimated")),
                latency_ms=int(usage.get("latency_ms") or 0),
                error_detail="" if has_face else NO_FACE_MESSAGE,
            )
            if not has_face:
                return Response({"has_face": False, "detail": NO_FACE_MESSAGE}, status=400)
            return Response({"has_face": True})
        except AiStyleError as exc:
            record_ai_generation(
                user_id=user.pk,
                kind="face_check",
                status="failed",
                error_detail=exc.message,
            )
            return Response({"has_face": False, "detail": exc.message}, status=exc.status)


class AiIngredientScanView(UnthrottledAPIView):
    """POST { image } — kosmetika INCI skani (Pro / morph_care)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user

        if not can_use_morph_care(user):
            return Response(
                {"detail": "Morph AI Parvarish Pro obunasida mavjud."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Kvotada analyze bilan bir xil Morph AI oylik limit
        blocked = check_user_can_generate(user_id=user.pk, kind="analyze")
        if blocked:
            return morph_generation_blocked_response(blocked)

        image = request.data.get("image")
        if not image:
            return Response(
                {"detail": "Mahsulot tarkibi (Ingredients) rasmini yuboring."},
                status=400,
            )

        profile = SkinProfile.objects.filter(user=user).first()
        if profile is None or not profile.is_complete:
            return Response(
                {"detail": "Avval teri profilingizni to'ldiring."},
                status=400,
            )

        try:
            result = analyze_ingredient_from_data_url(str(image), profile)
            usage = result.pop("_usage", None) or {}
            record_ai_generation(
                user_id=user.pk,
                kind="ingredient",
                status="success",
                prompt=str(usage.get("prompt") or ""),
                model=str(usage.get("model") or ""),
                provider=str(usage.get("provider") or ""),
                prompt_tokens=int(usage.get("prompt_tokens") or 0),
                candidates_tokens=int(usage.get("candidates_tokens") or 0),
                thoughts_tokens=int(usage.get("thoughts_tokens") or 0),
                total_tokens=int(usage.get("total_tokens") or 0),
                cost_usd=usage.get("cost_usd") or 0,
                tokens_estimated=bool(usage.get("tokens_estimated")),
                latency_ms=int(usage.get("latency_ms") or 0),
            )
            return Response(result)
        except AiStyleError as exc:
            record_ai_generation(
                user_id=user.pk,
                kind="ingredient",
                status="failed",
                error_detail=exc.message,
            )
            return Response({"detail": exc.message}, status=exc.status)


class AiBarberCardView(UnthrottledAPIView):
    """POST { image, style_name? } — Gemini Barber Master Card JSON."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        blocked = check_user_can_generate(user_id=user.pk, kind="analyze")
        if blocked:
            return morph_generation_blocked_response(blocked)

        image = request.data.get("image")
        style_name = request.data.get("style_name")
        if not image:
            return Response({"detail": "Uslub yoki try-on rasmini yuboring."}, status=400)

        try:
            result = generate_barber_master_card(
                str(image),
                style_name=str(style_name).strip() if style_name else None,
            )
            usage = result.pop("_usage", None) or {}
            record_ai_generation(
                user_id=user.pk,
                kind="analyze",
                status="success",
                prompt=str(usage.get("prompt") or "barber_master_card"),
                model=str(usage.get("model") or ""),
                provider=str(usage.get("provider") or ""),
                prompt_tokens=int(usage.get("prompt_tokens") or 0),
                candidates_tokens=int(usage.get("candidates_tokens") or 0),
                thoughts_tokens=int(usage.get("thoughts_tokens") or 0),
                total_tokens=int(usage.get("total_tokens") or 0),
                cost_usd=usage.get("cost_usd") or 0,
                tokens_estimated=bool(usage.get("tokens_estimated")),
                latency_ms=int(usage.get("latency_ms") or 0),
                style_title=str(style_name or "")[:120],
            )
            return Response(
                {
                    "master_card": result["master_card"],
                    "fallback": bool(result.get("fallback")),
                    "detail": result.get("detail") or "",
                }
            )
        except AiStyleError as exc:
            record_ai_generation(
                user_id=user.pk,
                kind="analyze",
                status="failed",
                error_detail=exc.message,
                style_title=str(style_name or "")[:120],
            )
            return Response({"detail": exc.message}, status=exc.status)


class AiStyleHistoryListCreateView(UnthrottledAPIView):
    """GET — oxirgi 6 ta selfie tarixi; POST — yangi yoki oxirgisini yangilash."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user

        entries = AiStyleHistoryEntry.objects.filter(user=user).order_by("-created_at")[
            :HISTORY_MAX_PER_USER
        ]
        serializer = AiStyleHistoryEntrySerializer(
            entries,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user

        serializer = AiStyleHistoryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        image = (data.get("image") or "").strip()

        if data.get("replace_latest"):
            entry = AiStyleHistoryEntry.objects.filter(user=user).order_by("-created_at").first()
            if entry is None:
                return Response({"detail": "Yangilash uchun tarix topilmadi."}, status=400)
            if image:
                save_history_photo(entry, image)
            entry.face_shape_key = data.get("face_shape_key") or entry.face_shape_key
            entry.hair_type_key = data.get("hair_type_key") or entry.hair_type_key
            entry.hair_color_key = data.get("hair_color_key") or entry.hair_color_key
            entry.hair_texture_key = data.get("hair_texture_key") or entry.hair_texture_key
            entry.beard_key = data.get("beard_key") or entry.beard_key
            entry.source = data["source"]
            entry.save(
                update_fields=[
                    "face_shape_key",
                    "hair_type_key",
                    "hair_color_key",
                    "hair_texture_key",
                    "beard_key",
                    "source",
                ],
            )
            out = AiStyleHistoryEntrySerializer(entry, context={"request": request})
            return Response(out.data)

        if not image:
            return Response({"detail": "Selfie rasmini yuboring."}, status=400)

        entry = AiStyleHistoryEntry.objects.create(
            user=user,
            face_shape_key=data.get("face_shape_key") or "",
            hair_type_key=data.get("hair_type_key") or "",
            hair_color_key=data.get("hair_color_key") or "",
            hair_texture_key=data.get("hair_texture_key") or "",
            beard_key=data.get("beard_key") or "",
            source=data["source"],
        )
        save_history_photo(entry, image)
        trim_user_history(user)
        out = AiStyleHistoryEntrySerializer(entry, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class MorphAiLookShareCreateView(UnthrottledAPIView):
    """POST — create a public before/after share link (auth required)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user

        serializer = MorphAiLookShareCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        after_raw = (data.get("after_image") or "").strip()
        before_raw = (data.get("before_image") or "").strip()
        if not after_raw:
            return Response({"detail": "After rasm kerak."}, status=400)

        share = MorphAiLookShare(
            created_by=user,
            style_id=(data.get("style_id") or "").strip()[:64],
            title=(data.get("title") or "").strip()[:160],
        )
        try:
            share.after_photo.save(
                "after.jpg",
                image_file_from_source(after_raw, f"share-after-{user.pk}"),
                save=False,
            )
            if before_raw:
                share.before_photo.save(
                    "before.jpg",
                    image_file_from_source(before_raw, f"share-before-{user.pk}"),
                    save=False,
                )
        except Exception:
            logger.exception(
                "Look-share rasm saqlanmadi (user=%s style=%s)",
                user.pk,
                (data.get("style_id") or "")[:64],
            )
            return Response({"detail": "Rasmni saqlab bo‘lmadi."}, status=400)

        share.save()
        out = MorphAiLookShareSerializer(share, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class MorphAiLookShareDetailView(UnthrottledAPIView):
    """GET — public look share (no auth)."""

    permission_classes = [AllowAny]

    def get(self, request, share_id):
        share = get_object_or_404(MorphAiLookShare, pk=share_id)
        out = MorphAiLookShareSerializer(share, context={"request": request})
        return Response(out.data)


class MorphAiLookShareViewPingView(UnthrottledAPIView):
    """POST — count one landing view (no auth).

    Kept separate from the detail GET so SSR meta fetches don't inflate the count.
    """

    permission_classes = [AllowAny]

    def post(self, request, share_id):
        updated = MorphAiLookShare.objects.filter(pk=share_id).update(
            view_count=F("view_count") + 1,
            last_viewed_at=timezone.now(),
        )
        if not updated:
            return Response({"detail": "Topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MorphAiGenerationListCreateView(UnthrottledAPIView):
    """GET/POST — try-on & studio generation history (DB-backed media)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        entries = MorphAiGenerationEntry.objects.filter(user=user).order_by("-created_at")[
            :GENERATION_HISTORY_MAX_PER_USER
        ]
        out = MorphAiGenerationSerializer(entries, many=True, context={"request": request})
        return Response(out.data)

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user

        serializer = MorphAiGenerationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        after_raw = (data.get("after_image") or "").strip()
        before_raw = (data.get("before_image") or "").strip()
        if not after_raw:
            return Response({"detail": "After rasm kerak."}, status=400)

        from ai.tryon_persist import persist_tryon_generation

        # Try-on allaqachon serverda saqlangan bo‘lishi mumkin — dedupe bilan yozamiz.
        entry = persist_tryon_generation(
            user=user,
            after_image=after_raw,
            before_image=before_raw or None,
            style_id=(data.get("style_id") or "").strip()[:64],
            title=(data.get("title") or "").strip()[:160],
            persona_id=(data.get("persona_id") or "").strip()[:64],
        )
        if entry is None:
            return Response({"detail": "Rasmni saqlab bo‘lmadi."}, status=400)

        out = MorphAiGenerationSerializer(entry, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class AiStyleStudioCatalogView(UnthrottledAPIView):
    """GET — Morf AI Studio variantlari (soch rangi, uslub, yuz rangi, …)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        from ai.studio_presets import list_studio_catalog

        return Response({"categories": list_studio_catalog()})


class AiStyleStudioEditView(UnthrottledAPIView):
    """POST { image, preset_id } — generatsiya qilingan rasmni studio variantiga o'zgartirish."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        blocked = check_user_can_generate(user_id=user.pk, kind="studio")
        if blocked:
            return morph_generation_blocked_response(blocked)

        image = request.data.get("image")
        preset_id = (request.data.get("preset_id") or "").strip()
        style_id = (request.data.get("style_id") or "").strip()
        style_title = (request.data.get("style_title") or "").strip()
        if not image:
            return Response({"detail": "Rasmni yuboring."}, status=400)
        if not preset_id:
            return Response({"detail": "Studio variantini tanlang."}, status=400)

        from ai.services.gemini_studio_edit import generate_studio_edit
        from ai.studio_presets import get_studio_option

        option = get_studio_option(preset_id)
        if option is None:
            return Response({"detail": "Noto'g'ri studio varianti."}, status=400)

        title_for_log = style_title or f"Studio · {option['label_uz']}"

        try:
            result = generate_studio_edit(
                image_data_url=str(image),
                preset_id=preset_id,
            )
            record_ai_generation(
                user_id=user.pk,
                kind="studio",
                status="success",
                prompt=result.prompt,
                style_id=style_id or result.preset_id,
                style_title=title_for_log[:120],
                model=result.model,
                provider=result.provider,
                prompt_tokens=result.prompt_tokens,
                candidates_tokens=result.candidates_tokens,
                thoughts_tokens=result.thoughts_tokens,
                total_tokens=result.total_tokens,
                cost_usd=result.cost_usd,
                tokens_estimated=result.tokens_estimated,
                latency_ms=result.latency_ms,
            )
            return Response(
                {
                    "preview_image": result.preview_image,
                    "preset_id": result.preset_id,
                    "preset_label": result.preset_label,
                    "style_id": style_id,
                    "style_title": title_for_log,
                }
            )
        except AiStyleError as exc:
            record_ai_generation(
                user_id=user.pk,
                kind="studio",
                status="failed",
                style_id=style_id or preset_id,
                style_title=title_for_log[:120],
                error_detail=exc.message,
            )
            # Model 404 ni route 404 qilib ko'rsatmaslik.
            http_status = (
                status.HTTP_502_BAD_GATEWAY
                if exc.status in (404,)
                else exc.status
            )
            return Response({"detail": exc.message}, status=http_status)
