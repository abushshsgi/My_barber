"""Admin: sartarosh mijoz-chaqirishlari — statistika va to'liq ro'yxat."""

from __future__ import annotations

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from barbers.customer_invite import admin_invite_stats, ensure_barber_invite_code
from barbers.models import Barber, BarberCustomerInvite, BarberCustomerOutreach
from control_panel.views import AdminPageNumberPagination


def _invite_admin_row(invite: BarberCustomerInvite) -> dict:
    barber = invite.barber
    return {
        "id": invite.pk,
        "joined_at": invite.created_at.isoformat() if invite.created_at else None,
        "source": invite.source,
        "code_used": invite.code_used,
        "customer": {
            "id": invite.customer_id,
            "full_name": invite.customer_full_name
            or getattr(invite.customer, "full_name", "")
            or "Foydalanuvchi",
            "phone": invite.customer_phone or getattr(invite.customer, "phone", None),
            "email": getattr(invite.customer, "email", None),
        },
        "barber": {
            "id": barber.pk,
            "full_name": barber.full_name or "",
            "email": barber.email,
            "phone": barber.phone,
            "invite_code": barber.customer_invite_code or "",
            "business_kind": barber.business_kind or "",
        },
        "outreach_id": invite.outreach_id,
    }


class AdminBarberCustomerInviteStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            days = int(request.query_params.get("days") or 30)
        except (TypeError, ValueError):
            days = 30
        return Response(admin_invite_stats(days=days))


class AdminBarberCustomerInviteListView(APIView):
    """Barcha attributionlar — kim, qachon, qaysi sartarosh."""

    permission_classes = [IsAdmin]

    def get(self, request):
        qs = (
            BarberCustomerInvite.objects.select_related("barber", "customer", "outreach")
            .order_by("-created_at", "-id")
        )
        barber_id = request.query_params.get("barber_id", "").strip()
        if barber_id.isdigit():
            qs = qs.filter(barber_id=int(barber_id))
        source = request.query_params.get("source", "").strip()
        if source:
            qs = qs.filter(source=source)
        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(customer_full_name__icontains=q)
                | Q(customer_phone__icontains=q)
                | Q(barber__full_name__icontains=q)
                | Q(barber__email__icontains=q)
                | Q(barber__phone__icontains=q)
                | Q(code_used__icontains=q)
            )
        paginator = AdminPageNumberPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response([_invite_admin_row(i) for i in page])


class AdminBarberCustomerInviteDetailView(APIView):
    """Bitta sartarosh: kod, chaqirilganlar, outreachlar."""

    permission_classes = [IsAdmin]

    def get(self, request, pk: int):
        barber = get_object_or_404(Barber, pk=pk)
        code = ensure_barber_invite_code(barber)
        invites = list(
            BarberCustomerInvite.objects.filter(barber=barber)
            .select_related("customer", "outreach")
            .order_by("-created_at", "-id")[:200]
        )
        outreaches = list(
            BarberCustomerOutreach.objects.filter(barber=barber).order_by(
                "-created_at", "-id"
            )[:200]
        )
        counts = BarberCustomerOutreach.objects.filter(barber=barber).aggregate(
            outreach_total=Count("id"),
            outreach_pending=Count(
                "id", filter=Q(status=BarberCustomerOutreach.Status.PENDING)
            ),
            outreach_joined=Count(
                "id", filter=Q(status=BarberCustomerOutreach.Status.JOINED)
            ),
        )
        invite_count = BarberCustomerInvite.objects.filter(barber=barber).count()
        return Response(
            {
                "barber": {
                    "id": barber.pk,
                    "full_name": barber.full_name or "",
                    "email": barber.email,
                    "phone": barber.phone,
                    "business_kind": barber.business_kind or "",
                },
                "code": code,
                "invite_count": invite_count,
                "outreach_total": counts["outreach_total"] or 0,
                "outreach_pending": counts["outreach_pending"] or 0,
                "outreach_joined": counts["outreach_joined"] or 0,
                "invites": [_invite_admin_row(i) for i in invites],
                "outreaches": [
                    {
                        "id": o.pk,
                        "full_name": o.full_name,
                        "phone": o.phone or None,
                        "channel": o.channel,
                        "note": o.note,
                        "status": o.status,
                        "joined_customer_id": o.joined_customer_id,
                        "joined_at": o.joined_at.isoformat() if o.joined_at else None,
                        "created_at": o.created_at.isoformat() if o.created_at else None,
                    }
                    for o in outreaches
                ],
            }
        )


class AdminBarberInviteLeaderboardView(APIView):
    """Sartaroshlar reytingi — nechta mijoz chaqirgan."""

    permission_classes = [IsAdmin]

    def get(self, request):
        qs = (
            Barber.objects.annotate(
                invite_count=Count("customer_invites", distinct=True),
                outreach_count=Count("customer_outreaches", distinct=True),
            )
            .filter(Q(invite_count__gt=0) | Q(outreach_count__gt=0) | Q(customer_invite_code__isnull=False))
            .order_by("-invite_count", "-outreach_count", "id")
        )
        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(full_name__icontains=q)
                | Q(email__icontains=q)
                | Q(phone__icontains=q)
                | Q(customer_invite_code__icontains=q)
            )
        only_with = request.query_params.get("only_with_invites")
        if only_with in ("1", "true", "yes"):
            qs = qs.filter(invite_count__gt=0)

        paginator = AdminPageNumberPagination()
        page = paginator.paginate_queryset(qs, request)
        rows = [
            {
                "barber_id": b.pk,
                "full_name": b.full_name or "",
                "email": b.email,
                "phone": b.phone,
                "invite_code": b.customer_invite_code or "",
                "business_kind": b.business_kind or "",
                "invite_count": b.invite_count,
                "outreach_count": b.outreach_count,
            }
            for b in page
        ]
        return paginator.get_paginated_response(rows)
