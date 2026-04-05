import jwt
from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.throttles import AuthIPThrottle
from barbers.barber_auth import encode_barber_tokens
from barbers.models import Barber
from barbers.permissions import IsBarber


class BarberTokenView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        if email:
            has_user = User.objects.filter(email__iexact=email).exists()
            has_barber = Barber.objects.filter(email__iexact=email).exists()
            if has_user and not has_barber:
                return Response(
                    {
                        "detail": "Bu email mijoz akkauntiga tegishli. Sartarosh panelidan kirish mumkin emas — mijoz ilovasidan kiring.",
                    },
                    status=401,
                )
        b = Barber.objects.filter(email__iexact=email, is_active=True).first()
        if not b or not b.check_password(password):
            return Response({"detail": "Noto‘g‘ri email yoki parol."}, status=401)
        access, refresh = encode_barber_tokens(b.id)
        Barber.objects.filter(pk=b.pk).update(last_login=timezone.now())
        return Response({"access": access, "refresh": refresh})


class BarberTokenRefreshView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        raw = request.data.get("refresh") or ""
        if not raw:
            return Response({"detail": "Refresh token required."}, status=400)
        try:
            payload = jwt.decode(
                raw, settings.JWT_HS256_SIGNING_KEY, algorithms=["HS256"]
            )
        except jwt.PyJWTError:
            return Response({"detail": "Token invalid."}, status=401)
        if payload.get("type") != "barber_refresh":
            return Response({"detail": "Wrong token type."}, status=401)
        bid = payload.get("barber_id")
        b = Barber.objects.filter(pk=bid, is_active=True).first()
        if not b:
            return Response({"detail": "Barber not found."}, status=401)
        access, refresh = encode_barber_tokens(b.id)
        return Response({"access": access, "refresh": refresh})


class BarberMeView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        b = request.user.barber
        return Response(
            {
                "id": b.id,
                "email": b.email,
                "full_name": b.full_name,
                "phone": b.phone,
                "role": "BARBER",
            }
        )
