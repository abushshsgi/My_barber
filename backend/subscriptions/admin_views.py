from django.db.models import Q

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin
from subscriptions.models import (
    ReferralTrialGrant,
    SubscriptionEvent,
    SubscriptionPayment,
    SubscriptionUsagePeriod,
    UserSubscription,
)
from subscriptions.plans import PLAN_CODES, get_plan, list_plans, serialize_plan
from subscriptions.services import (
    _payment_promo_fields,
    activate_subscription,
    admin_stats,
    build_me_payload,
    deactivate_subscription,
    entitlement_snapshot,
    reactivate_subscription,
    serialize_subscription,
    usage_snapshot,
)
from decimal import Decimal


def _parse_range(request):
    start_raw = request.query_params.get("start")
    end_raw = request.query_params.get("end")
    start = parse_datetime(start_raw) if start_raw else None
    end = parse_datetime(end_raw) if end_raw else None
    if start and timezone.is_naive(start):
        start = timezone.make_aware(start)
    if end and timezone.is_naive(end):
        end = timezone.make_aware(end)
    return start, end


def _serialize_event(ev: SubscriptionEvent) -> dict:
    user = ev.user
    return {
        "id": str(ev.pk),
        "action": ev.action,
        "actor": ev.actor,
        "detail": ev.detail,
        "ip_address": ev.ip_address,
        "created_at": ev.created_at.isoformat(),
        "user_id": user.pk if user else None,
        "user_name": (user.full_name or user.phone or user.email or "") if user else "",
        "subscription_id": str(ev.subscription_id) if ev.subscription_id else None,
        "plan_code": ev.subscription.plan_code if ev.subscription_id else None,
    }


def _serialize_payment(p: SubscriptionPayment, *, include_user: bool = False) -> dict:
    promo = _payment_promo_fields(p.metadata)
    row = {
        "id": str(p.pk),
        "user_id": p.user_id,
        "plan_code": p.plan_code,
        "amount_uzs": int(p.amount_uzs),
        "provider": p.provider,
        "status": p.status,
        "order_id": p.order_id,
        "transaction_id": p.transaction_id,
        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
        "created_at": p.created_at.isoformat(),
        "subscription_id": str(p.subscription_id) if p.subscription_id else None,
        "metadata": p.metadata or {},
        **promo,
    }
    if include_user and getattr(p, "user", None) is not None:
        row["user"] = {
            "id": p.user_id,
            "full_name": p.user.full_name or "",
            "phone": p.user.phone or "",
            "email": p.user.email or "",
        }
        row["user_name"] = p.user.full_name or p.user.phone or p.user.email or ""
        row["user_phone"] = p.user.phone or ""
    return row


def models_q_user_search(q: str):
    return (
        Q(user__full_name__icontains=q)
        | Q(user__phone__icontains=q)
        | Q(user__email__icontains=q)
        | Q(payment_order_id__icontains=q)
        | Q(plan_code__icontains=q)
    )


class AdminSubscriptionStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        start, end = _parse_range(request)
        raw = admin_stats(start=start, end=end)
        raw["recent_events"] = [_serialize_event(e) for e in raw["recent_events"]]
        raw["plans"] = [serialize_plan(p) for p in list_plans()]
        return Response(raw)


class AdminSubscriptionListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = UserSubscription.objects.select_related("user").order_by("-created_at")
        status_f = (request.query_params.get("status") or "").strip()
        plan_f = (request.query_params.get("plan") or "").strip().lower()
        q = (request.query_params.get("q") or "").strip()
        if status_f:
            qs = qs.filter(status=status_f)
        if plan_f:
            qs = qs.filter(plan_code=plan_f)
        if q:
            qs = qs.filter(
                models_q_user_search(q)
            )

        try:
            page = max(1, int(request.query_params.get("page") or 1))
        except ValueError:
            page = 1
        page_size = 40
        total = qs.count()
        items = qs[(page - 1) * page_size : page * page_size]
        results = []
        for sub in items:
            usage = usage_snapshot(sub.user, sub.entitlements or entitlement_snapshot(sub.plan_code))
            row = serialize_subscription(sub)
            row["user"] = {
                "id": sub.user_id,
                "full_name": sub.user.full_name or "",
                "phone": sub.user.phone or "",
                "email": sub.user.email or "",
            }
            row["usage"] = usage
            results.append(row)
        return Response(
            {
                "count": total,
                "page": page,
                "page_size": page_size,
                "results": results,
            }
        )


class AdminSubscriptionDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        sub = get_object_or_404(UserSubscription.objects.select_related("user"), pk=pk)
        usage = usage_snapshot(sub.user, sub.entitlements or entitlement_snapshot(sub.plan_code))
        events = SubscriptionEvent.objects.filter(subscription=sub).order_by("-created_at")[:100]
        payments = SubscriptionPayment.objects.filter(user=sub.user).order_by("-created_at")[:50]
        trial = ReferralTrialGrant.objects.filter(user=sub.user).first()
        return Response(
            {
                "subscription": {
                    **serialize_subscription(sub),
                    "user": {
                        "id": sub.user_id,
                        "full_name": sub.user.full_name or "",
                        "phone": sub.user.phone or "",
                        "email": sub.user.email or "",
                    },
                    "notes": sub.notes,
                    "payment_provider": sub.payment_provider,
                    "payment_order_id": sub.payment_order_id,
                    "payment_transaction_id": sub.payment_transaction_id,
                    "deactivated_by": sub.deactivated_by,
                },
                "usage": usage,
                "me": build_me_payload(sub.user),
                "events": [_serialize_event(e) for e in events],
                "payments": [_serialize_payment(p) for p in payments],
                "referral_trial": {
                    "granted": bool(trial),
                    "ends_at": trial.ends_at.isoformat() if trial else None,
                    "referral_count_at_grant": trial.referral_count_at_grant if trial else None,
                },
            }
        )


class AdminSubscriptionDeactivateView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        sub = get_object_or_404(UserSubscription, pk=pk)
        reason = str(request.data.get("reason") or "Admin deactivate")[:255]
        actor = f"admin:{getattr(request.user, 'pk', '')}"
        sub = deactivate_subscription(
            subscription=sub, actor=actor, reason=reason, request=request
        )
        return Response(serialize_subscription(sub))


class AdminSubscriptionActivateView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        sub = get_object_or_404(UserSubscription, pk=pk)
        actor = f"admin:{getattr(request.user, 'pk', '')}"
        extend = request.data.get("extend_days")
        try:
            extend_days = int(extend) if extend is not None else None
        except (TypeError, ValueError):
            return Response({"detail": "extend_days noto'g'ri."}, status=status.HTTP_400_BAD_REQUEST)
        sub = reactivate_subscription(
            subscription=sub, actor=actor, extend_days=extend_days, request=request
        )
        return Response(serialize_subscription(sub))


