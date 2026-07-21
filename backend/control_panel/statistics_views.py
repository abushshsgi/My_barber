"""Admin statistika API — platforma B2B/B2C ko'rsatkichlari va CSV eksport."""

from __future__ import annotations

from rest_framework import status as http_status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from bookings.serializers import BookingSerializer
from config.api_cache import cached_json

from .export_csv import build_csv_response
from .live_analytics import build_live_platform_analytics
from .platform_analytics import (
    build_bookings_analytics,
    build_bookings_rows,
    build_platform_overview,
    build_revenue_analytics,
    build_wallet_analytics,
    resolve_range,
)
from .salon_growth import build_salon_platform_analytics
from .user_signups import build_user_signup_analytics


def _range_from_request(request):
    return resolve_range(
        request.query_params.get("start"),
        request.query_params.get("end"),
    )


class AdminStatisticsOverviewView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        start_dt, end_dt = _range_from_request(request)
        payload = cached_json(
            prefix="admin:stats:overview",
            parts={"start": start_dt.isoformat(), "end": end_dt.isoformat()},
            producer=lambda: build_platform_overview(start_dt, end_dt),
            ttl=8,
        )
        return Response(payload)


class AdminStatisticsLiveView(APIView):
    """GET — mijoz / sartarosh / salon ro'yxatdan o'tish real vaqt."""

    permission_classes = [IsAdmin]

    def get(self, request):
        limit = _safe_limit(request.query_params.get("limit"), default=50)
        payload = cached_json(
            prefix="admin:stats:live",
            parts={"limit": limit},
            producer=lambda: build_live_platform_analytics(recent_limit=limit),
            ttl=5,
        )
        return Response(payload)


class AdminStatisticsRevenueView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        start_dt, end_dt = _range_from_request(request)
        granularity = (request.query_params.get("granularity") or "month").strip()
        if granularity not in ("day", "week", "month"):
            granularity = "month"
        payload = cached_json(
            prefix="admin:stats:revenue",
            parts={
                "start": start_dt.isoformat(),
                "end": end_dt.isoformat(),
                "granularity": granularity,
            },
            producer=lambda: build_revenue_analytics(start_dt, end_dt, granularity),
            ttl=10,
        )
        return Response(payload)


class AdminStatisticsUsersView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        limit = _safe_limit(request.query_params.get("limit"), default=100)
        payload = cached_json(
            prefix="admin:stats:users",
            parts={"limit": limit},
            producer=lambda: build_user_signup_analytics(recent_limit=limit),
            ttl=8,
        )
        return Response(payload)


class AdminStatisticsSalonsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        limit = _safe_limit(request.query_params.get("limit"), default=100)
        payload = cached_json(
            prefix="admin:stats:salons",
            parts={"limit": limit},
            producer=lambda: build_salon_platform_analytics(recent_limit=limit),
            ttl=8,
        )
        return Response(payload)


class AdminStatisticsWalletView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        start_dt, end_dt = _range_from_request(request)
        limit = _safe_limit(request.query_params.get("limit"), default=100)
        payload = cached_json(
            prefix="admin:stats:wallet",
            parts={
                "start": start_dt.isoformat(),
                "end": end_dt.isoformat(),
                "limit": limit,
            },
            producer=lambda: build_wallet_analytics(start_dt, end_dt, recent_limit=limit),
            ttl=8,
        )
        return Response(payload)


class _BookingsStatsPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class AdminStatisticsBookingsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        start_dt, end_dt = _range_from_request(request)
        analytics = build_bookings_analytics(start_dt, end_dt)

        status_value = (request.query_params.get("status") or "").strip()
        payment_method = (request.query_params.get("payment_method") or "").strip()
        rows_qs = build_bookings_rows(
            start_dt, end_dt, status=status_value, payment_method=payment_method
        )

        paginator = _BookingsStatsPagination()
        page = paginator.paginate_queryset(rows_qs, request, view=self)
        serializer = BookingSerializer(page, many=True)

        return Response(
            {
                **analytics,
                "results": serializer.data,
                "count": paginator.page.paginator.count,
                "page": paginator.page.number,
                "total_pages": paginator.page.paginator.num_pages,
            }
        )


class AdminStatisticsExportView(APIView):
    """CSV eksport — ?type= overview|revenue|users|salons|wallet|bookings."""

    permission_classes = [IsAdmin]

    def get(self, request, export_type: str):
        start_dt, end_dt = _range_from_request(request)
        response = build_csv_response(export_type, start_dt, end_dt, request)
        if response is None:
            return Response(
                {"detail": "Noma'lum eksport turi."},
                status=http_status.HTTP_404_NOT_FOUND,
            )
        return response


def _safe_limit(raw, *, default: int) -> int:
    try:
        return max(1, min(500, int(raw)))
    except (TypeError, ValueError):
        return default
