from rest_framework.response import Response
from rest_framework.views import APIView

from barbers.permissions import IsBarber

from .models import BarberPushToken, UserPushToken


class BarberPushTokenView(APIView):
    """Mobil: Expo push token ro‘yxatdan o‘tkazish / o‘chirish."""

    permission_classes = [IsBarber]

    def post(self, request):
        token = (request.data.get("token") or "").strip()
        if not token or not token.startswith("ExponentPushToken"):
            return Response({"detail": "Noto‘g‘ri Expo push token."}, status=400)
        platform = str(request.data.get("platform") or "")[:16]
        device_name = str(request.data.get("device_name") or "")[:128]
        BarberPushToken.objects.update_or_create(
            token=token,
            defaults={
                "barber": request.user.barber,
                "platform": platform,
                "device_name": device_name,
            },
        )
        return Response({"status": "ok"})

    def delete(self, request):
        token = (
            (request.data.get("token") if isinstance(request.data, dict) else None)
            or request.query_params.get("token")
            or ""
        ).strip()
        qs = BarberPushToken.objects.filter(barber=request.user.barber)
        if token:
            qs.filter(token=token).delete()
        else:
            qs.delete()
        return Response(status=204)


class UserPushTokenView(APIView):
    """User Capacitor: FCM token ro‘yxatdan o‘tkazish / o‘chirish."""

    def post(self, request):
        token = (request.data.get("token") or "").strip()
        if not token or len(token) < 20:
            return Response({"detail": "Noto‘g‘ri FCM token."}, status=400)
        platform = str(request.data.get("platform") or "")[:16]
        device_name = str(request.data.get("device_name") or "")[:128]
        UserPushToken.objects.update_or_create(
            token=token[:512],
            defaults={
                "user": request.user,
                "platform": platform,
                "device_name": device_name,
            },
        )
        return Response({"status": "ok"})

    def delete(self, request):
        token = (
            (request.data.get("token") if isinstance(request.data, dict) else None)
            or request.query_params.get("token")
            or ""
        ).strip()
        qs = UserPushToken.objects.filter(user=request.user)
        if token:
            qs.filter(token=token).delete()
        else:
            qs.delete()
        return Response(status=204)
