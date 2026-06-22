"""Toshkent bo'ylab 250 ta mock salon + ixtiyoriy Pexels fayl yuklash."""

from __future__ import annotations

import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import time
from decimal import Decimal

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.uz_regions import UzRegion
from barbers.models import Barber, BarberProfile
from salons.mock.cover_urls import mock_cover_cdn_url, mock_gallery_urls
from salons.mock.mock_reviews import _ensure_mock_customers, purge_mock_review_users, seed_reviews_for_salon
from salons.mock.pexels import download_image, fetch_kind_pool
from salons.mock.tashkent_salons import MOCK_MARKER, MOCK_SALON_COUNT, SERVICE_TEMPLATES, TASHKENT_MOCK_SALONS
from salons.models import BarberWorkingHours, Salon, SalonHours, SalonImage, SalonMembership, Service

_UPLOAD_WORKERS = 12
_COVER_WIDTH = 640


class Command(BaseCommand):
    help = (
        f"Toshkent bo'ylab {MOCK_SALON_COUNT} ta mock salon. "
        "Rasmlar API orqali Pexels CDN (tez deploy). "
        "Fayl yuklash uchun --upload-images (sekin)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--purge", action="store_true", help="Mock salonlarni o'chirish.")
        parser.add_argument(
            "--upload-images",
            action="store_true",
            help="Cover fayllarini storage ga yuklash (sekin; odatda shart emas).",
        )
        parser.add_argument(
            "--with-gallery",
            action="store_true",
            help="--upload-images bilan: gallery rasmlarini ham yuklash.",
        )
        parser.add_argument(
            "--pexels-api",
            action="store_true",
            help="--upload-images bilan: Pexels API qidiruv.",
        )
        parser.add_argument("--skip-reviews", action="store_true", help="Sharhlarni o'tkazib yuborish.")

    def handle(self, *args, **options):
        if options["purge"]:
            self._purge()
            return
        salon_ids = self._seed_core(skip_reviews=options["skip_reviews"])
        if options["upload_images"] and salon_ids:
            self._upload_images(
                salon_ids,
                with_gallery=options["with_gallery"],
                use_pexels_api=options["pexels_api"],
            )

    @transaction.atomic
    def _purge(self):
        mock_salons = Salon.objects.filter(description__startswith=MOCK_MARKER)
        count = mock_salons.count()
        mock_salons.delete()
        deleted_barbers = Barber.objects.filter(
            email__startswith="mock-tashkent-",
            email__endswith="@mybarber.test",
        ).delete()[0]
        deleted_review_users = purge_mock_review_users()
        self.stdout.write(
            self.style.SUCCESS(
                f"O'chirildi: {count} mock salon, {deleted_barbers} barber, {deleted_review_users} mijoz."
            )
        )

    @transaction.atomic
    def _seed_core(self, *, skip_reviews: bool) -> list[tuple[int, str, str]]:
        """Salon/barber/xizmatlar — rasmsiz, tez."""
        now = timezone.now()
        created = 0
        updated = 0
        reviews_created = 0
        customers = _ensure_mock_customers(30) if not skip_reviews else []
        rng = random.Random(42)
        pending_images: list[tuple[int, str, str]] = []

        for entry in TASHKENT_MOCK_SALONS:
            slug = entry["slug"]
            kind = entry["kind"]
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
                    defaults={"open_time": time(9, 0), "close_time": time(20, 0)},
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

            for svc_name, price, duration in SERVICE_TEMPLATES[kind]:
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

            if not skip_reviews and customers:
                reviews_created += seed_reviews_for_salon(salon, barber, kind, customers, rng)

            pending_images.append((salon.pk, slug, kind))
            if salon_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Tayyor: {created} yangi, {updated} yangilangan (jami {len(TASHKENT_MOCK_SALONS)}).\n"
                f"  Sharhlar: {reviews_created} ta.\n"
                "  Rasmlar: API Pexels CDN (cover_image URL) — fayl yuklash shart emas.\n"
                "  O'chirish: python manage.py seed_tashkent_mock_salons --purge"
            )
        )
        return pending_images

    def _upload_images(
        self,
        pending: list[tuple[int, str, str]],
        *,
        with_gallery: bool,
        use_pexels_api: bool,
    ) -> None:
        """Ixtiyoriy: cover (+ gallery) fayllarini parallel yuklash."""
        self.stdout.write("Cover rasmlar yuklanmoqda (parallel)…")
        cache: dict[str, bytes] = {}
        kind_idx: dict[str, int] = {"barber": 0, "beauty": 0, "nails": 0, "spa": 0}
        pools: dict[str, list[str]] = {}

        if use_pexels_api:
            kind_counts: dict[str, int] = {}
            for _, _, kind in pending:
                kind_counts[kind] = kind_counts.get(kind, 0) + 1
            per = 3 if with_gallery else 1
            for kind, count in kind_counts.items():
                pools[kind] = fetch_kind_pool(kind, count * per + 5)

        def cover_url_for(slug: str, kind: str) -> str:
            if use_pexels_api and pools.get(kind):
                i = kind_idx[kind]
                kind_idx[kind] = i + 1
                return pools[kind][i % len(pools[kind])]
            return mock_cover_cdn_url(slug, width=_COVER_WIDTH)

        def fetch_bytes(url: str) -> bytes:
            if url in cache:
                return cache[url]
            data = download_image(url)
            cache[url] = data
            return data

        def upload_one(item: tuple[int, str, str]) -> str | None:
            salon_id, slug, kind = item
            salon = Salon.objects.filter(pk=salon_id).first()
            if not salon or salon.cover_image:
                return None
            try:
                data = fetch_bytes(cover_url_for(slug, kind))
                salon.cover_image.save(f"{slug}-cover.jpg", ContentFile(data), save=True)
                if with_gallery and not salon.images.exists():
                    for i, gurl in enumerate(mock_gallery_urls(slug)):
                        gdata = fetch_bytes(gurl)
                        img = SalonImage(salon=salon, sort_order=i)
                        img.image.save(f"{slug}-g{i}.jpg", ContentFile(gdata), save=False)
                        img.save()
                return slug
            except Exception as exc:
                return f"ERR:{slug}:{exc}"

        uploaded = 0
        with ThreadPoolExecutor(max_workers=_UPLOAD_WORKERS) as pool:
            futures = [pool.submit(upload_one, item) for item in pending if item]
            for fut in as_completed(futures):
                result = fut.result()
                if result and not str(result).startswith("ERR:"):
                    uploaded += 1
                elif result and str(result).startswith("ERR:"):
                    self.stdout.write(self.style.WARNING(f"  {result}"))

        self.stdout.write(self.style.SUCCESS(f"  Yuklandi: {uploaded} ta cover."))
