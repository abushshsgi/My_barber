from rest_framework import status
from rest_framework.renderers import JSONRenderer
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import F
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
import base64
import json
import logging

from accounts.models import SkinProfile, User

from ai.age_groups import birth_year_to_group, normalize_age_group, resolve_hairstyle_image_path
from ai.explore_personas import has_persona_style_asset, list_explore_personas, normalize_persona_id
from subscriptions.services import can_use_morph_care, can_use_morph_voice, get_active_subscription

from .history_storage import image_file_from_source, save_history_photo, trim_user_history
from .models import (
    GENERATION_HISTORY_MAX_PER_USER,
    HISTORY_MAX_PER_USER,
    AiStyleHistoryEntry,
    Hairstyle,
    MorphAiChatThread,
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
from .unthrottled import EventStreamRenderer, UnthrottledAPIView
from .usage_log import record_ai_generation
from .morph_ops import check_user_can_generate, morph_generation_blocked_response
from .chat_persist import (
    append_chat_turn,
    clear_user_threads,
    delete_user_thread,
    serialize_thread,
    upsert_thread_from_client,
)
from .privacy_prefs import (
    apply_prefs_patch,
    chat_limits_payload,
    get_or_create_prefs,
    serialize_privacy,
    user_allows_chat_persist,
    user_allows_look_persist,
    wipe_user_morph_data,
)

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


def _chat_should_persist(request) -> bool:
    raw = request.data.get("persist")
    if raw is False or raw == 0 or str(raw).strip().lower() in ("0", "false", "no"):
        return False
    return True


def _apply_chat_token_usage(user, usage: dict) -> dict:
    from subscriptions.services import record_morph_chat_tokens

    record_morph_chat_tokens(user=user, tokens=int(usage.get("total_tokens") or 0))
    return chat_limits_payload(user)


def _chat_thread_id(request) -> str:
    return str(request.data.get("thread_id") or request.data.get("threadId") or "").strip()[:64]


def _voice_feature_blocked(user) -> Response | None:
    """Ovoz STT/TTS — faqat pullik obuna."""
    from ai.models import MorphAiSettings
    from subscriptions.services import check_morph_entitlement

    s = MorphAiSettings.load()
    if not s.analyze_enabled:
        return morph_generation_blocked_response("Morph AI hozir ishlamayapti.")
    blocked = check_morph_entitlement(user=user, kind="voice")
    if blocked:
        return morph_generation_blocked_response(blocked)
    return None


def _read_request_audio(request) -> tuple[bytes, str]:
    uploaded = request.FILES.get("audio") or request.FILES.get("file")
    if uploaded is not None:
        data = uploaded.read()
        mime = (
            getattr(uploaded, "content_type", None)
            or request.data.get("mime")
            or request.data.get("mime_type")
            or "audio/mp4"
        )
        return data, str(mime)
    raw_b64 = request.data.get("audio_base64") or request.data.get("audio")
    if isinstance(raw_b64, str) and raw_b64.strip():
        payload = raw_b64.strip()
        if "base64," in payload:
            payload = payload.split("base64,", 1)[1]
        try:
            data = base64.b64decode(payload, validate=False)
        except Exception as exc:
            raise AiStyleError("Ovoz fayli o'qilmadi.", 400) from exc
        mime = request.data.get("mime") or request.data.get("mime_type") or "audio/mp4"
        return data, str(mime)
    raise AiStyleError("Ovoz faylini yuboring.", 400)


class AiMorphChatView(UnthrottledAPIView):
    """POST { message, history?, context?, stream?, thread_id?, persist? } — Morf AI chatbot."""

    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer, EventStreamRenderer]

    def finalize_response(self, request, response, *args, **kwargs):
        if isinstance(response, StreamingHttpResponse):
            return response
        return super().finalize_response(request, response, *args, **kwargs)

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user

        blocked = check_user_can_generate(user_id=user.pk, kind="chat")
        if blocked:
            return morph_generation_blocked_response(blocked)

        message = request.data.get("message")
        if not message or not str(message).strip():
            return Response({"detail": "Xabar yuboring."}, status=400)

        history = request.data.get("history")
        context_raw = request.data.get("context")
        context = context_raw if isinstance(context_raw, dict) else None
        from ai.chat_prompts import is_voice_mode

        if is_voice_mode(context) and not can_use_morph_voice(user):
            return morph_generation_blocked_response(
                "Ovozli suhbat Starter, Plus yoki Pro obunasida mavjud."
            )
        thread_id = _chat_thread_id(request)
        persist = (
            _chat_should_persist(request)
            and bool(thread_id)
            and user_allows_chat_persist(user)
        )
        if not user_allows_chat_persist(user):
            history = None
        accept = (request.headers.get("Accept") or "").lower()
        wants_stream = bool(request.data.get("stream")) or "text/event-stream" in accept

        if wants_stream:
            return self._stream_reply(
                user=user,
                message=str(message),
                history=history if isinstance(history, list) else None,
                context=context,
                thread_id=thread_id,
                persist=persist,
            )

        try:
            from ai.services.gemini_chat import generate_morf_chat_reply

            result = generate_morf_chat_reply(
                user_message=str(message),
                history=history if isinstance(history, list) else None,
                context=context,
            )
            usage = result.pop("usage", None) or {}
            result.pop("limits", None)

            usage_row = record_ai_generation(
                user_id=user.pk,
                kind="chat",
                status="success",
                prompt="" if not persist else str(usage.get("prompt") or message)[:500],
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
            limits = _apply_chat_token_usage(user, usage)
            reply = result.get("reply") or ""
            if persist:
                append_chat_turn(
                    user_id=user.pk,
                    thread_client_id=thread_id,
                    user_message=str(message),
                    assistant_message=str(reply),
                    context=context,
                    usage_row=usage_row,
                    usage_meta=usage,
                )
            return Response(
                {
                    "reply": reply,
                    "limits": limits,
                    "thread_id": thread_id or None,
                }
            )
        except AiStyleError as exc:
            record_ai_generation(
                user_id=user.pk,
                kind="chat",
                status="failed",
                error_detail=exc.message,
            )
            return Response({"detail": exc.message}, status=exc.status)

    def _stream_reply(self, *, user, message: str, history, context, thread_id: str, persist: bool):
        from ai.services.gemini_chat import stream_morf_chat_reply

        def events():
            try:
                for event in stream_morf_chat_reply(
                    user_message=message,
                    history=history,
                    context=context,
                ):
                    if event.get("delta"):
                        yield f"data: {json.dumps({'delta': event['delta']}, ensure_ascii=False)}\n\n"
                    if event.get("done"):
                        usage = event.get("usage") or {}
                        usage_row = record_ai_generation(
                            user_id=user.pk,
                            kind="chat",
                            status="success",
                            prompt="" if not persist else str(usage.get("prompt") or message)[:500],
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
                        limits = _apply_chat_token_usage(user, usage)
                        reply = event.get("reply") or ""
                        if persist:
                            append_chat_turn(
                                user_id=user.pk,
                                thread_client_id=thread_id,
                                user_message=message,
                                assistant_message=str(reply),
                                context=context,
                                usage_row=usage_row,
                                usage_meta=usage,
                            )
                        yield (
                            "data: "
                            + json.dumps(
                                {
                                    "done": True,
                                    "limits": limits,
                                    "reply": reply,
                                    "thread_id": thread_id or None,
                                },
                                ensure_ascii=False,
                            )
                            + "\n\n"
                        )
            except AiStyleError as exc:
                record_ai_generation(
                    user_id=user.pk,
                    kind="chat",
                    status="failed",
                    error_detail=exc.message,
                )
                yield (
                    "data: "
                    + json.dumps(
                        {"error": exc.message, "status": exc.status},
                        ensure_ascii=False,
                    )
                    + "\n\n"
                )

        response = StreamingHttpResponse(events(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


class AiMorphChatVoiceVoicesView(UnthrottledAPIView):
    """GET — erkak/ayol Gemini TTS ovozlari."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        from ai.services.gemini_voice import list_morph_voices

        return Response(list_morph_voices())


class AiMorphChatVoiceTranscribeView(UnthrottledAPIView):
    """POST multipart/json — nutqni matnga (Gemini STT)."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        blocked = _voice_feature_blocked(user)
        if blocked:
            return blocked
        lang = str(request.data.get("lang") or request.data.get("language") or "auto").strip()
        try:
            from ai.services.gemini_voice import transcribe_audio

            audio_bytes, mime = _read_request_audio(request)
            result = transcribe_audio(audio_bytes=audio_bytes, mime_type=mime, lang=lang)
        except AiStyleError as exc:
            record_ai_generation(
                user_id=user.pk,
                kind="voice_stt",
                status="failed",
                error_detail=exc.message,
            )
            return Response({"detail": exc.message}, status=exc.status)

        usage = result.pop("usage", None) or {}
        record_ai_generation(
            user_id=user.pk,
            kind="voice_stt",
            status="success",
            prompt=str(usage.get("prompt") or result.get("text") or "")[:500],
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


class AiMorphChatVoiceSpeakView(UnthrottledAPIView):
    """POST { text, voice_id?, gender?, lang? } — matnni ovozga (Gemini TTS)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        blocked = _voice_feature_blocked(user)
        if blocked:
            return blocked
        text = str(request.data.get("text") or "").strip()
        if not text:
            return Response({"detail": "Matn yuboring."}, status=400)
        try:
            from ai.services.gemini_voice import synthesize_speech

            result = synthesize_speech(
                text=text,
                voice_id=str(request.data.get("voice_id") or request.data.get("voice") or ""),
                gender=str(request.data.get("gender") or ""),
                lang=str(request.data.get("lang") or request.data.get("language") or ""),
            )
        except AiStyleError as exc:
            record_ai_generation(
                user_id=user.pk,
                kind="voice_tts",
                status="failed",
                error_detail=exc.message,
            )
            return Response({"detail": exc.message}, status=exc.status)

        usage = result.pop("usage", None) or {}
        record_ai_generation(
            user_id=user.pk,
            kind="voice_tts",
            status="success",
            prompt=str(usage.get("prompt") or "")[:500],
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


class MorphAiChatThreadListView(UnthrottledAPIView):
    """GET — chat history; DELETE — barcha threadlarni o'chirish; PUT — sync upsert."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        include_messages = str(request.query_params.get("messages") or "").lower() in (
            "1",
            "true",
            "yes",
        )
        from ai.chat_prompts import MORF_CHAT_MAX_THREADS

        threads = MorphAiChatThread.objects.filter(user=user).order_by("-updated_at")[
            :MORF_CHAT_MAX_THREADS
        ]
        if include_messages:
            threads = threads.prefetch_related("messages")
        return Response(
            [serialize_thread(th, include_messages=include_messages) for th in threads]
        )

    def put(self, request):
        """Bitta threadni to'liq sync qilish: { id, title?, messages?, context?, updated_at? }."""
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        if not user_allows_chat_persist(user):
            return Response(
                {
                    "detail": "Tarixni serverga yubormaslik yoqilgan.",
                    "code": "privacy_local_only",
                },
                status=403,
            )
        client_id = str(request.data.get("id") or request.data.get("thread_id") or "").strip()
        if not client_id:
            return Response({"detail": "thread id kerak."}, status=400)
        try:
            thread = upsert_thread_from_client(
                user_id=user.pk,
                client_id=client_id,
                title=str(request.data.get("title") or ""),
                context=request.data.get("context")
                if isinstance(request.data.get("context"), dict)
                else None,
                messages=request.data.get("messages")
                if isinstance(request.data.get("messages"), list)
                else None,
                updated_at=str(request.data.get("updated_at") or "") or None,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(serialize_thread(thread, include_messages=True))

    def delete(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        try:
            cleared = clear_user_threads(user_id=user.pk)
        except Exception:
            logger.exception("Morph chat threads o'chirilmadi user=%s", user.pk)
            return Response(
                {
                    "ok": False,
                    "detail": "Chatlarni o'chirish amalga oshmadi. Qayta urinib ko'ring.",
                },
                status=500,
            )
        return Response({"ok": True, "deleted": cleared, "remaining": 0})


class MorphAiChatThreadDetailView(UnthrottledAPIView):
    """GET / DELETE — bitta chat thread (client_id bo'yicha)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, client_id: str):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        thread = get_object_or_404(
            MorphAiChatThread.objects.prefetch_related("messages"),
            user=user,
            client_id=str(client_id).strip()[:64],
        )
        return Response(serialize_thread(thread, include_messages=True))

    def delete(self, request, client_id: str):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        ok = delete_user_thread(user_id=user.pk, client_id=str(client_id))
        if not ok:
            return Response({"detail": "Topilmadi."}, status=404)
        return Response({"ok": True})


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

        if not user_allows_look_persist(user):
            return Response({"ok": True, "stored": False, "code": "privacy_local_only"})

        serializer = AiStyleHistoryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        image = (data.get("image") or "").strip()

        if data.get("replace_latest"):
            entry = AiStyleHistoryEntry.objects.filter(user=user).order_by("-created_at").first()
            if entry is not None:
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
            # Tarix bo‘sh — pastda yangi yozuv yaratamiz.

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

    def delete(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        deleted = wipe_user_morph_data(user_id=user.pk, kind="selfies")
        return Response({"ok": True, "deleted": deleted["selfies"]})


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

        if not user_allows_look_persist(user):
            return Response({"ok": True, "stored": False, "code": "privacy_local_only"})

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

    def delete(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        deleted = wipe_user_morph_data(user_id=user.pk, kind="looks")
        return Response({"ok": True, "deleted": deleted["looks"]})


class MorphAiPrivacyView(UnthrottledAPIView):
    """GET/PATCH — Morph AI maxfiylik, limit va ma'lumotlar hisobi."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        return Response(serialize_privacy(user))

    def patch(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        prefs = get_or_create_prefs(user)
        allowed_before = user_allows_chat_persist(user)
        payload = dict(request.data or {})
        nested = payload.get("prefs")
        if isinstance(nested, dict):
            payload = {**payload, **nested}
        prefs = apply_prefs_patch(prefs, payload)
        allowed_after = bool(prefs.save_chat_history) and not bool(prefs.privacy_local_only)
        if allowed_before and not allowed_after:
            wipe_user_morph_data(user_id=user.pk, kind="chats")
        return Response(serialize_privacy(user))


class MorphAiPrivacyDataView(UnthrottledAPIView):
    """DELETE — serverdagi Morph ma'lumotlarini o'chirish. { kind: chats|looks|selfies|shares|all }"""

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        kind = str(
            request.data.get("kind")
            or request.query_params.get("kind")
            or "all"
        ).strip()
        try:
            deleted = wipe_user_morph_data(user_id=user.pk, kind=kind)
        except ValueError as exc:
            return Response({"ok": False, "detail": str(exc)}, status=400)
        except Exception:
            logger.exception("Morph privacy data o'chirilmadi user=%s kind=%s", user.pk, kind)
            return Response(
                {
                    "ok": False,
                    "detail": "Ma'lumotlarni o'chirish amalga oshmadi. Qayta urinib ko'ring.",
                },
                status=500,
            )
        return Response({"ok": True, "deleted": deleted, **serialize_privacy(user)})


class MorphAiChatLimitsView(UnthrottledAPIView):
    """GET — chat token limiti (xabar yubormasdan)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user
        return Response(chat_limits_payload(user))


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
