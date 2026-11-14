from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.google_auth import google_web_client_id, is_google_auth_configured
from accounts.permissions import IsAdmin

from .models import PlatformSettings


def _coerce_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in ("", "0", "false", "no", "off"):
            return False
        if normalized in ("1", "true", "yes", "on"):
            return True
    return bool(value)


def _no_store(response: Response) -> Response:
    response["Cache-Control"] = "no-store, max-age=0, must-revalidate"
    response["Pragma"] = "no-cache"
    return response


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
        return _no_store(Response(_payload(PlatformSettings.load())))


class AdminPlatformSettingsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return _no_store(Response(_payload(PlatformSettings.load())))

    def patch(self, request):
        row = PlatformSettings.load()
        data = request.data or {}
        if "maintenance_banner_enabled" in data:
            row.maintenance_banner_enabled = _coerce_bool(data["maintenance_banner_enabled"])
        row.save(update_fields=["maintenance_banner_enabled", "updated_at"])
        return _no_store(Response(_payload(row)))
