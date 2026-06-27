"""Eski mock ma'lumotlar va salon xizmati qoldiqlarini tozalash."""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F

from barbers.models import Barber
from salons.mock.mock_reviews import purge_mock_review_users
from salons.mock.tashkent_salons import MOCK_MARKER
from salons.models import Salon, Service


class Command(BaseCommand):
    help = (
        "Mock/test salonlar, eski owner-sync xizmat qoldiqlari va dublikatlarni o'chiradi. "
        "Salon katalogi (barber=null) saqlanadi."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Faqat hisobot — DB ga yozmaydi.",
        )
        parser.add_argument(
            "--skip-mock",
            action="store_true",
            help="Mock salonlarni o'chirmaslik.",
        )
        parser.add_argument(
            "--skip-services",
            action="store_true",
            help="Xizmat qoldiqlarini tozalamaslik.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — hech narsa o'chirilmaydi."))

        total_deleted = 0

        if not options["skip_mock"]:
            total_deleted += self._purge_mock(dry_run)

        if not options["skip_services"]:
            converted, deleted = self._cleanup_owner_service_leftovers(dry_run)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Owner xizmat qoldiqlari: {converted} ta katalogga aylantirildi, "
                    f"{deleted} ta dublikat o'chirildi."
                )
            )
            total_deleted += deleted

        mode = "dry-run" if dry_run else "yakunlandi"
        self.stdout.write(self.style.SUCCESS(f"Tozalash {mode}. Jami o'chirilgan yozuvlar: {total_deleted}"))

    @transaction.atomic
    def _purge_mock(self, dry_run: bool) -> int:
        mock_salons = Salon.objects.filter(description__startswith=MOCK_MARKER)
        fake_salons = Salon.objects.filter(description="seed_fake_salon orqali test uchun.")
        mock_count = mock_salons.count()
        fake_count = fake_salons.count()

        mock_barbers = Barber.objects.filter(
            email__startswith="mock-tashkent-",
            email__endswith="@mybarber.test",
        ).count()

        if dry_run:
            self.stdout.write(
                f"  [dry-run] mock salon: {mock_count}, fake salon: {fake_count}, "
                f"mock barber: {mock_barbers}, mock mijozlar: purge_mock_review_users()"
            )
            return mock_count + fake_count + mock_barbers

        deleted = 0
        deleted += mock_salons.delete()[0]
        deleted += fake_salons.delete()[0]
        deleted += Barber.objects.filter(
            email__startswith="mock-tashkent-",
            email__endswith="@mybarber.test",
        ).delete()[0]
        deleted += purge_mock_review_users()
        deleted += Barber.objects.filter(email="fake-salon-owner@mybarber.test").delete()[0]

        self.stdout.write(
            self.style.SUCCESS(f"Mock ma'lumotlar o'chirildi (jami {deleted} bog'liq yozuv).")
        )
        return deleted

    def _cleanup_owner_service_leftovers(self, dry_run: bool) -> tuple[int, int]:
        """barber=owner qoldiqlarini katalogga aylantirish yoki dublikatni o'chirish."""
        stale = Service.objects.filter(
            barber_id=F("salon__owner_barber_id"),
            salon__owner_barber_id__isnull=False,
        ).select_related("salon")

        converted = 0
        deleted = 0

        for svc in stale.iterator():
            dup_q = Service.objects.filter(salon_id=svc.salon_id, barber__isnull=True).exclude(pk=svc.pk)
            if svc.catalog_service_id:
                dup_q = dup_q.filter(catalog_service_id=svc.catalog_service_id)
            else:
                dup_q = dup_q.filter(name=svc.name, catalog_service__isnull=True)

            if dup_q.exists():
                if dry_run:
                    self.stdout.write(
                        f"  [dry-run] delete duplicate service id={svc.id} "
                        f"salon={svc.salon_id} barber=owner"
                    )
                else:
                    svc.delete()
                deleted += 1
            else:
                if dry_run:
                    self.stdout.write(
                        f"  [dry-run] convert service id={svc.id} salon={svc.salon_id} → barber=null"
                    )
                else:
                    Service.objects.filter(pk=svc.pk).update(barber=None)
                converted += 1

        # Egasi uchun eski sync: barber=owner bo'lgan noaktiv dublikatlar (katalog mavjud)
        orphan_dupes = Service.objects.filter(
            barber_id=F("salon__owner_barber_id"),
            is_active=False,
        )
        if not dry_run:
            deleted += orphan_dupes.delete()[0]
        else:
            deleted += orphan_dupes.count()

        return converted, deleted
