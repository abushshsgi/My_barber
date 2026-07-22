"""AI API views — hech qanday DRF throttle yo'q (faqat obuna/tarif limiiti)."""

from __future__ import annotations

from rest_framework.views import APIView


class UnthrottledAPIView(APIView):
    """DEFAULT_THROTTLE_CLASSES ni ham o'chiradi."""

    throttle_classes: list = []

    def check_throttles(self, request):
        return
