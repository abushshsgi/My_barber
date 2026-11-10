from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from analytics.hooks import tracking_since
from analytics.journey import _page, directory, journey
from analytics.metrics import (
    ai_report,
    build_overview,
    feature_usage,
    funnel_report,
    limitations,
    payment_counts,
    revenue_report,
    source_report,
    visitor_counts,
)
from analytics.periods import resolve_period
from config.api_cache import cached_json
from control_panel.models import SiteVisitor


def _period(request):
    return resolve_period(
        request.query_params.get("preset"),
        request.query_params.get("start"),
        request.query_params.get("end"),
    )


def _window(request):
    raw = request.query_params.get("window_days")
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


class AnalyticsIngestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    def post(self, request):
        from analytics.ingest import ingest_client_events
        from accounts.models import User

        user = getattr(request, "user", None)
        if not isinstance(user, User):
            # AllowAny with empty authentication still leaves anonymous users.
            # Re-read a bearer token only when the client sent one, via the
            # existing JWT stack on a second pass. Public ingest stays open.
            user = _optional_user(request)
        body = request.data if isinstance(request.data, dict) else {}
        status, payload = ingest_client_events(
            body,
            user=user,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response(payload, status=status)


def _optional_user(request):
    from accounts.models import User
    from accounts.soft_jwt import SoftUserJWTAuthentication

    try:
        auth = SoftUserJWTAuthentication().authenticate(request)
    except Exception:
        return None
    if not auth:
        return None
    user = auth[0]
    return user if isinstance(user, User) else None


class _AdminAnalytics(APIView):
    permission_classes = [IsAdmin]


class AnalyticsOverviewView(_AdminAnalytics):
    def get(self, request):
        period = _period(request)
        payload = cached_json(
            prefix="analytics-overview",
            parts={"period": period.as_dict()},
            producer=lambda: build_overview(period),
            ttl=int(getattr(settings, "ANALYTICS_CACHE_SECONDS", 30)),
        )
        return Response(payload)


class AnalyticsVisitorsView(_AdminAnalytics):
    def get(self, request):
        period = _period(request)

        def produce():
            current = visitor_counts(period.start, period.end)
            previous = visitor_counts(period.previous_start, period.previous_end)
            from analytics.compare import compare_numbers
            from analytics.metrics import daily_unique

            series = daily_unique(period.start, period.end)
            keys = [
                ("unique_visitors", "Noyob tashriflar"),
                ("new_visitors", "Yangi"),
                ("returning_visitors", "Qaytgan"),
                ("active_visitors", "Faol (2+ sahifa)"),
                ("registered_users", "Ro'yxatdan o'tgan"),
                ("anonymous_visitors", "Anonim"),
                ("page_views", "Sahifa ko'rish"),
            ]
            kpis = []
            for key, label in keys:
                row = compare_numbers(current[key], previous[key])
                row.update({"key": key, "label": label, "series": series, "available": True, "provenance": "recorded"})
                kpis.append(row)
            for key, label in (
                ("sessions", "Sessiyalar"),
                ("avg_session_seconds", "O'rtacha sessiya, soniya"),
                ("avg_pages_per_session", "Sahifa / sessiya"),
                ("bounce_rate", "Chiqib ketish, %"),
                ("engagement_rate", "Faollik, %"),
            ):
                available = current["sessions_available"]
                row = compare_numbers(
                    current[key] if available else None,
                    previous[key] if previous["sessions_available"] else None,
                )
                row.update(
                    {
                        "key": key,
                        "label": label,
                        "series": series,
                        "available": available,
                        "provenance": "recorded" if available else "unavailable",
                        "unavailable_reason": None if available else "historical_tracking_unavailable",
                    }
                )
                kpis.append(row)
            reg = compare_numbers(current["registration_conversion"], previous["registration_conversion"])
            reg.update({"key": "registration_conversion", "label": "Ro'yxat konversiyasi, %", "series": series, "available": True, "provenance": "recorded"})
            kpis.append(reg)
            return {
                "period": period.as_dict(),
                "kpis": kpis,
                "total_basis": current["total_visitors_basis"],
                "limitations": limitations(period.start),
                "tracking_since": tracking_since().isoformat() if tracking_since() else None,
            }

        return Response(
            cached_json(
                prefix="analytics-visitors",
                parts={"period": period.as_dict()},
                producer=produce,
                ttl=int(getattr(settings, "ANALYTICS_CACHE_SECONDS", 30)),
            )
        )


class AnalyticsFunnelView(_AdminAnalytics):
    def get(self, request):
        period = _period(request)
        mode = "session" if request.query_params.get("funnel") == "session" else "user"
        window = _window(request)

        def produce():
            report = funnel_report(period.start, period.end, mode=mode, window_days=window)
            for stage in report["stages"]:
                stage.pop("reached_identities", None)
            report["period"] = period.as_dict()
            report["limitations"] = limitations(period.start)
            return report

        return Response(
            cached_json(
                prefix="analytics-funnel",
                parts={"period": period.as_dict(), "mode": mode, "window": window},
                producer=produce,
                ttl=int(getattr(settings, "ANALYTICS_CACHE_SECONDS", 30)),
            )
        )


class AnalyticsFunnelStageView(_AdminAnalytics):
    def get(self, request):
        period = _period(request)
        mode = "session" if request.query_params.get("funnel") == "session" else "user"
        stage = request.query_params.get("stage") or "website_visited"
        page, size = _page(request)
        report = funnel_report(period.start, period.end, mode=mode, window_days=_window(request))
        row = next((item for item in report["stages"] if item["key"] == stage), None)
        if row is None:
            return Response({"detail": "Noma'lum bosqich."}, status=400)
        identities = row.pop("reached_identities")
        start = (page - 1) * size
        chosen = identities[start : start + size]
        people = []
        for identity in chosen:
            if identity.startswith("u:"):
                from accounts.models import User

                user = User.objects.filter(pk=identity[2:]).first()
                people.append({"id": f"user-{identity[2:]}", "label": (user.full_name if user else "") or identity})
            else:
                key = identity[2:]
                visitor = SiteVisitor.objects.filter(visitor_key=key).first()
                people.append({"id": f"visitor-{key}", "label": "Mehmon" if visitor is None or visitor.user_id is None else identity})
        row.pop("reached_identities", None)
        return Response(
            {
                "stage": row,
                "count": len(identities),
                "page": page,
                "page_size": size,
                "results": people,
                "period": period.as_dict(),
            }
        )


class AnalyticsPaymentsView(_AdminAnalytics):
    def get(self, request):
        period = _period(request)

        def produce():
            current = payment_counts(period.start, period.end)
            previous = payment_counts(period.previous_start, period.previous_end)
            from analytics.compare import compare_numbers

            kpis = []
            for key, label in (
                ("attempts", "Urinishlar"),
                ("unique_users", "Foydalanuvchilar"),
                ("successful", "Tasdiqlangan"),
                ("failed", "Muvaffaqiyatsiz"),
                ("cancelled", "Bekor"),
                ("expired", "Muddati o'tgan"),
                ("pending", "Kutilmoqda"),
                ("abandoned", "Tashlab ketilgan"),
                ("confirmed_revenue_uzs", "Tasdiqlangan tushum"),
                ("refunded_uzs", "Qaytarilgan"),
                ("net_revenue_uzs", "Sof tushum"),
                ("activation_gaps", "Obunasiz to'lov"),
            ):
                row = compare_numbers(current[key], previous[key])
                row.update({"key": key, "label": label, "available": True})
                kpis.append(row)
            return {
                "period": period.as_dict(),
                "kpis": kpis,
                "rates": {
                    "success_rate": current["success_rate"],
                    "checkout_to_payment_rate": current["checkout_to_payment_rate"],
                    "average_amount_uzs": current["average_amount_uzs"],
                    "redirect_attempted": current["redirect_attempted"],
                },
                "note": "Checkoutga yo'naltirish Payme sahifasining ochilganini bildirmaydi. Muvaffaqiyat faqat server tekshiruvidan.",
                "limitations": limitations(period.start),
            }

        return Response(
            cached_json(
                prefix="analytics-payments",
                parts={"period": period.as_dict()},
                producer=produce,
                ttl=int(getattr(settings, "ANALYTICS_CACHE_SECONDS", 30)),
            )
        )


class AnalyticsRevenueView(_AdminAnalytics):
    def get(self, request):
        period = _period(request)
        payload = cached_json(
            prefix="analytics-revenue",
            parts={"period": period.as_dict()},
            producer=lambda: {"period": period.as_dict(), **revenue_report(period.start, period.end), "limitations": limitations(period.start)},
            ttl=int(getattr(settings, "ANALYTICS_CACHE_SECONDS", 30)),
        )
        return Response(payload)


class AnalyticsAiView(_AdminAnalytics):
    def get(self, request):
        period = _period(request)
        payload = cached_json(
            prefix="analytics-ai",
            parts={"period": period.as_dict()},
            producer=lambda: {"period": period.as_dict(), **ai_report(period.start, period.end), "limitations": limitations(period.start)},
            ttl=int(getattr(settings, "ANALYTICS_CACHE_SECONDS", 30)),
        )
        return Response(payload)


class AnalyticsSourcesView(_AdminAnalytics):
    def get(self, request):
        period = _period(request)
        payload = cached_json(
            prefix="analytics-sources",
            parts={"period": period.as_dict()},
            producer=lambda: {"period": period.as_dict(), **source_report(period.start, period.end), "limitations": limitations(period.start)},
            ttl=int(getattr(settings, "ANALYTICS_CACHE_SECONDS", 30)),
        )
        return Response(payload)


class AnalyticsRealtimeView(_AdminAnalytics):
    def get(self, request):
        def produce():
            now = timezone.now()
            from datetime import timedelta

            from analytics.models import AnalyticsEvent, AnalyticsSession

            def recent(qs, name_field="name"):
                rows = []
                for item in qs[:12]:
                    rows.append(
                        {
                            "name": getattr(item, name_field, ""),
                            "at": (getattr(item, "occurred_at", None) or getattr(item, "created_at", None) or getattr(item, "date_joined", None) or getattr(item, "paid_at", None)).isoformat(),
                        }
                    )
                return rows

            from accounts.models import User

            return {
                "as_of": now.isoformat(),
                "active_window_minutes": [5, 15],
                "active_5_minutes": SiteVisitor.objects.filter(last_seen__gte=now - timedelta(minutes=5)).count(),
                "active_15_minutes": SiteVisitor.objects.filter(last_seen__gte=now - timedelta(minutes=15)).count(),
                "active_sessions": AnalyticsSession.objects.filter(
                    ended_at__isnull=True, last_activity_at__gte=now - timedelta(minutes=5)
                ).count(),
                "note": "Faol tashrif — shu daqiqalarda signal yuborgan brauzer. Ochiq tabning o'zi odam hisoblanmaydi.",
                "recent_registrations": [
                    {"name": "registration_completed", "at": user.date_joined.isoformat()}
                    for user in User.objects.order_by("-date_joined")[:12]
                ],
                "recent_premium_views": recent(
                    AnalyticsEvent.objects.filter(name="premium_page_viewed").order_by("-occurred_at")
                ),
                "recent_subscribe_clicks": recent(
                    AnalyticsEvent.objects.filter(name="subscribe_clicked").order_by("-occurred_at")
                ),
                "recent_payment_attempts": [
                    {"name": row.plan_code, "at": row.created_at.isoformat(), "status": row.status}
                    for row in SubscriptionPayment.objects.order_by("-created_at")[:12]
                ],
                "recent_confirmed_payments": [
                    {"name": row.plan_code, "at": row.paid_at.isoformat(), "amount_uzs": int(row.amount_uzs)}
                    for row in SubscriptionPayment.objects.filter(status=SubscriptionPayment.Status.PAID).order_by("-paid_at")[:12]
                ],
                "recent_ai": recent(AiGenerationUsage.objects.order_by("-created_at"), "kind"),
                "features": feature_usage(now - timedelta(hours=24), now)[:6],
            }

        from ai.models import AiGenerationUsage
        from subscriptions.models import SubscriptionPayment

        return Response(
            cached_json(
                prefix="analytics-realtime",
                parts={"bucket": int(timezone.now().timestamp() // 10)},
                producer=produce,
                ttl=int(getattr(settings, "ANALYTICS_REALTIME_CACHE_SECONDS", 10)),
            )
        )


class AnalyticsUsersView(_AdminAnalytics):
    def get(self, request):
        period = _period(request)
        page, size = _page(request)
        kind = request.query_params.get("kind") or "all"
        payload = directory(period.start, period.end, kind, page, size)
        payload["period"] = period.as_dict()
        return Response(payload)


class AnalyticsJourneyView(_AdminAnalytics):
    def get(self, request, identity):
        page, size = _page(request)
        try:
            days = int(request.query_params.get("days", "90"))
        except ValueError:
            days = 90
        payload = journey(identity, page, size, days)
        if payload is None:
            return Response({"detail": "Topilmadi."}, status=404)
        return Response(payload)
