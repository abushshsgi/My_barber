from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.google_auth import google_web_client_id, is_google_auth_configured
from accounts.permissions import IsAdmin

from .models import PlatformSettings


def _payload(row: PlatformSettings) -> dict:
    payload = {
        "maintenance_banner_enabled": bool(row.maintenance_banner_enabled),
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }
    if is_google_auth_configured():
        web_id = google_web_client_id()
        if web_id:
            payload["google_oauth_client_id"] = web_id
    return payload


class SiteConfigView(APIView):
    """Ochiq konfig — mijoz veb-ilova banner holati uchun."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(_payload(PlatformSettings.load()))


class AdminPlatformSettingsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(_payload(PlatformSettings.load()))

    def patch(self, request):
        row = PlatformSettings.load()
        data = request.data or {}
        if "maintenance_banner_enabled" in data:
            row.maintenance_banner_enabled = bool(data["maintenance_banner_enabled"])
        row.save(update_fields=["maintenance_banner_enabled", "updated_at"])
        return Response(_payload(row))
