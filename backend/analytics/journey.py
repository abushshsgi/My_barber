"""Admin directory and one-person timeline. No secrets."""

from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from accounts.models import User
from ai.models import AiGenerationUsage
from analytics.models import AnalyticsEvent
from analytics.outcomes import payment_outcome
from control_panel.models import SiteVisitEvent, SiteVisitor
from subscriptions.models import SubscriptionPayment, UserSubscription


def _page(request):
    try:
        page = max(1, int(request.query_params.get("page", "1")))
    except ValueError:
        page = 1
    try:
        size = max(1, min(50, int(request.query_params.get("page_size", "25"))))
    except ValueError:
        size = 25
    return page, size


def _visitor_label(visitor: SiteVisitor) -> str:
    user = visitor.user
    if user is None:
        return "Mehmon"
    return (user.full_name or user.get_full_name() or user.email or "Foydalanuvchi").strip()


def directory(start, end, kind: str, page: int, page_size: int):
    visitor_ids = SiteVisitEvent.objects.filter(created_at__gte=start, created_at__lt=end).values("visitor_id")
    qs = SiteVisitor.objects.filter(id__in=visitor_ids).select_related("user")
    if kind == "registered":
        qs = qs.exclude(user_id=None)
    elif kind == "anonymous":
        qs = qs.filter(user_id=None)
    elif kind == "premium_viewers":
        ids = SiteVisitEvent.objects.filter(
            created_at__gte=start, created_at__lt=end, path__startswith="/subscriptions"
        ).exclude(path__startswith="/subscriptions/payme").values("visitor_id")
        qs = qs.filter(id__in=ids)
    elif kind == "subscribe_clickers":
        ids = AnalyticsEvent.objects.filter(name="subscribe_clicked", occurred_at__gte=start, occurred_at__lt=end).values("visitor_id")
        qs = qs.filter(id__in=ids)
    elif kind == "payment_starters":
        user_ids = SubscriptionPayment.objects.filter(created_at__gte=start, created_at__lt=end).values("user_id")
        qs = qs.filter(user_id__in=user_ids)
    elif kind == "paying_subscribers":
        user_ids = SubscriptionPayment.objects.filter(
            status=SubscriptionPayment.Status.PAID, paid_at__gte=start, paid_at__lt=end
        ).values("user_id")
        qs = qs.filter(user_id__in=user_ids)
    elif kind == "ai_tryon":
        user_ids = AiGenerationUsage.objects.filter(created_at__gte=start, created_at__lt=end).values("user_id")
        event_visitors = AnalyticsEvent.objects.filter(name="ai_tryon_opened", occurred_at__gte=start, occurred_at__lt=end).values("visitor_id")
        qs = qs.filter(Q(user_id__in=user_ids) | Q(id__in=event_visitors))
    elif kind == "shampoo_scanner":
        ids = AnalyticsEvent.objects.filter(
            name__in=["barcode_scan_started", "barcode_scan_completed", "shampoo_product_viewed"],
            occurred_at__gte=start,
            occurred_at__lt=end,
        ).values("visitor_id")
        qs = qs.filter(id__in=ids)
    elif kind == "payment_abandoners":
        pending = SubscriptionPayment.objects.filter(status=SubscriptionPayment.Status.PENDING, created_at__gte=start - timedelta(days=2))
        abandoned_users = [row.user_id for row in pending if payment_outcome(row) == "abandoned"]
        qs = qs.filter(user_id__in=abandoned_users)
    total = qs.count()
    offset = (page - 1) * page_size
    rows = []
    for visitor in qs.order_by("-last_seen")[offset : offset + page_size]:
        user = visitor.user
        rows.append(
            {
                "id": f"user-{user.pk}" if user else f"visitor-{visitor.visitor_key}",
                "label": _visitor_label(visitor),
                "registered": user is not None,
                "auth_method": _auth_method(user),
                "source": visitor.first_source or "unknown",
                "device": visitor.device_label or "",
                "first_seen": visitor.first_seen.isoformat() if visitor.first_seen else None,
                "last_seen": visitor.last_seen.isoformat() if visitor.last_seen else None,
                "visits": visitor.visit_count,
            }
        )
    return {"count": total, "page": page, "page_size": page_size, "results": rows}


def _auth_method(user) -> str:
    if user is None:
        return ""
    if getattr(user, "google_sub", ""):
        return "google"
    if getattr(user, "phone", ""):
        return "phone"
    return "unknown"


def _resolve(identity: str):
    if identity.startswith("user-") and identity[5:].isdigit():
        user = User.objects.filter(pk=int(identity[5:])).first()
        visitors = SiteVisitor.objects.filter(user=user) if user else SiteVisitor.objects.none()
        return user, visitors
    key = identity[8:] if identity.startswith("visitor-") else identity
    visitors = SiteVisitor.objects.filter(visitor_key=key)
    user = visitors.exclude(user_id=None).select_related("user").first()
    return (user.user if user else None), visitors


