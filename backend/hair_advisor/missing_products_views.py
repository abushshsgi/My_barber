"""Admin: Bazamizda yo'q mahsulotlar dashboard."""

from __future__ import annotations

from rest_framework.response import Response

from accounts.permissions import IsAdmin
from ai.unthrottled import UnthrottledAPIView

from hair_advisor.services.missing_products import list_missing_products, missing_products_kpis


class AdminMissingProductsDashboardView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        kpis = missing_products_kpis()
        table = list_missing_products(
            brand=(request.query_params.get("brand") or "").strip(),
            status=(request.query_params.get("status") or "").strip(),
            q=(request.query_params.get("q") or "").strip(),
            sort=(request.query_params.get("sort") or "most_scans").strip(),
            page=int(request.query_params.get("page") or 1),
            page_size=int(request.query_params.get("page_size") or 25),
        )
        return Response({"kpis": kpis, "products": table})