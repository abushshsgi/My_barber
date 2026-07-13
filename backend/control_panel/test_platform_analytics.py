from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from barbers.models import Barber
from bookings.models import Booking
from wallet.models import LedgerEntry, Wallet

from control_panel.export_csv import build_csv_response
from control_panel.platform_analytics import (
    build_bookings_analytics,
    build_platform_overview,
    build_revenue_analytics,
    build_wallet_analytics,
    resolve_range,
)


class _FakeRequest:
    def __init__(self, params=None):
        self.query_params = params or {}


class PlatformAnalyticsTests(TestCase):
    def setUp(self):
        self.now = timezone.now()
        self.start_dt, self.end_dt = resolve_range(
            (self.now - timedelta(days=7)).date().isoformat(),
            self.now.date().isoformat(),
        )
        self.user = User.objects.create(
            username="client@test.uz",
            email="client@test.uz",
            phone="+998901112233",
            role=User.Role.USER,
        )
        self.barber = Barber.objects.create(
            email="barber@test.uz",
            username="barber@test.uz",
            full_name="Barber One",
            phone="+998904445566",
            work_mode=Barber.WorkMode.INDEPENDENT,
            onboarding_flow=Barber.OnboardingFlow.INDEPENDENT,
            email_verified_at=self.now,
        )
        start = self.now - timedelta(days=1)
        # Naqd yakunlangan bron
        Booking.objects.create(
            customer=self.user,
            barber=self.barber,
            start_at=start,
            end_at=start + timedelta(minutes=30),
            status=Booking.Status.COMPLETED,
            total_price=50_000,
            payment_method=Booking.PaymentMethod.CASH,
            payment_status=Booking.PaymentStatus.NOT_APPLICABLE,
        )
        # Onlayn to'langan yakunlangan bron
        Booking.objects.create(
            customer=self.user,
            barber=self.barber,
            start_at=start,
            end_at=start + timedelta(minutes=30),
            status=Booking.Status.COMPLETED,
            total_price=70_000,
            payment_method=Booking.PaymentMethod.ONLINE,
            payment_status=Booking.PaymentStatus.PAID,
            paid_at=start,
        )
        # Bekor qilingan bron
        Booking.objects.create(
            customer=self.user,
            barber=self.barber,
            start_at=start,
            end_at=start + timedelta(minutes=30),
            status=Booking.Status.CANCELLED,
            total_price=40_000,
        )

    def test_overview_revenue_split(self):
        data = build_platform_overview(self.start_dt, self.end_dt)
        self.assertEqual(data["revenue"]["cash_total"], 50_000)
        self.assertEqual(data["revenue"]["online_total"], 70_000)
        self.assertEqual(data["revenue"]["gmv"], 120_000)
        self.assertEqual(data["b2c"]["completed_bookings"], 2)
        self.assertEqual(data["b2c"]["cancelled_bookings"], 1)

    def test_revenue_series_monthly(self):
        data = build_revenue_analytics(self.start_dt, self.end_dt, "month")
        self.assertEqual(data["summary"]["gmv"], 120_000)
        self.assertTrue(len(data["series"]) >= 1)
        self.assertTrue(len(data["top_barbers"]) >= 1)

    def test_bookings_funnel(self):
        data = build_bookings_analytics(self.start_dt, self.end_dt)
        self.assertEqual(data["summary"]["total"], 3)
        self.assertEqual(data["summary"]["completed"], 2)
        self.assertEqual(data["summary"]["cancelled"], 1)
        self.assertEqual(data["summary"]["cash_count"], 1)
        self.assertEqual(data["summary"]["online_count"], 1)

    def test_wallet_analytics(self):
        wallet = Wallet.objects.create(user=self.user, wallet_number="0000000000000001", balance=0)
        LedgerEntry.objects.create(
            wallet=wallet,
            entry_type=LedgerEntry.EntryType.TOPUP,
            amount=100_000,
            balance_after=100_000,
            idempotency_key="topup-1",
            prev_hash="",
            entry_hash="h1",
            metadata={"source": "admin_topup"},
        )
        LedgerEntry.objects.create(
            wallet=wallet,
            entry_type=LedgerEntry.EntryType.BOOKING_PAY,
            amount=-70_000,
            balance_after=30_000,
            idempotency_key="pay-1",
            prev_hash="h1",
            entry_hash="h2",
            metadata={},
        )
        data = build_wallet_analytics(self.start_dt, self.end_dt)
        self.assertEqual(data["summary"]["topup_total"], 100_000)
        self.assertEqual(data["summary"]["topup_users"], 1)
        self.assertEqual(data["summary"]["spend_total"], 70_000)
        self.assertEqual(len(data["recent"]), 2)

    def test_csv_export_content_type(self):
        response = build_csv_response("bookings", self.start_dt, self.end_dt, _FakeRequest())
        self.assertIsNotNone(response)
        self.assertIn("text/csv", response["Content-Type"])
        self.assertIn("attachment", response["Content-Disposition"])

    def test_csv_export_unknown_type(self):
        response = build_csv_response("nope", self.start_dt, self.end_dt, _FakeRequest())
        self.assertIsNone(response)
