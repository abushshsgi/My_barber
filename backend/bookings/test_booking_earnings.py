"""Onlayn/naqd to'lov va platforma daromadi."""

from datetime import time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from barbers.barber_auth import encode_barber_tokens
from barbers.models import Barber, BarberProfile, BarberService, BarberWorkingHours
from bookings.models import Booking
from wallet.services.wallet_service import WalletService

User = get_user_model()


class BookingEarningsPaymentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="cust@test.uz",
            email="cust@test.uz",
            password="testpass12",
            phone="+998901112233",
        )
        self.barber = Barber.objects.create(
            email="barber@test.uz",
            username="barber@test.uz",
            full_name="Barber Earn",
            phone="+998904445566",
            work_mode=Barber.WorkMode.INDEPENDENT,
            onboarding_flow=Barber.OnboardingFlow.INDEPENDENT,
            email_verified_at=timezone.now(),
        )
        self.barber.set_password("testpass12")
        self.barber.save()
        self.profile = BarberProfile.objects.create(
            barber=self.barber,
            location_text="Toshkent",
            latitude=41.31,
            longitude=69.28,
        )
        self.svc = BarberService.objects.create(
            profile=self.profile,
            name="Soch",
            price=50_000,
            duration_minutes=30,
            is_active=True,
        )
        for n in range(2, 6):
            BarberService.objects.create(
                profile=self.profile,
                name=f"Svc{n}",
                price=40_000,
                duration_minutes=20,
                is_active=True,
            )
        for weekday in range(7):
            BarberWorkingHours.objects.create(
                profile=self.profile,
                weekday=weekday,
                open_time=time(9, 0),
                close_time=time(18, 0),
                is_day_off=False,
                breaks=[],
            )
        self.start = (timezone.now() + timedelta(days=3)).replace(
            hour=10, minute=0, second=0, microsecond=0
        )
        access, _ = encode_barber_tokens(self.barber.id)
        self.barber_auth = f"Bearer {access}"

    def _complete_booking(self, booking: Booking) -> None:
        booking.status = Booking.Status.ACCEPTED
        booking.save(update_fields=["status", "updated_at"])
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=self.barber_auth)
        res = self.client.post(f"/api/v1/bookings/{booking.id}/start/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        res = self.client.post(f"/api/v1/bookings/{booking.id}/complete/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_cash_booking_excluded_from_finance_summary(self):
        booking = Booking.objects.create(
            customer=self.user,
            barber=self.barber,
            start_at=self.start,
            end_at=self.start + timedelta(minutes=30),
            status=Booking.Status.PENDING,
            total_price=50_000,
            customer_phone=self.user.phone or "",
            payment_method=Booking.PaymentMethod.CASH,
            payment_status=Booking.PaymentStatus.NOT_APPLICABLE,
        )
        self._complete_booking(booking)

        self.client.credentials(HTTP_AUTHORIZATION=self.barber_auth)
        res = self.client.get("/api/v1/barber/finance/summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(Decimal(body["income_total"]), Decimal("0"))
        self.assertEqual(Decimal(body["cash_total"]), Decimal("50000"))
        self.assertEqual(Decimal(body["online_total"]), Decimal("0"))
        self.assertEqual(len(body["transactions"]), 1)
        self.assertEqual(body["transactions"][0]["payment_method"], "cash")

        bal = self.client.get("/api/v1/barber/payouts/balance/")
        self.assertEqual(bal.status_code, status.HTTP_200_OK)
        self.assertEqual(bal.json()["available_balance"], "0")

    def test_online_booking_included_in_finance_summary(self):
        wallet = WalletService.ensure_wallet(self.user)
        WalletService.top_up(
            wallet=wallet,
            amount=Decimal("100000"),
            idempotency_key="earn-topup",
        )
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/v1/bookings/",
            {
                "barber": self.barber.id,
                "start_at": self.start.isoformat(),
                "barber_service_ids": [self.svc.id],
                "payment_method": "online",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        booking = Booking.objects.get(pk=res.json()["id"])
        self.assertEqual(booking.payment_method, Booking.PaymentMethod.ONLINE)
        self.assertEqual(booking.payment_status, Booking.PaymentStatus.PAID)

        self._complete_booking(booking)

        self.client.credentials(HTTP_AUTHORIZATION=self.barber_auth)
        fin = self.client.get("/api/v1/barber/finance/summary/")
        self.assertEqual(fin.status_code, status.HTTP_200_OK)
        body = fin.json()
        self.assertEqual(Decimal(body["income_total"]), Decimal("50000"))
        self.assertEqual(Decimal(body["online_total"]), Decimal("50000"))
        self.assertEqual(len(body["transactions"]), 1)
        self.assertEqual(body["transactions"][0]["payment_method"], "online")

        bal = self.client.get("/api/v1/barber/payouts/balance/")
        self.assertEqual(bal.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(bal.json()["available_balance"]), Decimal("50000"))

    def test_online_booking_cancel_refunds_wallet(self):
        wallet = WalletService.ensure_wallet(self.user)
        WalletService.top_up(
            wallet=wallet,
            amount=Decimal("100000"),
            idempotency_key="refund-topup",
        )
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/v1/bookings/",
            {
                "barber": self.barber.id,
                "start_at": (self.start + timedelta(hours=2)).isoformat(),
                "barber_service_ids": [self.svc.id],
                "payment_method": "online",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        booking_id = res.json()["id"]

        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal("50000"))

        cancel = self.client.post(f"/api/v1/bookings/{booking_id}/cancel/", {}, format="json")
        self.assertEqual(cancel.status_code, status.HTTP_200_OK)

        booking = Booking.objects.get(pk=booking_id)
        self.assertEqual(booking.payment_status, Booking.PaymentStatus.REFUNDED)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal("100000"))

    def test_online_booking_rejected_without_insufficient_balance(self):
        self.client.force_authenticate(user=self.user)
        slot = (self.start + timedelta(days=1)).replace(hour=15, minute=0)
        res = self.client.post(
            "/api/v1/bookings/",
            {
                "barber": self.barber.id,
                "start_at": slot.isoformat(),
                "barber_service_ids": [self.svc.id],
                "payment_method": "online",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        body = res.json()
        self.assertTrue("payment_method" in body or "detail" in body)
        if "payment_method" in body:
            self.assertIn("balans", str(body["payment_method"]).lower())

    def test_barber_me_analytics_includes_cash_completed_today(self):
        booking = Booking.objects.create(
            customer=self.user,
            barber=self.barber,
            start_at=timezone.now().replace(minute=0, second=0, microsecond=0),
            end_at=timezone.now().replace(minute=30, second=0, microsecond=0),
            status=Booking.Status.PENDING,
            total_price=75_000,
            customer_phone=self.user.phone or "",
            payment_method=Booking.PaymentMethod.CASH,
            payment_status=Booking.PaymentStatus.NOT_APPLICABLE,
        )
        self._complete_booking(booking)

        today = timezone.localdate().isoformat()
        self.client.credentials(HTTP_AUTHORIZATION=self.barber_auth)
        res = self.client.get(
            f"/api/v1/analytics/?barber=me&start={today}&end={today}",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(Decimal(body["cash_total"]), Decimal("75000"))
        self.assertEqual(Decimal(body["revenue"]), Decimal("75000"))
        self.assertEqual(body["completed_count"], 1)
