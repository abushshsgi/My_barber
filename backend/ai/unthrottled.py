"""AI API views — hech qanday DRF throttle yo'q (faqat obuna/tarif limiiti)."""

from __future__ import annotations

from rest_framework import status
from rest_framework.exceptions import NotAcceptable
from rest_framework.renderers import BaseRenderer
from rest_framework.response import Response
from rest_framework.views import APIView


class EventStreamRenderer(BaseRenderer):
    media_type = "text/event-stream"
    format = "txt"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return b""
        if isinstance(data, (bytes, bytearray)):
            return bytes(data)
        return str(data).encode("utf-8")


class UnthrottledAPIView(APIView):
    """DEFAULT_THROTTLE_CLASSES ni ham o'chiradi."""

    throttle_classes: list = []

    def check_throttles(self, request):
        return

    def handle_exception(self, exc):
        if isinstance(exc, NotAcceptable):
            return Response(
                {
                    "detail": (
                        "AI vaqtincha ishlamayapti. "
                        "Bir ozdan keyin qayta urinib ko‘ring."
                    )
                },
                status=status.HTTP_406_NOT_ACCEPTABLE,
            )
        return super().handle_exception(exc)
