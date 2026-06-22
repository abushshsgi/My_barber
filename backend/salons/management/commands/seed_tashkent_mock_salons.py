"""Toshkent bo'ylab 250 ta mock salon + Pexels rasmlar + soxta sharhlar."""

from __future__ import annotations

import random
from datetime import time
from decimal import Decimal
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.uz_regions import UzRegion
from barbers.models import Barber, BarberProfile
from salons.mock.mock_reviews import _ensure_mock_customers, purge_mock_review_users, seed_reviews_for_salon
from salons.mock.pexels import download_image, fetch_kind_pool
from salons.mock.tashkent_salons import MOCK_MARKER, MOCK_SALON_COUNT, SERVICE_TEMPLATES, TASHKENT_MOCK_SALONS
from salons.models import BarberWorkingHours, Salon, SalonHours, SalonImage, SalonMembership, Service


class Command(BaseCommand):
    help = (
        f"Toshkent bo'ylab {MOCK_SALON_COUNT} ta mock salon + egasi-barber + xizmatlar + "
        "Pexels rasmlar + soxta sharhlar. Keyin `--purge` bilan o'chirish mumkin."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--purge",
            action="store_true",
            help="Mock salonlar va ularning egasi-barberlarini o'chirish.",
        )
        parser.add_argument(
            "--skip-images",
            action="store_true",
            help="Cover/gallery rasmlarini yuklamaslik.",
        )
        parser.add_argument(
            "--skip-reviews",
            action="store_true",
            help="Soxta sharhlarni yaratmaslik.",
        )

    def handle(self, *args, **options):
        if options["purge"]:
            self._purge()
            return
        self._seed(
            skip_images=options["skip_images"],
            skip_reviews=options["skip_reviews"],
        )

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
        deleted_review_users = purge_mock_review_users()
        self.stdout.write(
            self.style.SUCCESS(
                f"O'chirildi: {count} mock salon, {deleted_barbers} mock barber, "
                f"{deleted_review_users} mock mijoz (owner ids: {len(barber_ids)})."
            )
        )

    def _load_image_pools(self) -> dict[str, list[str]]:
        kind_counts = {"barber": 0, "beauty": 0, "nails": 0, "spa": 0}
        for entry in TASHKENT_MOCK_SALONS:
            kind_counts[entry["kind"]] += 1

        pools: dict[str, list[str]] = {}
        for kind, count in kind_counts.items():
            # cover + 2 gallery = 3 rasm / salon
            need = count * 3 + 10
            self.stdout.write(f"Pexels: {kind} uchun {need} ta rasm yuklanmoqda…")
            pools[kind] = fetch_kind_pool(kind, need)
            self.stdout.write(f"  → {len(pools[kind])} ta URL tayyor")
        return pools

    def _save_cover(self, salon: Salon, url: str, slug: str) -> None:
        if salon.cover_image:
            return
        data = download_image(url)
        salon.cover_image.save(f"{slug}-cover.jpg", ContentFile(data), save=True)

    def _save_gallery(self, salon: Salon, urls: list[str], slug: str) -> None:
        existing = salon.images.count()
        if existing >= 2:
            return
        for i, url in enumerate(urls[:2]):
            if salon.images.filter(sort_order=i).exists():
                continue
            data = download_image(url)
            img = SalonImage(salon=salon, sort_order=existing + i)
            img.image.save(f"{slug}-gallery-{i + 1}.jpg", ContentFile(data), save=True)

    @transaction.atomic
    def _seed(self, *, skip_images: bool, skip_reviews: bool):
        now = timezone.now()
        created = 0
        updated = 0
        reviews_created = 0
        images_set = 0

        pools: dict[str, list[str]] = {}
        kind_idx: dict[str, int] = {"barber": 0, "beauty": 0, "nails": 0, "spa": 0}
        if not skip_images:
            pools = self._load_image_pools()

        customers = _ensure_mock_customers(30) if not skip_reviews else []
        rng = random.Random(42)

        for entry in TASHKENT_MOCK_SALONS:
            slug = entry["slug"]
            email = f"{slug}@mybarber.test"
            username = slug.replace("-", "_")
            kind = entry["kind"]

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
                    "description": f"{MOCK_MARKER}: {kind} demo salon — Toshkent mock.",
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

            services = SERVICE_TEMPLATES[kind]
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

            if not skip_images and pools:
                pool = pools[kind]
                base_i = kind_idx[kind]
                kind_idx[kind] = base_i + 3
                cover_url = pool[base_i % len(pool)]
                gallery_urls = [pool[(base_i + 1) % len(pool)], pool[(base_i + 2) % len(pool)]]
                try:
                    if not salon.cover_image:
                        self._save_cover(salon, cover_url, slug)
                        images_set += 1
                    self._save_gallery(salon, gallery_urls, slug)
                except Exception as exc:
                    self.stdout.write(self.style.WARNING(f"  Rasm xato ({slug}): {exc}"))

            if not skip_reviews and customers:
                reviews_created += seed_reviews_for_salon(salon, barber, kind, customers, rng)

            if salon_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Tayyor: {created} yangi, {updated} yangilangan mock salon "
                f"(jami {len(TASHKENT_MOCK_SALONS)} ta).\n"
                f"  Cover rasmlar: {images_set} ta yangi.\n"
                f"  Soxta sharhlar: {reviews_created} ta yaratildi.\n"
                "  PEXELS_API_KEY — aniq kategoriya rasmlari uchun (ixtiyoriy).\n"
                "  Bron qilish: mijoz TOSHKENT_SH regionida login qilgan bo'lsin.\n"
                "  O'chirish: python manage.py seed_tashkent_mock_salons --purge"
            )
        )
