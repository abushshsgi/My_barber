from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.throttles import AiStyleThrottle, AuthIPThrottle

from .salon_match import attach_salons_to_suggestions
from .services.gemini_style import AiStyleError, analyze_style_from_data_url


class AiStyleAnalyzeView(APIView):
    """POST { image: data-url, audience } — Gemini selfie tahlili."""

    permission_classes = [AllowAny]
    throttle_classes = [AiStyleThrottle, AuthIPThrottle]

    def post(self, request):
        image = request.data.get("image")
        audience = request.data.get("audience") or "unisex"
        if not image:
            return Response({"detail": "Selfie rasmini yuboring."}, status=400)

        try:
            analysis = analyze_style_from_data_url(str(image), str(audience))
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
