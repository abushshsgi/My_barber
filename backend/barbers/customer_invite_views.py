"""Sartarosh kabineti: mijozlarni MySaloon'ga chaqirish API."""

from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.throttles import BarberWriteThrottle
from barbers.customer_invite import (
    barber_invite_dashboard,
    create_outreach,
    ensure_barber_invite_code,
)
from barbers.models import BarberCustomerOutreach
from barbers.permissions import IsBarber


class BarberCustomerInviteView(APIView):
    """GET — kod, havola, chaqirilgan mijozlar va outreach ro'yxati."""

    permission_classes = [IsBarber]
    throttle_classes = [BarberWriteThrottle]

    def get(self, request):
        barber = request.user.barber
        ensure_barber_invite_code(barber)
        return Response(barber_invite_dashboard(barber))


class BarberCustomerOutreachCreateView(APIView):
    """POST — Telegram/telefon orqali chaqirilgan mijozni log qilish."""

    permission_classes = [IsBarber]
    throttle_classes = [BarberWriteThrottle]

    def post(self, request):
        barber = request.user.barber
        try:
            row = create_outreach(
                barber=barber,
                full_name=str(request.data.get("full_name") or ""),
                phone=str(request.data.get("phone") or ""),
                channel=str(request.data.get("channel") or BarberCustomerOutreach.Channel.TELEGRAM),
                note=str(request.data.get("note") or ""),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        from barbers.customer_invite import _outreach_payload

        return Response(_outreach_payload(row), status=status.HTTP_201_CREATED)


class BarberCustomerOutreachCancelView(APIView):
    """POST — kutilayotgan outreachni bekor qilish."""

    permission_classes = [IsBarber]
    throttle_classes = [BarberWriteThrottle]

    def post(self, request, pk: int):
        barber = request.user.barber
        row = BarberCustomerOutreach.objects.filter(pk=pk, barber=barber).first()
        if not row:
            return Response({"detail": "Topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        if row.status != BarberCustomerOutreach.Status.PENDING:
            return Response(
                {"detail": "Faqat kutilayotgan yozuvni bekor qilish mumkin."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        row.status = BarberCustomerOutreach.Status.CANCELLED
        row.save(update_fields=["status", "updated_at"])
        from barbers.customer_invite import _outreach_payload

        return Response(_outreach_payload(row))
