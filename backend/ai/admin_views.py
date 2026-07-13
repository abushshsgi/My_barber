"""Admin Morph AI analytics API."""

from __future__ import annotations

from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin

from ai.morph_analytics import build_morph_ai_analytics


class AdminMorphAiAnalyticsView(APIView):
    """GET — Morph AI (AI Style) foydalanish, token va xarajat analytics."""

    permission_classes = [IsAdmin]

    def get(self, request):
        limit = request.query_params.get("limit")
        top = request.query_params.get("top")
        try:
            recent_limit = max(1, min(200, int(limit))) if limit else 50
        except (TypeError, ValueError):
            recent_limit = 50
        try:
            top_limit = max(1, min(100, int(top))) if top else 20
        except (TypeError, ValueError):
            top_limit = 20

        return Response(
            build_morph_ai_analytics(
                request.query_params.get("start"),
                request.query_params.get("end"),
                recent_limit=recent_limit,
                top_limit=top_limit,
            )
        )
