from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from notifications.utils import notify_barber, notify_user

from barbers.permissions import IsBarber

from .models import BarberApplication, User
from .permissions import IsAdmin
from .uz_regions import UzRegion
from .serializers import (
    BarberApplicationSerializer,
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


class BarberApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin: list/detail barber applications."""

    permission_classes = [IsAdmin]
    queryset = BarberApplication.objects.select_related("barber").all()
    serializer_class = BarberApplicationSerializer

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        app = self.get_object()
        app.status = BarberApplication.Status.APPROVED
        app.reviewed_at = timezone.now()
        app.save()
        notify_barber(
            app.barber,
            "barber_approved",
            "MyBarber: ro'yxatdan o'tish tasdiqlandi",
            f"Salom! {app.shop_name} uchun arizangiz tasdiqlandi. Endi tizimga kirishingiz mumkin.",
            send_email=True,
        )
        return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        app = self.get_object()
        app.status = BarberApplication.Status.REJECTED
        app.reviewed_at = timezone.now()
        app.save()
        notify_barber(
            app.barber,
            "barber_rejected",
            "MyBarber: ariza",
            "Arizangiz rad etildi.",
            send_email=True,
        )
        return Response({"status": "rejected"})


class MyBarberApplicationStatusView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        b = request.user.barber
        try:
            app = b.barber_application
        except BarberApplication.DoesNotExist:
            return Response({"status": None})
        from .serializers import BarberApplicationSerializer

        return Response(BarberApplicationSerializer(app).data)
