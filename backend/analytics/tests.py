import uuid
from datetime import datetime, timedelta, timezone as dt_tz
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.admin_auth import AdminPrincipal
from accounts.models import AdminAccount
from analytics.compare import compare_numbers
from analytics.ingest import touch_session
from analytics.metrics import funnel_report, payment_counts, revenue_report, visitor_counts
from analytics.models import AnalyticsDailySnapshot, AnalyticsEvent, AnalyticsSession, AnalyticsTrackingState
from analytics.outcomes import payment_outcome
from analytics.periods import local_day_bounds
from analytics.snapshots import write_snapshot
from control_panel.models import SiteVisitEvent, SiteVisitor
from subscriptions.models import SubscriptionPayment
from subscriptions.payme_service import sync_payme_payment

User = get_user_model()


def _user():
    suffix = uuid.uuid4().hex[:10]
    return User.objects.create_user(
        username=f"a{suffix}",
        email=f"{suffix}@test.local",
        phone=f"+9989{suffix[:8]}",
        password="TestPass123!",
        role=User.Role.USER,
        full_name="Analytics User",
    )


def _visitor(key="visitorkey1"):
    return SiteVisitor.objects.create(visitor_key=key, visit_count=1)


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "analytics-tests"}},
    ANALYTICS_INGEST_PER_MINUTE=3,
    ANALYTICS_ABANDON_AFTER_MINUTES=24 * 60,
    PAYME_RECEIPT_TTL_MINUTES=60,
)
class AnalyticsTests(TestCase):
    def setUp(self):
        state, _ = AnalyticsTrackingState.objects.get_or_create(defaults={"named_events_since": timezone.now()})
        state.named_events_since = timezone.now() - timedelta(days=400)
        state.save(update_fields=["named_events_since"])
        self.client = APIClient()
        self.user = _user()

    def _event(self, name, visitor, when, user=None, event_id=None):
        return AnalyticsEvent.objects.create(
            client_event_id=event_id or uuid.uuid4().hex,
            name=name,
            occurred_at=when,
            visitor=visitor,
            user=user,
        )

    def _payment(self, **kwargs):
        suffix = uuid.uuid4().hex[:12]
        data = dict(
            user=self.user,
            plan_code="starter",
            amount_uzs=Decimal("9990"),
            amount_tiyin=999000,
            provider="payme",
            status=SubscriptionPayment.Status.PENDING,
            order_id=f"sub-{suffix}",
            idempotency_key=f"idem-{suffix}",
            payme_receipt_id=suffix,
        )
        data.update(kwargs)
        return SubscriptionPayment.objects.create(**data)

    def test_percentage_is_undefined_when_previous_is_zero(self):
        row = compare_numbers(5, 0)
        self.assertIsNone(row["change_percent"])
        self.assertEqual(row["change_state"], "undefined")
        self.assertEqual(row["absolute"], 5)

    def test_unique_and_repeat_visitors(self):
        now = timezone.now()
        first = _visitor("visitorrepeat1")
        SiteVisitor.objects.filter(pk=first.pk).update(first_seen=now - timedelta(days=2))
        second = _visitor("visitorrepeat2")
        SiteVisitEvent.objects.create(visitor=first, kind="page", path="/")
        SiteVisitEvent.objects.create(visitor=first, kind="page", path="/ai-style")
        SiteVisitEvent.objects.create(visitor=second, kind="page", path="/")
        counts = visitor_counts(now - timedelta(hours=1), now + timedelta(minutes=1))
        self.assertEqual(counts["unique_visitors"], 2)
        self.assertEqual(counts["returning_visitors"], 1)
        self.assertEqual(counts["new_visitors"], 1)

    def test_session_idle_expiry_opens_a_new_session(self):
        visitor = _visitor("visitorsession1")
        old = touch_session(visitor, "sessionkey1", pageviews=1)
        AnalyticsSession.objects.filter(pk=old.pk).update(last_activity_at=timezone.now() - timedelta(minutes=45))
        fresh = touch_session(visitor, "sessionkey1", pageviews=1)
        old.refresh_from_db()
        self.assertIsNotNone(old.ended_at)
        self.assertNotEqual(old.pk, fresh.pk)
        self.assertEqual(AnalyticsSession.objects.filter(visitor=visitor).count(), 2)

    def test_tashkent_day_boundary(self):
        visitor = _visitor("visitortimezone1")
        event = SiteVisitEvent.objects.create(visitor=visitor, kind="page", path="/")
        moment = datetime(2026, 11, 10, 19, 30, tzinfo=dt_tz.utc)
        SiteVisitEvent.objects.filter(pk=event.pk).update(created_at=moment)
        next_day, day_after = local_day_bounds(datetime(2026, 11, 11).date())
        previous_day, next_start = local_day_bounds(datetime(2026, 11, 10).date())
        self.assertEqual(visitor_counts(next_day, day_after)["unique_visitors"], 1)
        self.assertEqual(visitor_counts(previous_day, next_start)["unique_visitors"], 0)

    def test_ingest_rejects_spoofed_payment_and_rate_limits(self):
        body = {
            "visitor_id": "visitoringest1",
            "session_id": "sessioningest1",
            "events": [{"event_id": "evt-confirmed-1", "name": "payment_confirmed"}],
        }
        denied = self.client.post("/api/v1/analytics/events/", body, format="json")
        self.assertEqual(denied.status_code, 400)
        self.assertFalse(AnalyticsEvent.objects.filter(name="payment_confirmed").exists())

        for index in range(3):
            ok = self.client.post(
                "/api/v1/analytics/events/",
                {
                    "visitor_id": "visitoringest1",
                    "session_id": "sessioningest1",
                    "events": [{"event_id": f"evt-page-{index}", "name": "premium_page_viewed", "page": "/subscriptions"}],
                },
                format="json",
            )
            self.assertEqual(ok.status_code, 200, ok.content)
        limited = self.client.post(
            "/api/v1/analytics/events/",
            {
                "visitor_id": "visitoringest1",
                "session_id": "sessioningest1",
                "events": [{"event_id": "evt-page-extra", "name": "premium_page_viewed"}],
            },
            format="json",
        )
        self.assertEqual(limited.status_code, 429)

    def test_admin_endpoint_requires_admin(self):
        anonymous = self.client.get("/api/v1/admin/analytics/overview/")
        self.assertIn(anonymous.status_code, (401, 403))
        admin = AdminAccount.objects.create(email="analytics-admin@test.uz", password="secret")
        self.client.force_authenticate(user=AdminPrincipal(admin))
        allowed = self.client.get("/api/v1/admin/analytics/overview/?preset=today")
        self.assertEqual(allowed.status_code, 200, allowed.content)
        self.assertEqual(len(allowed.data["questions"]), 20)
        self.assertIn(allowed.data["questions"][5]["value"]["change_state"], ("defined", "undefined", "unavailable"))

    def test_linking_does_not_merge_two_users(self):
        other = _user()
        self.client.force_authenticate(user=self.user)
        self.client.post(
            "/api/v1/analytics/events/",
            {
                "visitor_id": "visitorlinkuser1",
                "session_id": "sessionlinkuser1",
                "events": [{"event_id": "evt-link-1", "name": "login_completed"}],
            },
            format="json",
        )
        visitor = SiteVisitor.objects.get(visitor_key="visitorlinkuser1")
        self.assertEqual(visitor.user_id, self.user.id)
        self.client.force_authenticate(user=other)
        self.client.post(
            "/api/v1/analytics/events/",
            {
                "visitor_id": "visitorlinkuser1",
                "session_id": "sessionlinkuser2",
                "events": [{"event_id": "evt-link-2", "name": "login_completed"}],
            },
            format="json",
        )
        visitor.refresh_from_db()
        self.assertEqual(visitor.user_id, self.user.id)

    def test_strict_funnel_orders_events_and_counts_clicks(self):
        visitor = _visitor("visitorfunnel1")
        visitor.user = self.user
        visitor.save(update_fields=["user"])
        start = timezone.now() - timedelta(hours=2)
        times = [start + timedelta(minutes=index) for index in range(8)]
        page = SiteVisitEvent.objects.create(visitor=visitor, kind="page", path="/")
        SiteVisitEvent.objects.filter(pk=page.pk).update(created_at=times[0])
        premium = SiteVisitEvent.objects.create(visitor=visitor, kind="page", path="/subscriptions")
        SiteVisitEvent.objects.filter(pk=premium.pk).update(created_at=times[2])
        User.objects.filter(pk=self.user.pk).update(date_joined=times[1])
        names = [
            "premium_offer_viewed",
            "subscription_plan_selected",
            "subscribe_clicked",
            "payment_initiated",
            "checkout_redirect_attempted",
        ]
        for name, moment in zip(names, times[2:7]):
            self._event(name, visitor, moment, user=self.user)
        for index in range(9):
            self._event("subscribe_clicked", visitor, times[4], user=self.user)
        payment = self._payment()
        SubscriptionPayment.objects.filter(pk=payment.pk).update(
            created_at=times[5],
            redirect_attempted_at=times[6],
            status=SubscriptionPayment.Status.PAID,
            paid_at=times[7],
            subscription_id=None,
        )
        report = funnel_report(start - timedelta(minutes=5), timezone.now() + timedelta(minutes=1), mode="user", window_days=7)
        stages = {row["key"]: row for row in report["stages"]}
        self.assertEqual(stages["subscribe_clicked"]["events"], 10)
        self.assertEqual(stages["subscribe_clicked"]["unique_users"], 1)
        self.assertEqual(stages["payment_confirmed"]["unique_users"], 1)
        self.assertGreater(stages["website_visited"]["unique_users"], 0)

    def test_payment_outcomes_and_revenue(self):
        now = timezone.now()
        recent = self._payment()
        self.assertEqual(payment_outcome(recent, now), "pending")
        abandoned = self._payment()
        SubscriptionPayment.objects.filter(pk=abandoned.pk).update(created_at=now - timedelta(hours=30))
        abandoned.refresh_from_db()
        self.assertEqual(payment_outcome(abandoned, now), "abandoned")
        expired = self._payment(payme_state=0, last_verified_at=now - timedelta(hours=2))
        SubscriptionPayment.objects.filter(pk=expired.pk).update(created_at=now - timedelta(hours=2))
        expired.refresh_from_db()
        self.assertEqual(payment_outcome(expired, now), "expired")
        failed = self._payment(status=SubscriptionPayment.Status.FAILED)
        self.assertEqual(payment_outcome(failed, now), "failed")
        paid = self._payment(status=SubscriptionPayment.Status.PAID, paid_at=now, amount_uzs=Decimal("29990"))
        refunded = self._payment(status=SubscriptionPayment.Status.REFUNDED, paid_at=now - timedelta(days=1), amount_uzs=Decimal("9990"))
        SubscriptionPayment.objects.filter(pk=refunded.pk).update(updated_at=now)
        counts = payment_counts(now - timedelta(hours=1), now + timedelta(minutes=1), now)
        self.assertGreaterEqual(counts["attempts"], 4)
        self.assertEqual(counts["successful"], 1)
        report = revenue_report(now - timedelta(days=2), now + timedelta(minutes=1), now)
        self.assertEqual(report["confirmed_revenue_uzs"], 29990)
        self.assertEqual(report["refunded_uzs"], 9990)
        self.assertEqual(report["net_revenue_uzs"], 20000)
        self.assertFalse(report["mrr_available"])
        self.assertIsNone(report["mrr"])

    def test_duplicate_confirmation_does_not_double_count(self):
        payment = self._payment()
        receipt = {
            "_id": payment.payme_receipt_id,
            "state": 4,
            "amount": payment.amount_tiyin,
            "account": [{"name": "order_id", "value": payment.order_id}],
        }
        with patch("subscriptions.payme_service.receipts_get", return_value=receipt), patch(
            "subscriptions.payme_service.receipts_check", return_value=4
        ):
            with self.captureOnCommitCallbacks(execute=True):
                sync_payme_payment(user=self.user, order_id=payment.order_id)
                sync_payme_payment(user=self.user, order_id=payment.order_id)
        self.assertEqual(AnalyticsEvent.objects.filter(name="payment_confirmed", payment=payment).count(), 1)
        self.assertEqual(SubscriptionPayment.objects.filter(order_id=payment.order_id, status="paid").count(), 1)

    def test_activation_failure_rolls_back_the_payment(self):
        payment = self._payment()
        receipt = {
            "_id": payment.payme_receipt_id,
            "state": 4,
            "amount": payment.amount_tiyin,
            "account": [{"name": "order_id", "value": payment.order_id}],
        }
        with patch("subscriptions.payme_service.receipts_get", return_value=receipt), patch(
            "subscriptions.payme_service.receipts_check", return_value=4
        ), patch("subscriptions.payme_service.activate_subscription", side_effect=RuntimeError("activation")):
            with self.assertRaises(RuntimeError):
                sync_payme_payment(user=self.user, order_id=payment.order_id)
        payment.refresh_from_db()
        self.assertEqual(payment.status, SubscriptionPayment.Status.PENDING)
        self.assertFalse(AnalyticsEvent.objects.filter(name="payment_confirmed").exists())

    def test_late_payment_marks_snapshot_stale(self):
        yesterday = timezone.localdate() - timedelta(days=1)
        row = write_snapshot(yesterday)
        self.assertIsNotNone(row)
        self.assertFalse(row.stale)
        paid_at = timezone.now() - timedelta(days=1)
        with self.captureOnCommitCallbacks(execute=True):
            from analytics.hooks import mark_dates_stale

            mark_dates_stale([paid_at])
        row.refresh_from_db()
        self.assertTrue(AnalyticsDailySnapshot.objects.get(date=yesterday).stale)
