from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.throttles import AiStyleThrottle, AuthIPThrottle

from .salon_match import attach_salons_to_suggestions
from .services.gemini_style import (
    NO_FACE_MESSAGE,
    AiStyleError,
    analyze_style_from_data_url,
    check_face_in_data_url,
)


class AiStyleAnalyzeView(APIView):
    """POST { image: data-url, audience } — Gemini selfie tahlili."""

    permission_classes = [AllowAny]
    throttle_classes = [AiStyleThrottle, AuthIPThrottle]

    def post(self, request):
        image = request.data.get("image")
        audience = request.data.get("audience") or "unisex"
        face_hint = request.data.get("face_hint")
        if not image:
            return Response({"detail": "Selfie rasmini yuboring."}, status=400)

        try:
            analysis = analyze_style_from_data_url(
                str(image),
                str(audience),
                face_hint=face_hint if isinstance(face_hint, dict) else None,
            )
            suggestions = attach_salons_to_suggestions(analysis["suggestions"])
            return Response(
                {
                    "face_shape": analysis["face_shape"],
                    "hair_type": analysis["hair_type"],
                    "summary_uz": analysis["summary_uz"],
                    "suggestions": suggestions,
                }
            )
        except AiStyleError as exc:
            return Response({"detail": exc.message}, status=exc.status)


class AiFaceCheckView(APIView):
    """POST { image } — yuz bormi (yuklashdan oldin tekshirish)."""

    permission_classes = [AllowAny]
    throttle_classes = [AiStyleThrottle, AuthIPThrottle]

    def post(self, request):
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
