"""Barber 100% tayyorlik va email tasdiq."""

from datetime import time

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from barbers.barber_auth import encode_barber_tokens
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

    def test_onboarding_status_does_not_auto_send_verification_email(self):
        access, _ = encode_barber_tokens(self.barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        mail.outbox.clear()
        res = self.client.get("/api/v1/barber/onboarding/status/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_onboarding_status_fully_ready_without_email_verify(self):
        access, _ = encode_barber_tokens(self.barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        res = self.client.get("/api/v1/barber/onboarding/status/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertTrue(body["fully_ready"])
        self.assertTrue(body["email_verified"])
        self.assertNotIn("email", body["booking_missing"])

    def test_onboarding_status_anonymous_returns_401(self):
        """Auth sahifasida stale JWT bo‘lmasa GET status 403 emas, 401 bo‘lishi kerak."""
        self.client.credentials()
        res = self.client.get("/api/v1/barber/onboarding/status/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_onboarding_status_me_anonymous_returns_401(self):
        self.client.credentials()
        res = self.client.get("/api/v1/barber/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
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

    def test_owner_with_salon_incomplete_setup_no_create_redirect(self):
        owner = Barber.objects.create(
            email="partial@test.uz",
            username="partial@test.uz",
            full_name="Partial Owner",
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
            name="Partial Salon",
            owner_barber=owner,
            latitude=41.0,
            longitude=69.0,
        )
        SalonMembership.objects.create(
            barber=owner,
            salon=salon,
            role=SalonMembership.Role.OWNER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )
        from barbers.readiness import compute_barber_readiness

        r = compute_barber_readiness(owner)
        self.assertFalse(r.signup_complete)
        self.assertIsNone(r.required_next_path)

    def test_resend_verification_sends_mail(self):
        access, _ = encode_barber_tokens(self.barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        mail.outbox.clear()
        res = self.client.post("/api/v1/barber/auth/resend-verification-email/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

    def test_phone_only_barber_email_step_skipped_in_readiness(self):
        from barbers.readiness import compute_barber_readiness

        phone_barber = Barber.objects.create(
            email="998901112233@phone.mysaloon.local",
            username="998901112233@phone.mysaloon.local",
            full_name="Phone Barber",
            phone="+998901112233",
            work_mode=Barber.WorkMode.INDEPENDENT,
            onboarding_flow=Barber.OnboardingFlow.INDEPENDENT,
        )
        r = compute_barber_readiness(phone_barber)
        self.assertTrue(r.email_verified)

    def test_onboarding_status_does_not_send_email_before_setup_complete(self):
        """Email tasdiqlash o‘chirilgan — setup tugamasdan ham xat yuborilmaydi."""
        partial = Barber.objects.create(
            email="partial@test.uz",
            username="partial@test.uz",
            full_name="Partial",
            work_mode=Barber.WorkMode.SALON,
            onboarding_flow=Barber.OnboardingFlow.OWNER,
        )
        partial.set_password("pass12345")
        partial.save()
        access, _ = encode_barber_tokens(partial.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        mail.outbox.clear()
        res = self.client.get("/api/v1/barber/onboarding/status/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.json()["fully_ready"])
        self.assertEqual(len(mail.outbox), 0)
