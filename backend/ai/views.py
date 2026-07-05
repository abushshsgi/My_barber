from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from accounts.models import User
from accounts.throttles import AiStyleThrottle, AiTryOnThrottle, AuthIPThrottle

from ai.age_groups import birth_year_to_group, normalize_age_group, resolve_hairstyle_image_path
from ai.explore_personas import has_persona_style_asset, list_explore_personas, normalize_persona_id

from .history_storage import save_history_photo, trim_user_history
from .models import HISTORY_MAX_PER_USER, AiStyleHistoryEntry, Hairstyle
from .salon_match import attach_salons_to_suggestions
from .serializers import (
    AiStyleHistoryCreateSerializer,
    AiStyleHistoryEntrySerializer,
    HairstyleSerializer,
)
from .style_recommend import (
    build_suggestions_from_analysis,
    normalize_request_audience,
    resolve_ai_style_audience,
)
from .services.gemini_tryon import generate_tryon_preview
from .services.tryon_queue import enqueue_tryon_job, get_tryon_job, is_queue_enabled
from .services.gemini_style import (
    NO_FACE_MESSAGE,
    AiStyleError,
    analyze_style_from_data_url,
    check_face_in_data_url,
)


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


class ExplorePersonaListView(APIView):
    """GET — erkak Explore personajlari ro'yxati."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(list_explore_personas())


class HairstyleListView(APIView):
    """GET ?audience=men|women&age_group=kids|teen|young|adult|mature — Explore katalogi."""

    permission_classes = [AllowAny]

    def get(self, request):
        audience = (request.query_params.get("audience") or "").strip().lower()
        age_group = _resolve_age_group(request)
        persona_id = _resolve_persona_id(request, audience if audience in {"men", "women"} else None)
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
            context={"age_group": age_group, "persona_id": persona_id},
        )
        return Response(serializer.data)


class HairstyleDetailView(APIView):
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


class AiStyleAnalyzeView(APIView):
    """POST { image: data-url, audience } — Gemini selfie tahlili."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [AiStyleThrottle, AuthIPThrottle]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user

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
                    "summary_uz": analysis["summary_uz"],
                    "detected_gender": analysis["detected_gender"],
                    "suggestions": suggestions,
                }
            )
        except AiStyleError as exc:
            return Response({"detail": exc.message}, status=exc.status)


class AiStyleTryOnView(APIView):
    """POST { image, style_id } — selfie + uslub bo'yicha AI preview rasm."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [AiTryOnThrottle, AuthIPThrottle]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user

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

            preview_image = generate_tryon_preview(
                selfie_data_url=str(image),
                audience=style.audience,
                slug=style.slug,
                title=style.title_uz,
                reference_image_url=reference_url,
            )
            return Response(
                {
                    "preview_image": preview_image,
                    "style_id": style.style_id,
                    "style_title": style.title_uz,
                }
            )
        except AiStyleError as exc:
            return Response({"detail": exc.message}, status=exc.status)


class AiStyleTryOnJobView(APIView):
    """GET /ai/style-tryon/{job_id}/ — navbat holati va natija."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthIPThrottle]

    def get(self, request, job_id: str):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user

        job = get_tryon_job(job_id.strip(), user_id=user.pk)
        if job is None:
            return Response({"detail": "Topilmadi yoki muddati tugagan."}, status=404)
        return Response(job)


class AiFaceCheckView(APIView):
    """POST { image } — yuz bormi (yuklashdan oldin tekshirish)."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [AiStyleThrottle, AuthIPThrottle]

    def post(self, request):
        user = _require_customer_user(request)
        if isinstance(user, Response):
            return user

        image = request.data.get("image")
        if not image:
            return Response({"detail": "Selfie rasmini yuboring."}, status=400)
        try:
            has_face = check_face_in_data_url(str(image))
            if not has_face:
                return Response({"has_face": False, "detail": NO_FACE_MESSAGE}, status=400)
            return Response({"has_face": True})
        except AiStyleError as exc:
            return Response({"has_face": False, "detail": exc.message}, status=exc.status)


class AiStyleHistoryListCreateView(APIView):
    """GET — oxirgi 6 ta selfie tarixi; POST — yangi yoki oxirgisini yangilash."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthIPThrottle]

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
            entry.source = data["source"]
            entry.save(
                update_fields=["face_shape_key", "hair_type_key", "source"],
            )
            out = AiStyleHistoryEntrySerializer(entry, context={"request": request})
            return Response(out.data)

        if not image:
            return Response({"detail": "Selfie rasmini yuboring."}, status=400)

        entry = AiStyleHistoryEntry.objects.create(
            user=user,
            face_shape_key=data.get("face_shape_key") or "",
            hair_type_key=data.get("hair_type_key") or "",
            source=data["source"],
        )
        save_history_photo(entry, image)
        trim_user_history(user)
        out = AiStyleHistoryEntrySerializer(entry, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)
