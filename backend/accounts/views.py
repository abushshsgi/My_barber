from django.db import IntegrityError
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from barbers.barber_auth import encode_barber_tokens
from barbers.models import Barber
from salons.models import SalonMembership

from .barber_availability import BarberCheckAvailabilityView
from .models import User
from .uz_regions import UzRegion
from .serializers import (
    BarberRegisterJoinSalonSerializer,
    BarberSignupSerializer,
    UserSearchSerializer,
    UserSerializer,
)
from .throttles import AuthIPThrottle

__all__ = [
    "BarberCheckAvailabilityView",
    "BarberRegisterJoinSalonView",
    "BarberRegisterView",
    "MeView",
    "UserSearchView",
    "UzRegionsView",
]


class UzRegionsView(APIView):
    """Ro'yxatdan o'tish / admin uchun 12 ta viloyat ro'yxati."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            [{"value": c[0], "label": c[1]} for c in UzRegion.choices]
        )


def _conflict_response():
    return Response(
        {"detail": "Bu email yoki telefon allaqachon ro'yxatdan o'tgan."},
        status=status.HTTP_409_CONFLICT,
    )


class BarberRegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = BarberSignupSerializer
    throttle_classes = [AuthIPThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            barber = serializer.save()
        except IntegrityError:
            return _conflict_response()
        access, refresh = encode_barber_tokens(barber.id)
        Barber.objects.filter(pk=barber.pk).update(last_login=timezone.now())
        rep = BarberSignupSerializer().to_representation(barber)
        return Response(
            {"access": access, "refresh": refresh, "barber": rep},
            status=status.HTTP_201_CREATED,
        )


class BarberRegisterJoinSalonView(APIView):
    """Employee: register + salon join (100 m) bitta tranzaksiya; JWT qaytaradi."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        serializer = BarberRegisterJoinSalonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_sid = request.data.get("salon_id")
        try:
            salon_pk = int(raw_sid)
        except (TypeError, ValueError):
            salon_pk = None
        try:
            barber = serializer.save()
        except IntegrityError:
            return _conflict_response()
        access, refresh = encode_barber_tokens(barber.id)
        Barber.objects.filter(pk=barber.pk).update(last_login=timezone.now())
        rep = BarberSignupSerializer().to_representation(barber)
        mem = None
        if salon_pk is not None:
            mem = SalonMembership.objects.filter(
                barber_id=barber.pk,
                salon_id=int(salon_pk),
                invite_state=SalonMembership.InviteState.ACTIVE,
            ).first()
        body = {"access": access, "refresh": refresh, "barber": rep}
        if salon_pk is not None:
            body["salon_id"] = int(salon_pk)
        if mem is not None:
            body["membership_id"] = mem.id
        return Response(body, status=status.HTTP_201_CREATED)


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
