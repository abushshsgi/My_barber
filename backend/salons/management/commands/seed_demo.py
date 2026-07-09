"""Investor / Uzcombinator demo: 30 salon + 10 barber + mijozlar, chat, bron."""

from __future__ import annotations

import random
from datetime import time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.uz_regions import UzRegion
from barbers.models import Barber, BarberProfile
from bookings.models import Booking
from chat.models import Conversation, Message
from notifications.models import Notification
from salons.mock.demo_extras import (
    DEMO_CHAT_THREADS,
    DEMO_USER_MARKER,
    DEMO_USERS,
    NOTIFICATION_SAMPLES,
    demo_user_email,
)
from salons.mock.demo_seed import (
    DEMO_BARBER_PASSWORD,
    DEMO_BARBERS,
    DEMO_MARKER,
    DEMO_SALON_COUNT,
    DEMO_SALONS,
    DEMO_SERVICE_TEMPLATES,
)
from salons.mock.mock_reviews import _ensure_mock_customers, purge_mock_review_users, seed_reviews_for_salon
from salons.models import BarberWorkingHours, Salon, SalonHours, SalonMembership, Service

User = get_user_model()


class Command(BaseCommand):
    help = (
        f"Demo muhit: {DEMO_SALON_COUNT} salon, {len(DEMO_BARBERS)} barber, "
        f"{len(DEMO_USERS)} mijoz, chat va bronlar. O'chirish: --purge"
    )

    def add_arguments(self, parser):
        parser.add_argument("--purge", action="store_true", help="Demo ma'lumotlarni o'chirish.")
        parser.add_argument("--skip-reviews", action="store_true", help="Sharhlarni o'tkazib yuborish.")

    def handle(self, *args, **options):
        if options["purge"]:
            self._purge()
            return
        self._seed(skip_reviews=options["skip_reviews"])

    @transaction.atomic
    def _purge(self):
        demo_salon_ids = list(
            Salon.objects.filter(description__startswith=DEMO_MARKER).values_list("id", flat=True)
        )
        salon_count = len(demo_salon_ids)
        Salon.objects.filter(id__in=demo_salon_ids).delete()
        deleted_barbers = Barber.objects.filter(email__endswith="@mysaloon.demo").delete()[0]
        deleted_users = User.objects.filter(email__startswith=f"{DEMO_USER_MARKER}-").delete()[0]
        deleted_review_users = purge_mock_review_users()
        self.stdout.write(
            self.style.SUCCESS(
                f"O'chirildi: {salon_count} salon, {deleted_barbers} barber, "
                f"{deleted_users} demo mijoz, {deleted_review_users} mock mijoz."
            )
        )

    @transaction.atomic
    def _seed(self, *, skip_reviews: bool) -> None:
        now = timezone.now()
        barbers_by_slug: dict[str, Barber] = {}
        reviews_created = 0
        review_customers = _ensure_mock_customers(20) if not skip_reviews else []
        rng = random.Random(2026)

        for entry in DEMO_BARBERS:
            barber, created = Barber.objects.update_or_create(
                email=entry["email"],
                defaults={
                    "username": entry["username"],
                    "full_name": entry["full_name"],
                    "phone": entry["phone"],
                    "region": UzRegion.TOSHKENT_SH,
                    "work_mode": Barber.WorkMode.SALON,
                    "onboarding_flow": Barber.OnboardingFlow.OWNER,
                    "email_verified_at": now,
                    "onboarding_completed_at": now,
                    "is_active": True,
                },
            )
            barber.set_password(DEMO_BARBER_PASSWORD)
            barber.save()
            BarberProfile.objects.update_or_create(
                barber=barber,
                defaults={
                    "location_text": "Toshkent",
                    "latitude": Decimal("41.299500"),
                    "longitude": Decimal("69.240100"),
                },
            )
            barbers_by_slug[entry["slug"]] = barber
            action = "yaratildi" if created else "yangilandi"
            self.stdout.write(f"  Barber {action}: {entry['full_name']} <{entry['email']}>")

        salons_by_slug: dict[str, Salon] = {}
        salons_created = 0
        salons_updated = 0

        for entry in DEMO_SALONS:
            owner = barbers_by_slug[entry["owner_slug"]]
            salon, salon_created = Salon.objects.update_or_create(
                slug=entry["slug"],
                defaults={
                    "name": entry["name"],
                    "latitude": Decimal(str(entry["lat"])),
                    "longitude": Decimal(str(entry["lng"])),
                    "address": entry["address"],
                    "description": f"{DEMO_MARKER}: investor demo salon — Toshkent.",
                    "is_published": True,
                    "owner_barber": owner,
                    "phone": owner.phone or "",
                    "premium": entry["slug"] in {"demo-salon-01", "demo-salon-05", "demo-salon-10"},
                },
            )
            salons_by_slug[entry["slug"]] = salon

            membership, _ = SalonMembership.objects.update_or_create(
                barber=owner,
                salon=salon,
                defaults={
                    "role": SalonMembership.Role.OWNER,
                    "invite_state": SalonMembership.InviteState.ACTIVE,
                    "owner_approved": True,
                    "activated_at": now,
                },
            )

            for weekday in range(7):
                SalonHours.objects.update_or_create(
                    salon=salon,
                    weekday=weekday,
                    defaults={"open_time": time(9, 0), "close_time": time(21, 0)},
                )
                BarberWorkingHours.objects.update_or_create(
                    membership=membership,
                    weekday=weekday,
                    defaults={
                        "open_time": time(9, 0),
                        "close_time": time(21, 0),
                        "is_day_off": weekday == 6,
                        "breaks": [{"start": "13:00", "end": "14:00"}],
                    },
                )

            for svc_name, price, duration in DEMO_SERVICE_TEMPLATES:
                Service.objects.update_or_create(
                    salon=salon,
                    barber=None,
                    name=svc_name,
                    defaults={
                        "price": Decimal(str(price)),
                        "duration_minutes": duration,
                        "is_active": True,
                    },
                )

            if review_customers:
                reviews_created += seed_reviews_for_salon(salon, owner, entry["kind"], review_customers, rng)

            if salon_created:
                salons_created += 1
            else:
                salons_updated += 1

        demo_users = self._seed_demo_users(now)
        bookings_created = self._seed_active_bookings(now, demo_users, barbers_by_slug, salons_by_slug, rng)
        chats_created = self._seed_chats(now, demo_users, list(barbers_by_slug.values()), rng)
        notifications_created = self._seed_notifications(demo_users, barbers_by_slug, rng)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=== Demo muhit tayyor ==="))
        self.stdout.write(f"Salonlar: {salons_created} yangi, {salons_updated} yangilangan (jami {DEMO_SALON_COUNT})")
        self.stdout.write(f"Sharhlar: {reviews_created} | Bronlar: {bookings_created} | Chatlar: {chats_created}")
        self.stdout.write(f"Bildirishnomalar: {notifications_created}")
        self.stdout.write("")
        self.stdout.write("Mijoz (demo.mysaloon.uz) — telefon OTP:")
        for entry in DEMO_USERS:
            self.stdout.write(f"  • {entry['phone']} — {entry['full_name']}")
        self.stdout.write("")
        self.stdout.write("Barber (demo.partner.mysaloon.uz):")
        self.stdout.write(f"  Parol: {DEMO_BARBER_PASSWORD}")
        for entry in DEMO_BARBERS:
            self.stdout.write(f"  • {entry['email']}")
        self.stdout.write("")
        self.stdout.write("O'chirish: python manage.py seed_demo --purge")

    def _seed_demo_users(self, now) -> list:
        users = []
        for entry in DEMO_USERS:
            email = demo_user_email(entry["slug"])
            user, _ = User.objects.update_or_create(
                email=email,
                defaults={
                    "username": email,
                    "phone": entry["phone"],
                    "full_name": entry["full_name"],
                    "region": UzRegion.TOSHKENT_SH,
                    "onboarding_completed": True,
                },
            )
            users.append(user)
        return users

    def _seed_active_bookings(
        self,
        now,
        users: list,
        barbers_by_slug: dict[str, Barber],
        salons_by_slug: dict[str, Salon],
        rng: random.Random,
    ) -> int:
        Booking.objects.filter(salon__description__startswith=DEMO_MARKER, notes__startswith="[demo]").delete()

        specs = [
            (Booking.Status.PENDING, 1, 15, 0),
            (Booking.Status.PENDING, 2, 11, 30),
            (Booking.Status.ACCEPTED, 1, 16, 0),
            (Booking.Status.ACCEPTED, 3, 14, 0),
            (Booking.Status.IN_PROGRESS, 0, 10, 0),
            (Booking.Status.COMPLETED, -1, 17, 0),
        ]
        created = 0
        barber_list = list(barbers_by_slug.values())
        salon_list = list(salons_by_slug.values())

        for status, day_offset, hour, minute in specs:
            user = users[created % len(users)]
            barber = barber_list[created % len(barber_list)]
            salon = salon_list[created % len(salon_list)]
            start = (now + timedelta(days=day_offset)).replace(
                hour=hour, minute=minute, second=0, microsecond=0
            )
            end = start + timedelta(minutes=45)
            Booking.objects.create(
                customer=user,
                barber=barber,
                salon=salon,
                start_at=start,
                end_at=end,
                status=status,
                total_price=Decimal(str(rng.randint(60_000, 150_000))),
                customer_phone=user.phone or "",
                notes="[demo] Uzcombinator demo bron",
            )
            created += 1
        return created

    def _seed_chats(
        self,
        now,
        users: list,
        barbers: list[Barber],
        rng: random.Random,
    ) -> int:
        created = 0
        for idx, script in enumerate(DEMO_CHAT_THREADS):
            user = users[idx % len(users)]
            barber = barbers[idx % len(barbers)]
            convo, _ = Conversation.objects.update_or_create(
                user=user,
                barber=barber,
                defaults={"last_message_text": script[-1][1], "last_message_at": now},
            )
            if convo.messages.exists():
                continue
            base_time = now - timedelta(hours=rng.randint(2, 48))
            for offset, (sender, text) in enumerate(script):
                Message.objects.create(
                    conversation=convo,
                    sender_kind=Message.SenderKind.USER if sender == "USER" else Message.SenderKind.BARBER,
                    sender_user=user if sender == "USER" else None,
                    sender_barber=barber if sender == "BARBER" else None,
                    text=text,
                    created_at=base_time + timedelta(minutes=offset * 3),
                )
            created += 1
        return created

    def _seed_notifications(
        self,
        users: list,
        barbers_by_slug: dict[str, Barber],
        rng: random.Random,
    ) -> int:
        Notification.objects.filter(user__email__startswith=f"{DEMO_USER_MARKER}-").delete()
        Notification.objects.filter(barber__email__endswith="@mysaloon.demo").delete()
        created = 0
        for user in users[:4]:
            for ntype, title, body in NOTIFICATION_SAMPLES[:2]:
                Notification.objects.create(user=user, type=ntype, title=title, body=body)
                created += 1
        barber = list(barbers_by_slug.values())[0]
        for ntype, title, body in NOTIFICATION_SAMPLES[1:3]:
            Notification.objects.create(barber=barber, type=ntype, title=title, body=body)
            created += 1
        return created
