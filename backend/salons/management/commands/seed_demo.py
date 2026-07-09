"""Investor / Uzcombinator demo: 30 salon + 10 barber akkaunt."""

from __future__ import annotations

import random
from datetime import time
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.uz_regions import UzRegion
from barbers.models import Barber, BarberProfile
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


class Command(BaseCommand):
    help = (
        f"Demo ma'lumot: {DEMO_SALON_COUNT} ta salon (Toshkent) + "
        f"{len(DEMO_BARBERS)} ta barber login. O'chirish: --purge"
    )

    def add_arguments(self, parser):
        parser.add_argument("--purge", action="store_true", help="Demo salon va barberlarni o'chirish.")
        parser.add_argument("--skip-reviews", action="store_true", help="Sharhlarni o'tkazib yuborish.")

    def handle(self, *args, **options):
        if options["purge"]:
            self._purge()
            return
        self._seed(skip_reviews=options["skip_reviews"])

    @transaction.atomic
    def _purge(self):
        mock_salons = Salon.objects.filter(description__startswith=DEMO_MARKER)
        salon_count = mock_salons.count()
        mock_salons.delete()
        deleted_barbers = Barber.objects.filter(email__endswith="@mysaloon.demo").delete()[0]
        deleted_review_users = purge_mock_review_users()
        self.stdout.write(
            self.style.SUCCESS(
                f"O'chirildi: {salon_count} demo salon, {deleted_barbers} barber, "
                f"{deleted_review_users} mock mijoz."
            )
        )

    @transaction.atomic
    def _seed(self, *, skip_reviews: bool) -> None:
        now = timezone.now()
        barbers_by_slug: dict[str, Barber] = {}
        reviews_created = 0
        customers = _ensure_mock_customers(20) if not skip_reviews else []
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

            if customers:
                reviews_created += seed_reviews_for_salon(salon, owner, entry["kind"], customers, rng)

            if salon_created:
                salons_created += 1
            else:
                salons_updated += 1

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=== Demo tayyor ==="))
        self.stdout.write(f"Salonlar: {salons_created} yangi, {salons_updated} yangilangan (jami {DEMO_SALON_COUNT})")
        self.stdout.write(f"Sharhlar: {reviews_created} ta")
        self.stdout.write("")
        self.stdout.write("Barber login (partner.mysaloon.uz):")
        self.stdout.write(f"  Parol (hammasi uchun): {DEMO_BARBER_PASSWORD}")
        for entry in DEMO_BARBERS:
            self.stdout.write(f"  • {entry['email']}")
        self.stdout.write("")
        self.stdout.write("Mijoz ilovasi: https://www.mysaloon.uz — xaritada Toshkent salonlari")
        self.stdout.write("O'chirish: python manage.py seed_demo --purge")
