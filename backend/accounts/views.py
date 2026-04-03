from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from notifications.utils import notify_user

from .models import BarberApplication, User
from .permissions import IsAdmin
from .serializers import (
    BarberApplicationSerializer,
    BarberSignupSerializer,
    EmailTokenObtainPairSerializer,
    UserRegisterSerializer,
    UserSearchSerializer,
    UserSerializer,
)
from .throttles import AuthIPThrottle


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
    queryset = BarberApplication.objects.select_related("user").all()
    serializer_class = BarberApplicationSerializer

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        app = self.get_object()
        app.status = BarberApplication.Status.APPROVED
        app.reviewed_at = timezone.now()
        app.save()
        notify_user(
            app.user,
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
        notify_user(
            app.user,
            "barber_rejected",
            "MyBarber: ariza",
            "Arizangiz rad etildi.",
            send_email=True,
        )
        return Response({"status": "rejected"})


class MyBarberApplicationStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.BARBER_OWNER:
            return Response({"detail": "Not a barber owner."}, status=400)
        try:
            app = request.user.barber_application
        except BarberApplication.DoesNotExist:
            return Response({"status": None})
        from .serializers import BarberApplicationSerializer

        return Response(BarberApplicationSerializer(app).data)