class AdminSubscriptionGrantView(APIView):
    """Admin bepul / qo'lda obuna berish."""

    permission_classes = [IsAdmin]

    def post(self, request):
        user_id = request.data.get("user_id")
        plan_code = str(request.data.get("plan_code") or "").strip().lower()
        days = request.data.get("days")
        notes = str(request.data.get("notes") or "")[:500]

        if plan_code not in PLAN_CODES:
            return Response({"detail": "Noto'g'ri plan."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(pk=user_id, role=User.Role.USER).first()
        if not user:
            return Response({"detail": "User topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        try:
            period_days = int(days) if days is not None else None
        except (TypeError, ValueError):
            return Response({"detail": "days noto'g'ri."}, status=status.HTTP_400_BAD_REQUEST)

        plan = get_plan(plan_code)
        actor = f"admin:{getattr(request.user, 'pk', '')}"
        sub = activate_subscription(
            user=user,
            plan_code=plan_code,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
            period_days=period_days,
            actor=actor,
            request=request,
            notes=notes or "Admin grant",
        )
        return Response(serialize_subscription(sub), status=status.HTTP_201_CREATED)


class AdminSubscriptionPaymentsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = SubscriptionPayment.objects.select_related("user").order_by(
            "-paid_at", "-created_at"
        )
        status_f = (request.query_params.get("status") or "").strip()
        plan_f = (request.query_params.get("plan") or "").strip().lower()
        provider_f = (request.query_params.get("provider") or "").strip().lower()
        promo_f = (request.query_params.get("promo") or "").strip().upper()
        discounted_only = (request.query_params.get("discounted") or "").strip() in (
            "1",
            "true",
            "yes",
        )
        q = (request.query_params.get("q") or "").strip()
        start, end = _parse_range(request)

        if status_f:
            qs = qs.filter(status=status_f)
        if plan_f:
            qs = qs.filter(plan_code=plan_f)
        if provider_f:
            qs = qs.filter(provider=provider_f)
        if start:
            qs = qs.filter(Q(paid_at__gte=start) | Q(paid_at__isnull=True, created_at__gte=start))
        if end:
            qs = qs.filter(Q(paid_at__lte=end) | Q(paid_at__isnull=True, created_at__lte=end))
        if q:
            qs = qs.filter(
                Q(user__full_name__icontains=q)
                | Q(user__phone__icontains=q)
                | Q(user__email__icontains=q)
                | Q(order_id__icontains=q)
                | Q(plan_code__icontains=q)
                | Q(metadata__promo_code__icontains=q)
            )
        if promo_f:
            qs = qs.filter(metadata__promo_code__iexact=promo_f)
        if discounted_only:
            # JSON: promo_code mavjud va bo'sh emas
            qs = qs.exclude(metadata__promo_code__isnull=True).exclude(
                metadata__promo_code=""
            )

        try:
            page = max(1, int(request.query_params.get("page") or 1))
        except ValueError:
            page = 1
        page_size = 50
        total = qs.count()
        items = qs[(page - 1) * page_size : page * page_size]
        return Response(
            {
                "count": total,
                "page": page,
                "page_size": page_size,
                "results": [
                    _serialize_payment(p, include_user=True) for p in items
                ],
            }
        )


class AdminSubscriptionEventsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = SubscriptionEvent.objects.select_related("user", "subscription").order_by(
            "-created_at"
        )
        action = (request.query_params.get("action") or "").strip()
        user_id = request.query_params.get("user_id")
        if action:
            qs = qs.filter(action=action)
        if user_id:
            qs = qs.filter(user_id=user_id)
        try:
            page = max(1, int(request.query_params.get("page") or 1))
        except ValueError:
            page = 1
        page_size = 50
        total = qs.count()
        items = qs[(page - 1) * page_size : page * page_size]
        return Response(
            {
                "count": total,
                "page": page,
                "results": [_serialize_event(e) for e in items],
            }
        )


class AdminSubscriptionUsageListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = SubscriptionUsagePeriod.objects.select_related("user").order_by(
            "-period_start", "-morph_ai_used"
        )
        try:
            page = max(1, int(request.query_params.get("page") or 1))
        except ValueError:
            page = 1
        page_size = 50
        total = qs.count()
        items = qs[(page - 1) * page_size : page * page_size]
        results = []
        for u in items:
            results.append(
                {
                    "user_id": u.user_id,
                    "user_name": u.user.full_name or u.user.phone or "",
                    "period_start": u.period_start.isoformat(),
                    "period_end": u.period_end.isoformat(),
                    "morph_ai_used": u.morph_ai_used,
                    "morph_studio_used": u.morph_studio_used,
                    "updated_at": u.updated_at.isoformat(),
                }
            )
        return Response({"count": total, "page": page, "results": results})
