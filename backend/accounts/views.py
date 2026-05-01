from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from barbers.barber_auth import encode_barber_tokens
from barbers.models import Barber

from .models import User
from .uz_regions import UzRegion
from .serializers import (
    BarberRegisterJoinSalonSerializer,
    BarberSignupSerializer,
    EmailTokenObtainPairSerializer,
    UserRegisterSerializer,
    UserSearchSerializer,
    UserSerializer,
)
from .throttles import AuthIPThrottle


class UzRegionsView(APIView):
    """Ro'yxatdan o'tish / admin uchun 12 ta viloyat ro'yxati."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            [{"value": c[0], "label": c[1]} for c in UzRegion.choices]
        )


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserRegisterSerializer
    throttle_classes = [AuthIPThrottle]


class BarberRegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = BarberSignupSerializer
    throttle_classes = [AuthIPThrottle]


class BarberRegisterJoinSalonView(APIView):
    """Employee: register + salon join (100 m) bitta tranzaksiya; JWT qaytaradi."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        serializer = BarberRegisterJoinSalonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        barber = serializer.save()
        access, refresh = encode_barber_tokens(barber.id)
        Barber.objects.filter(pk=barber.pk).update(last_login=timezone.now())
        rep = BarberSignupSerializer().to_representation(barber)
        return Response(
            {"access": access, "refresh": refresh, "barber": rep},
            status=status.HTTP_201_CREATED,
        )


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [AuthIPThrottle]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserSearchView(generics.ListAPIView):
    serializer_class = UserSearchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        q = self.request.query_params.get("q", "").strip()
        qs = User.objects.filter(role=User.Role.USER)
        if not q:
            return qs.none()
        from django.db.models import Q

        return qs.filter(
            Q(email__icontains=q)
            | Q(phone__icontains=q)
            | Q(full_name__icontains=q)
        )[:20]