def journey(identity: str, page: int, page_size: int, days: int = 90) -> dict | None:
    user, visitors = _resolve(identity)
    if user is None and not visitors.exists():
        return None
    since = timezone.now() - timedelta(days=max(1, min(days, 365)))
    events = []
    visitor_ids = list(visitors.values_list("id", flat=True))
    for kind, path, label, moment in SiteVisitEvent.objects.filter(visitor_id__in=visitor_ids, created_at__gte=since).values_list(
        "kind", "path", "label", "created_at"
    )[:400]:
        events.append(
            {
                "name": "page_view" if kind == "page" else "click",
                "at": moment.isoformat(),
                "page": path,
                "status": kind,
                "session": "",
                "properties": {"label": label} if label else {},
                "sort": moment,
            }
        )
    event_filter = AnalyticsEvent.objects.filter(occurred_at__gte=since)
    if user is not None:
        event_filter = event_filter.filter(Q(user=user) | Q(visitor_id__in=visitor_ids))
    else:
        event_filter = event_filter.filter(visitor_id__in=visitor_ids)
    for name, moment, page_path, status, session_key, properties, payment_id in event_filter.values_list(
        "name", "occurred_at", "page", "status", "session__session_key", "properties", "payment_id"
    )[:400]:
        events.append(
            {
                "name": name,
                "at": moment.isoformat(),
                "page": page_path,
                "status": status,
                "session": session_key or "",
                "properties": properties or {},
                "payment_id": str(payment_id) if payment_id else None,
                "sort": moment,
            }
        )
    if user is not None:
        events.append(
            {
                "name": "account_registered",
                "at": user.date_joined.isoformat(),
                "page": "",
                "status": "recorded",
                "session": "",
                "properties": {"auth_method": _auth_method(user)},
                "sort": user.date_joined,
            }
        )
        for row in SubscriptionPayment.objects.filter(user=user, created_at__gte=since).order_by("-created_at")[:50]:
            events.append(
                {
                    "name": "payment_transaction_created",
                    "at": row.created_at.isoformat(),
                    "page": "",
                    "status": payment_outcome(row),
                    "session": row.session_key,
                    "properties": {
                        "amount_uzs": int(row.amount_uzs),
                        "plan_code": row.plan_code,
                        "provider": row.provider,
                        "failure_reason": row.failure_reason,
                        "outcome_source": row.outcome_source,
                    },
                    "payment_id": str(row.pk),
                    "sort": row.created_at,
                }
            )
            if row.paid_at:
                events.append(
                    {
                        "name": "payment_confirmed",
                        "at": row.paid_at.isoformat(),
                        "page": "",
                        "status": row.status,
                        "session": row.session_key,
                        "properties": {"amount_uzs": int(row.amount_uzs)},
                        "payment_id": str(row.pk),
                        "sort": row.paid_at,
                    }
                )
        for kind, status, moment, model, cost, estimated in AiGenerationUsage.objects.filter(user=user, created_at__gte=since).values_list(
            "kind", "status", "created_at", "model", "cost_usd", "tokens_estimated"
        )[:100]:
            events.append(
                {
                    "name": "ai_generation_completed" if status == "success" else "ai_generation_failed",
                    "at": moment.isoformat(),
                    "page": "/ai-style",
                    "status": status,
                    "session": "",
                    "properties": {
                        "kind": kind,
                        "model": model,
                        "cost_usd": str(cost),
                        "cost_estimated": estimated,
                    },
                    "sort": moment,
                }
            )
    events.sort(key=lambda item: item["sort"], reverse=True)
    total = len(events)
    offset = (page - 1) * page_size
    page_rows = []
    for item in events[offset : offset + page_size]:
        item.pop("sort", None)
        page_rows.append(item)
    visitor = visitors.order_by("first_seen").first()
    subscription = None
    spend = 0
    if user is not None:
        subscription = (
            UserSubscription.objects.filter(user=user).order_by("-created_at").values("status", "plan_code", "ends_at", "price_uzs").first()
        )
        if subscription and subscription["ends_at"]:
            subscription["ends_at"] = subscription["ends_at"].isoformat()
            subscription["price_uzs"] = int(subscription["price_uzs"])
        paid = SubscriptionPayment.objects.filter(user=user, status=SubscriptionPayment.Status.PAID)
        spend = int(sum(paid.values_list("amount_uzs", flat=True) or []))
    sessions = 0
    if visitor_ids:
        from analytics.models import AnalyticsSession

        sessions = AnalyticsSession.objects.filter(visitor_id__in=visitor_ids).count()
    return {
        "id": f"user-{user.pk}" if user else f"visitor-{visitor.visitor_key}",
        "label": _visitor_label(visitor) if visitor else (user.email if user else ""),
        "first_visit": visitor.first_seen.isoformat() if visitor and visitor.first_seen else None,
        "last_visit": visitor.last_seen.isoformat() if visitor and visitor.last_seen else None,
        "visits": visitor.visit_count if visitor else 0,
        "sessions": sessions,
        "registered_at": user.date_joined.isoformat() if user else None,
        "auth_method": _auth_method(user),
        "source": (visitor.first_source if visitor else "") or "unknown",
        "device": visitor.device_label if visitor else "",
        "ai_generations": AiGenerationUsage.objects.filter(user=user).count() if user else 0,
        "premium_page_views": SiteVisitEvent.objects.filter(visitor_id__in=visitor_ids, path__startswith="/subscriptions").exclude(path__startswith="/subscriptions/payme").count() if visitor_ids else 0,
        "subscribe_clicks": AnalyticsEvent.objects.filter(visitor_id__in=visitor_ids, name="subscribe_clicked").count() if visitor_ids else 0,
        "payment_attempts": SubscriptionPayment.objects.filter(user=user).count() if user else 0,
        "successful_payments": SubscriptionPayment.objects.filter(user=user, status=SubscriptionPayment.Status.PAID).count() if user else 0,
        "subscription": subscription,
        "confirmed_spend_uzs": spend,
        "count": total,
        "page": page,
        "page_size": page_size,
        "events": page_rows,
    }
