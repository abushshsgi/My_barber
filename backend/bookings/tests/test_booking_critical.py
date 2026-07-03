"""Kritik bron va sharh oqimlari."""

from datetime import time, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from barbers.barber_auth import BarberPrincipal
from barbers.models import Barber, BarberProfile, BarberService, BarberWorkingHours
from bookings.models import Booking, Review
from chat.models import Conversation, Message
from notifications.models import Notification
from salons.models import (
    BarberWorkingHours as SalonBarberWorkingHours,
    Salon,
    SalonHours,
    SalonMembership,
    Service,
)

User = get_user_model()


class BookingCriticalTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="u1@test.uz",
            email="u1@test.uz",
            password="testpass12",
            phone="+998901112233",
        )
        self.user_no_phone = User.objects.create_user(
            username="u2@test.uz",
            email="u2@test.uz",
            password="testpass12",
            phone=None,
        )
        self.barber = Barber.objects.create(
            email="b1@test.uz",
            username="b1@test.uz",
            full_name="Barber One",
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

    def test_booking_requires_customer_phone(self):
        self.client.force_authenticate(user=self.user_no_phone)
        start = timezone.now() + timedelta(days=1)
        start = start.replace(hour=10, minute=0, second=0, microsecond=0)
        res = self.client.post(
            "/api/v1/bookings/",
            {
                "barber": self.barber.id,
                "start_at": start.isoformat(),
                "barber_service_ids": [self.svc.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_booking_overlap_rejected(self):
        self.client.force_authenticate(user=self.user)
        t0 = timezone.now() + timedelta(days=2)
        t0 = t0.replace(hour=14, minute=0, second=0, microsecond=0)
        Booking.objects.create(
            customer=self.user,
            barber=self.barber,
            start_at=t0,
            end_at=t0 + timedelta(minutes=30),
            status=Booking.Status.ACCEPTED,
            total_price=50_000,
            customer_phone=self.user.phone or "",
        )
        res = self.client.post(
            "/api/v1/bookings/",
            {
                "barber": self.barber.id,
                "start_at": t0.isoformat(),
                "barber_service_ids": [self.svc.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_booking_saves_customer_phone_snapshot(self):
        self.client.force_authenticate(user=self.user)
        t0 = timezone.now() + timedelta(days=3)
        t0 = t0.replace(hour=11, minute=0, second=0, microsecond=0)
        res = self.client.post(
            "/api/v1/bookings/",
            {
                "barber": self.barber.id,
                "start_at": t0.isoformat(),
                "barber_service_ids": [self.svc.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertEqual(data["status"], "pending")
        bid = data["id"]
        b = Booking.objects.get(pk=bid)
        self.assertEqual(b.customer_phone, self.user.phone)
        self.assertEqual(b.status, Booking.Status.PENDING)

    def test_booking_create_notifies_both_sides_and_unlocks_chat(self):
        self.client.force_authenticate(user=self.user)
        t0 = timezone.now() + timedelta(days=3)
        t0 = t0.replace(hour=12, minute=0, second=0, microsecond=0)

        res = self.client.post(
            "/api/v1/bookings/",
            {
                "barber": self.barber.id,
                "start_at": t0.isoformat(),
                "barber_service_ids": [self.svc.id],
            },
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Notification.objects.filter(user=self.user, type="booking_pending").exists()
        )
        self.assertTrue(
            Notification.objects.filter(barber=self.barber, type="new_booking").exists()
        )

        chat_res = self.client.post(
            "/api/v1/chat/conversations/",
            {"barber_id": self.barber.id},
            format="json",
        )
        self.assertEqual(chat_res.status_code, status.HTTP_201_CREATED)
        conversation_id = chat_res.json()["id"]
        self.assertTrue(
            Conversation.objects.filter(user=self.user, barber=self.barber).exists()
        )

        msg_res = self.client.post(
            f"/api/v1/chat/conversations/{conversation_id}/messages/",
            {"text": "Salom"},
            format="json",
        )
        self.assertEqual(msg_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Message.objects.get().sender_kind, Message.SenderKind.USER)

        barber_client = APIClient()
        barber_client.force_authenticate(user=BarberPrincipal(self.barber))
        barber_msg_res = barber_client.post(
            f"/api/v1/chat/conversations/{conversation_id}/messages/",
            {"text": "Assalomu alaykum"},
            format="json",
        )
        self.assertEqual(barber_msg_res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Notification.objects.filter(user=self.user, type="chat_message").exists()
        )

    def test_independent_schedule_exception_day_off_blocks_slots(self):
        from barbers.models import BarberScheduleException

        target = timezone.now() + timedelta(days=8)
        target = target.replace(hour=10, minute=0, second=0, microsecond=0)
        # Haftalik jadval ishlaydigan kun, lekin sana istisnosi — dam olish.
        BarberScheduleException.objects.create(
            profile=self.profile,
            date=target.date(),
            is_day_off=True,
            note="Ta'til",
        )
        self.client.force_authenticate(user=self.user)
        res = self.client.get(
            "/api/v1/barbers/availability/",
            {
                "barber": self.barber.id,
                "date": target.date().isoformat(),
                "barber_service_ids": str(self.svc.id),
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(body["slots"], [])
        self.assertIn("dam", body.get("closed_reason", "").lower())

    def test_independent_schedule_exception_custom_hours(self):
        from barbers.models import BarberScheduleException

        target = timezone.now() + timedelta(days=9)
        target = target.replace(hour=10, minute=0, second=0, microsecond=0)
        wh = BarberWorkingHours.objects.get(profile=self.profile, weekday=target.weekday())
        wh.is_day_off = True
        wh.save(update_fields=["is_day_off"])
        # Haftalik dam kun, lekin shu sanada maxsus ish soati ochiladi.
        BarberScheduleException.objects.create(
            profile=self.profile,
            date=target.date(),
            is_day_off=False,
            open_time=time(14, 0),
            close_time=time(17, 0),
            breaks=[{"start": "15:00", "end": "15:30"}],
        )
        self.client.force_authenticate(user=self.user)
        res = self.client.get(
            "/api/v1/barbers/availability/",
            {
                "barber": self.barber.id,
                "date": target.date().isoformat(),
                "barber_service_ids": str(self.svc.id),
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slots = res.json()["slots"]
        self.assertTrue(slots)
        self.assertTrue(all(s >= "14:00" for s in slots))
        # 15:00 tanaffus — 30 daqiqalik xizmat 15:00 da boshlanmaydi.
        self.assertNotIn("15:00", slots)

    def test_independent_booking_respects_day_off_and_breaks(self):
        target = timezone.now() + timedelta(days=5)
        target = target.replace(hour=12, minute=0, second=0, microsecond=0)
        wh = BarberWorkingHours.objects.get(profile=self.profile, weekday=target.weekday())
        wh.is_day_off = True
        wh.save(update_fields=["is_day_off"])

        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/v1/bookings/",
            {
                "barber": self.barber.id,
                "start_at": target.isoformat(),
                "barber_service_ids": [self.svc.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        wh.is_day_off = False
        wh.breaks = [{"start": "12:00", "end": "13:00"}]
        wh.save(update_fields=["is_day_off", "breaks"])
        availability = self.client.get(
            "/api/v1/barbers/availability/",
            {
                "barber": self.barber.id,
                "date": target.date().isoformat(),
                "barber_service_ids": str(self.svc.id),
            },
        )
        self.assertEqual(availability.status_code, status.HTTP_200_OK)
        self.assertNotIn("12:00", availability.json()["slots"])

    def test_independent_advance_booking_mode_blocks_today(self):
        self.profile.booking_mode = "advance"
        self.profile.advance_min_days = 2
        self.profile.advance_max_days = 3
        self.profile.save(update_fields=["booking_mode", "advance_min_days", "advance_max_days"])

        self.client.force_authenticate(user=self.user)
        today = timezone.localdate()
        res_today = self.client.get(
            "/api/v1/barbers/availability/",
            {
                "barber": self.barber.id,
                "date": today.isoformat(),
                "barber_service_ids": str(self.svc.id),
            },
        )
        self.assertEqual(res_today.status_code, status.HTTP_200_OK)
        self.assertEqual(res_today.json()["slots"], [])
        self.assertEqual(res_today.json().get("booking_mode"), "advance")

        target = today + timedelta(days=2)
        res_ok = self.client.get(
            "/api/v1/barbers/availability/",
            {
                "barber": self.barber.id,
                "date": target.isoformat(),
                "barber_service_ids": str(self.svc.id),
            },
        )
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertTrue(res_ok.json()["slots"])

        too_far = today + timedelta(days=5)
        res_far = self.client.get(
            "/api/v1/barbers/availability/",
            {
                "barber": self.barber.id,
                "date": too_far.isoformat(),
                "barber_service_ids": str(self.svc.id),
            },
        )
        self.assertEqual(res_far.status_code, status.HTTP_200_OK)
        self.assertEqual(res_far.json()["slots"], [])

    def test_salon_booking_filters_services_by_selected_barber(self):
        self.barber.work_mode = Barber.WorkMode.SALON
        self.barber.onboarding_flow = Barber.OnboardingFlow.OWNER
        self.barber.save()
        other = Barber.objects.create(
            email="b2@test.uz",
            username="b2@test.uz",
            full_name="Barber Two",
            phone="+998900000000",
            email_verified_at=timezone.now(),
            onboarding_flow=Barber.OnboardingFlow.EMPLOYEE,
        )
        salon = Salon.objects.create(
            owner_barber=self.barber,
            name="Salon Test",
            latitude=41.31,
            longitude=69.28,
            address="Toshkent",
            is_published=True,
        )
        membership = SalonMembership.objects.create(
            barber=self.barber,
            salon=salon,
            role=SalonMembership.Role.OWNER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )
        other_membership = SalonMembership.objects.create(
            barber=other,
            salon=salon,
            role=SalonMembership.Role.WORKER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )
        for weekday in range(7):
            SalonHours.objects.create(
                salon=salon,
                weekday=weekday,
                open_time=time(9, 0),
                close_time=time(18, 0),
            )
        target = timezone.now() + timedelta(days=6)
        target = target.replace(hour=10, minute=0, second=0, microsecond=0)
        SalonBarberWorkingHours.objects.create(
            membership=membership,
            weekday=target.weekday(),
            open_time=time(9, 0),
            close_time=time(18, 0),
            is_day_off=False,
            breaks=[],
        )
        SalonBarberWorkingHours.objects.create(
            membership=other_membership,
            weekday=target.weekday(),
            open_time=time(9, 0),
            close_time=time(18, 0),
            is_day_off=False,
            breaks=[],
        )
        own_service = Service.objects.create(
            salon=salon,
            barber=self.barber,
            name="Owner service",
            price=60_000,
            duration_minutes=30,
            is_active=True,
        )
        other_service = Service.objects.create(
            salon=salon,
            barber=other,
            name="Other service",
            price=70_000,
            duration_minutes=30,
            is_active=True,
        )
        for i in range(4):
            Service.objects.create(
                salon=salon,
                barber=None,
                name=f"Salon extra {i}",
                price=15_000,
                duration_minutes=15,
                is_active=True,
            )

        self.client.force_authenticate(user=self.user)
        bad_availability = self.client.get(
            "/api/v1/bookings/availability/",
            {
                "salon": salon.id,
                "barber": self.barber.id,
                "date": target.date().isoformat(),
                "service_ids": str(other_service.id),
            },
        )
        self.assertEqual(bad_availability.status_code, status.HTTP_400_BAD_REQUEST)

        good_availability = self.client.get(
            "/api/v1/bookings/availability/",
            {
                "salon": salon.id,
                "barber": self.barber.id,
                "date": target.date().isoformat(),
                "service_ids": str(own_service.id),
            },
        )
        self.assertEqual(good_availability.status_code, status.HTTP_200_OK)
        self.assertIn("10:00", good_availability.json()["slots"])

        bad_booking = self.client.post(
            "/api/v1/bookings/",
            {
                "salon": salon.id,
                "barber": self.barber.id,
                "start_at": target.isoformat(),
                "service_ids": [other_service.id],
            },
            format="json",
        )
        self.assertEqual(bad_booking.status_code, status.HTTP_400_BAD_REQUEST)

    def test_service_recommendations_endpoint_returns_rule_based_items(self):
        self.client.force_authenticate(user=BarberPrincipal(self.barber))
        res = self.client.get("/api/v1/barber/service-recommendations/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["kind"] == "add_service" for item in res.json()))

    def test_barber_accept_updates_booking_and_notifies_user(self):
        t0 = timezone.now() + timedelta(days=3)
        t0 = t0.replace(hour=13, minute=0, second=0, microsecond=0)
        booking = Booking.objects.create(
            customer=self.user,
            barber=self.barber,
            start_at=t0,
            end_at=t0 + timedelta(minutes=30),
            status=Booking.Status.PENDING,
            total_price=50_000,
            customer_phone=self.user.phone or "",
        )

        self.client.force_authenticate(user=BarberPrincipal(self.barber))
        res = self.client.post(f"/api/v1/bookings/{booking.id}/accept/")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.ACCEPTED)
        self.assertTrue(
            Notification.objects.filter(
                user=self.user,
                type="booking_accepted",
                payload__booking_id=booking.id,
            ).exists()
        )

    def test_one_review_per_booking(self):
        self.client.force_authenticate(user=self.user)
        t0 = timezone.now() + timedelta(days=4)
        t0 = t0.replace(hour=9, minute=0, second=0, microsecond=0)
        booking = Booking.objects.create(
            customer=self.user,
            barber=self.barber,
            start_at=t0,
            end_at=t0 + timedelta(minutes=30),
            status=Booking.Status.COMPLETED,
            total_price=50_000,
            customer_phone=self.user.phone or "",
        )
        Review.objects.create(
            booking=booking,
            author=self.user,
            salon=None,
            barber=self.barber,
            rating=5,
            text="ok",
        )
        res = self.client.post(
            "/api/v1/reviews/",
            {"booking": booking.id, "rating": 5, "text": "yana"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_month_availability_returns_days(self):
        self.barber.work_mode = Barber.WorkMode.SALON
        self.barber.onboarding_flow = Barber.OnboardingFlow.OWNER
        self.barber.save()
        salon = Salon.objects.create(
            owner_barber=self.barber,
            name="Month Salon",
            latitude=41.31,
            longitude=69.28,
            address="Toshkent",
            is_published=True,
        )
        membership = SalonMembership.objects.create(
            barber=self.barber,
            salon=salon,
            role=SalonMembership.Role.OWNER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )
        for weekday in range(7):
            SalonHours.objects.create(
                salon=salon,
                weekday=weekday,
                open_time=time(9, 0),
                close_time=time(18, 0),
            )
            SalonBarberWorkingHours.objects.create(
                membership=membership,
                weekday=weekday,
                open_time=time(9, 0),
                close_time=time(18, 0),
                is_day_off=False,
                breaks=[],
            )
        Service.objects.create(
            salon=salon,
            barber=self.barber,
            name="Quick cut",
            price=50_000,
            duration_minutes=30,
            is_active=True,
        )
        target = timezone.now() + timedelta(days=10)
        self.client.force_authenticate(user=self.user)
        res = self.client.get(
            "/api/v1/bookings/availability/month/",
            {
                "salon": salon.id,
                "year": target.year,
                "month": target.month,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(body["year"], target.year)
        self.assertEqual(body["month"], target.month)
        self.assertGreater(len(body["days"]), 27)
        self.assertTrue(any(d.get("available") for d in body["days"]))

    def test_month_availability_with_barber_without_service_ids(self):
        self.barber.work_mode = Barber.WorkMode.SALON
        self.barber.onboarding_flow = Barber.OnboardingFlow.OWNER
        self.barber.save()
        salon = Salon.objects.create(
            owner_barber=self.barber,
            name="Month Barber Salon",
            latitude=41.31,
            longitude=69.28,
            address="Toshkent",
            is_published=True,
        )
        membership = SalonMembership.objects.create(
            barber=self.barber,
            salon=salon,
            role=SalonMembership.Role.OWNER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )
        for weekday in range(7):
            SalonHours.objects.create(
                salon=salon,
                weekday=weekday,
                open_time=time(9, 0),
                close_time=time(18, 0),
            )
            SalonBarberWorkingHours.objects.create(
                membership=membership,
                weekday=weekday,
                open_time=time(9, 0),
                close_time=time(18, 0),
                is_day_off=False,
                breaks=[],
            )
        Service.objects.create(
            salon=salon,
            barber=self.barber,
            name="Quick cut",
            price=50_000,
            duration_minutes=30,
            is_active=True,
        )
        target = timezone.now() + timedelta(days=10)
        self.client.force_authenticate(user=self.user)
        res = self.client.get(
            "/api/v1/bookings/availability/month/",
            {
                "salon": salon.id,
                "barber": self.barber.id,
                "year": target.year,
                "month": target.month,
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(body["year"], target.year)
        self.assertGreater(len(body["days"]), 27)
        owner = self.barber
        owner.work_mode = Barber.WorkMode.SALON
        owner.onboarding_flow = Barber.OnboardingFlow.OWNER
        owner.save()
        salon = Salon.objects.create(
            owner_barber=owner,
            name="Proxy Test Salon",
            latitude=41.31,
            longitude=69.28,
            address="Toshkent",
            is_published=True,
        )
        SalonMembership.objects.create(
            barber=owner,
            salon=salon,
            role=SalonMembership.Role.OWNER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )
        worker = Barber.objects.create(
            email="worker@test.uz",
            username="worker@test.uz",
            full_name="Worker Two",
            work_mode=Barber.WorkMode.SALON,
            onboarding_flow=Barber.OnboardingFlow.EMPLOYEE,
            email_verified_at=timezone.now(),
        )
        SalonMembership.objects.create(
            barber=worker,
            salon=salon,
            role=SalonMembership.Role.WORKER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )
        t0 = timezone.now() + timedelta(days=5)
        t0 = t0.replace(hour=11, minute=0, second=0, microsecond=0)
        booking = Booking.objects.create(
            customer=self.user,
            barber=worker,
            salon=salon,
            start_at=t0,
            end_at=t0 + timedelta(minutes=30),
            status=Booking.Status.PENDING,
            total_price=50_000,
            customer_phone=self.user.phone or "",
        )

        self.client.force_authenticate(user=BarberPrincipal(owner))
        res = self.client.post(f"/api/v1/bookings/{booking.id}/accept/")
        # Egasi faqat o'z bronlarini ko'radi (get_queryset barber=bp) — ishchi broni 404.
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.PENDING)
