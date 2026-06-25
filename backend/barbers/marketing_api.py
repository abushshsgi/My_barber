"""Barber marketing boost / top listing APIs."""

from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.throttles import BarberWriteThrottle
from barbers.models import BarberPromotion
from barbers.permissions import IsBarber

BOOST_PACKAGES = {
    "week": {"days": 7, "amount": Decimal("99000"), "label": "1 hafta TOP"},
    "month": {"days": 30, "amount": Decimal("299000"), "label": "1 oy TOP"},
}


class BarberMarketingBoostView(APIView):
    permission_classes = [IsBarber]
    throttle_classes = [BarberWriteThrottle]

    def get(self, request):
        barber = request.user.barber
        now = timezone.now()
        active = (
            BarberPromotion.objects.filter(
                barber=barber,
                promotion_type=BarberPromotion.Type.TOP_LISTING,
                status=BarberPromotion.Status.ACTIVE,
                ends_at__gt=now,
            )
            .order_by("-ends_at")
            .first()
        )
        return Response(
            {
                "packages": [
                    {"key": k, "days": v["days"], "amount": str(v["amount"]), "label": v["label"]}
                    for k, v in BOOST_PACKAGES.items()
                ],
                "active": (
                    {
                        "id": active.id,
                        "ends_at": active.ends_at.isoformat(),
                        "amount_paid": str(active.amount_paid),
                    }
                    if active
                    else None
                ),
            }
        )

    def post(self, request):
        barber = request.user.barber
        package = str(request.data.get("package", "") or "").strip()
        pkg = BOOST_PACKAGES.get(package)
        if not pkg:
            return Response({"detail": "Noto'g'ri paket."}, status=400)

        now = timezone.now()
        ends = now + timezone.timedelta(days=pkg["days"])
        promo = BarberPromotion.objects.create(
            barber=barber,
            promotion_type=BarberPromotion.Type.TOP_LISTING,
            status=BarberPromotion.Status.PENDING,
            starts_at=now,
            ends_at=ends,
            amount_paid=pkg["amount"],
            region=barber.region or "",
            notes=f"package={package}",
        )
        return Response(
            {
                "id": promo.id,
                "status": promo.status,
                "message": "So'rov admin tasdiqidan keyin faollashadi.",
                "amount": str(pkg["amount"]),
                "ends_at": ends.isoformat(),
            },
            status=201,
        )
