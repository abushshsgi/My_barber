"""Barber 100% tayyorlik va email tasdiq."""

from datetime import time

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from barbers.barber_auth import encode_barber_tokens
from barbers.email_verification import sign_barber_email_token
from barbers.models import Barber, BarberProfile, BarberService, BarberWorkingHours


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    RESEND_API_KEY="",
)
class BarberActivationReadinessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.barber = Barber.objects.create(
            email="ready@test.uz",
            username="ready@test.uz",
            full_name="Ready B",
            work_mode=Barber.WorkMode.INDEPENDENT,
            onboarding_flow=Barber.OnboardingFlow.INDEPENDENT,
        )
        self.barber.set_password("pass12345")
        self.barber.save()
        prof = BarberProfile.objects.create(
            barber=self.barber,
            latitude=41.0,
            longitude=69.0,
            location_text="Toshkent",
        )
        for i in range(5):
            BarberService.objects.create(
                profile=prof,
                name=f"S{i}",
                price=10_000,
                duration_minutes=20,
                is_active=True,
            )
        BarberWorkingHours.objects.create(
            profile=prof,
            weekday=1,
            open_time=time(9, 0),
            close_time=time(18, 0),
            is_day_off=False,
        )

    def test_onboarding_status_sends_verification_email_when_setup_ready(self):
        access, _ = encode_barber_tokens(self.barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        mail.outbox.clear()
        res = self.client.get("/api/v1/barber/onboarding/status/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.barber.refresh_from_db()
        self.assertIsNotNone(self.barber.email_verification_invite_sent_at)

    def test_onboarding_status_does_not_resend_auto_invite(self):
        access, _ = encode_barber_tokens(self.barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        mail.outbox.clear()
        self.client.get("/api/v1/barber/onboarding/status/")
        self.assertEqual(len(mail.outbox), 1)
        mail.outbox.clear()
        self.client.get("/api/v1/barber/onboarding/status/")
        self.assertEqual(len(mail.outbox), 0)

    def test_onboarding_status_not_fully_ready_without_email(self):
        access, _ = encode_barber_tokens(self.barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        res = self.client.get("/api/v1/barber/onboarding/status/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.json()["fully_ready"])
        self.assertIn("email", res.json()["booking_missing"])

    def test_verify_email_then_fully_ready(self):
        token = sign_barber_email_token(self.barber.id)
        res = self.client.post("/api/v1/barber/auth/verify-email/", {"token": token}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.barber.refresh_from_db()
        self.assertIsNotNone(self.barber.email_verified_at)

        access, _ = encode_barber_tokens(self.barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        st = self.client.get("/api/v1/barber/onboarding/status/")
        self.assertEqual(st.status_code, status.HTTP_200_OK)
        self.assertTrue(st.json()["fully_ready"])

    def test_resend_verification_sends_mail(self):
        access, _ = encode_barber_tokens(self.barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        mail.outbox.clear()
        res = self.client.post("/api/v1/barber/auth/resend-verification-email/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
