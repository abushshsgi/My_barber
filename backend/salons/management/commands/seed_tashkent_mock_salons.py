"""Toshkent bo'ylab 50 ta bookable mock salon yaratish yoki o'chirish."""

from datetime import time
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.uz_regions import UzRegion
from barbers.models import Barber, BarberProfile
from salons.mock.tashkent_salons import MOCK_MARKER, SERVICE_TEMPLATES, TASHKENT_MOCK_SALONS
from salons.models import BarberWorkingHours, Salon, SalonHours, SalonMembership, Service


class Command(BaseCommand):
    help = (
        "Toshkent bo'ylab 50 ta mock salon + egasi-barber + xizmatlar + ish vaqti. "
        "Keyin `--purge` bilan o'chirish mumkin."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--purge",
            action="store_true",
            help="Mock salonlar va ularning egasi-barberlarini o'chirish.",
        )

    def handle(self, *args, **options):
        if options["purge"]:
            self._purge()
            return
        self._seed()

    @transaction.atomic
    def _purge(self):
        mock_salons = Salon.objects.filter(description__startswith=MOCK_MARKER)
        barber_ids = list(
            mock_salons.exclude(owner_barber_id__isnull=True).values_list("owner_barber_id", flat=True)
        )
        count = mock_salons.count()
        mock_salons.delete()
        deleted_barbers = Barber.objects.filter(
            email__startswith="mock-tashkent-",
            email__endswith="@mybarber.test",
        ).delete()[0]
        self.stdout.write(
            self.style.SUCCESS(
                f"O'chirildi: {count} mock salon, {deleted_barbers} mock barber "
                f"(owner ids: {len(barber_ids)})."
            )
        )

    @transaction.atomic
    def _seed(self):
        now = timezone.now()
        created = 0
        updated = 0

        for entry in TASHKENT_MOCK_SALONS:
            slug = entry["slug"]
            email = f"{slug}@mybarber.test"
            username = slug.replace("-", "_")

            barber, barber_created = Barber.objects.get_or_create(
                email=email,
                defaults={
                    "username": username,
                    "full_name": f"{entry['name']} egasi",
                    "phone": f"+99890{1000000 + int(slug.split('-')[-1]):07d}"[:13],
                    "region": UzRegion.TOSHKENT_SH,
                    "work_mode": Barber.WorkMode.SALON,
                    "onboarding_flow": Barber.OnboardingFlow.OWNER,
                    "email_verified_at": now,
                    "onboarding_completed_at": now,
                },
            )
            if not barber_created:
                barber.region = UzRegion.TOSHKENT_SH
                barber.work_mode = Barber.WorkMode.SALON
                barber.onboarding_flow = Barber.OnboardingFlow.OWNER
                barber.email_verified_at = barber.email_verified_at or now
                barber.onboarding_completed_at = barber.onboarding_completed_at or now
                barber.save()
            if barber_created:
                barber.set_password("mock-tashkent-seed-9")
                barber.save()

            BarberProfile.objects.update_or_create(
                barber=barber,
                defaults={
                    "location_text": entry["address"],
                    "latitude": Decimal(str(entry["lat"])),
                    "longitude": Decimal(str(entry["lng"])),
                },
            )

            salon, salon_created = Salon.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": entry["name"],
                    "latitude": Decimal(str(entry["lat"])),
                    "longitude": Decimal(str(entry["lng"])),
                    "address": entry["address"],
                    "description": f"{MOCK_MARKER}: {entry['kind']} demo salon — Toshkent mock.",
                    "is_published": True,
                    "owner_barber": barber,
                    "phone": f"+99871{2000000 + int(slug.split('-')[-1]):07d}"[:13],
                },
            )

            membership, _ = SalonMembership.objects.update_or_create(
                barber=barber,
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
                    defaults={
                        "open_time": time(9, 0),
                        "close_time": time(20, 0),
                    },
                )
                BarberWorkingHours.objects.update_or_create(
                    membership=membership,
                    weekday=weekday,
                    defaults={
                        "open_time": time(9, 0),
                        "close_time": time(20, 0),
                        "is_day_off": False,
                        "breaks": [{"start": "13:00", "end": "14:00"}],
                    },
                )

            services = SERVICE_TEMPLATES[entry["kind"]]
            for svc_name, price, duration in services:
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

            if salon_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Tayyor: {created} yangi, {updated} yangilangan mock salon "
                f"(jami {len(TASHKENT_MOCK_SALONS)} ta).\n"
                "  Bron qilish: mijoz TOSHKENT_SH regionida login qilgan bo'lsin.\n"
                "  O'chirish: python manage.py seed_tashkent_mock_salons --purge"
            )
        )
