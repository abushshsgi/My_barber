"""Barber 100% tayyorlik va email tasdiq."""

from datetime import time

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from barbers.barber_auth import encode_barber_tokens
from barbers.email_verification import sign_barber_email_token
from barbers.models import Barber, BarberProfile, BarberService, BarberWorkingHours
from salons.models import Salon, SalonMembership


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

    def test_owner_services_ok_counts_barber_services_not_only_salon_service(self):
        """Barber panel BarberService yozadi; salon Service bo‘lmasa ham 5+ hisoblansin."""
        owner = Barber.objects.create(
            email="owner@test.uz",
            username="owner@test.uz",
            full_name="Owner B",
            work_mode=Barber.WorkMode.SALON,
            onboarding_flow=Barber.OnboardingFlow.OWNER,
        )
        owner.set_password("pass12345")
        owner.save()
        prof = BarberProfile.objects.create(
            barber=owner,
            latitude=41.0,
            longitude=69.0,
            location_text="Toshkent",
        )
        salon = Salon.objects.create(
            name=f"Test Salon {owner.email}",
            owner_barber=owner,
            latitude=41.0,
            longitude=69.0,
        )
        mem = SalonMembership.objects.create(
            barber=owner,
            salon=salon,
            role=SalonMembership.Role.OWNER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )
        for i in range(5):
            BarberService.objects.create(
                profile=prof,
                name=f"OwnerSvc{i}",
                price=15_000,
                duration_minutes=30,
                is_active=True,
            )
        from salons.models import BarberWorkingHours as SalonWH

        SalonWH.objects.create(
            membership=mem,
            weekday=1,
            open_time=time(9, 0),
            close_time=time(18, 0),
            is_day_off=False,
        )
        from barbers.readiness import compute_barber_readiness

        r = compute_barber_readiness(owner)
        self.assertGreaterEqual(r.has_services_count, 5)
        self.assertTrue(r.services_ok)

    def test_owner_signup_complete_with_salon_services_only(self):
        """Owner create flow salon Service yozadi — BarberService bo‘lmasa ham signup_complete."""
        owner = Barber.objects.create(
            email="salononly@test.uz",
            username="salononly@test.uz",
            full_name="Salon Owner",
            work_mode=Barber.WorkMode.SALON,
            onboarding_flow=Barber.OnboardingFlow.OWNER,
        )
        owner.set_password("pass12345")
        owner.save()
        BarberProfile.objects.create(
            barber=owner,
            latitude=41.0,
            longitude=69.0,
            location_text="Toshkent, Chilonzor",
        )
        salon = Salon.objects.create(
            name="Only Salon Services",
            owner_barber=owner,
            latitude=41.0,
            longitude=69.0,
        )
        mem = SalonMembership.objects.create(
            barber=owner,
            salon=salon,
            role=SalonMembership.Role.OWNER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )
        from salons.models import Service, SalonHours

        Service.objects.create(
            salon=salon,
            name="Soch olish",
            price=50_000,
            duration_minutes=30,
            is_active=True,
        )
        SalonHours.objects.create(
            salon=salon,
            weekday=1,
            open_time=time(9, 0),
            close_time=time(18, 0),
        )
        from barbers.readiness import compute_barber_readiness

        r = compute_barber_readiness(owner)
        self.assertTrue(r.signup_complete)
        self.assertIsNone(r.required_next_path)
        self.assertTrue(r.has_membership_hours)

    def test_resend_verification_sends_mail(self):
        access, _ = encode_barber_tokens(self.barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        mail.outbox.clear()
        res = self.client.post("/api/v1/barber/auth/resend-verification-email/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
