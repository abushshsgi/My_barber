"""Salon egasi barber.region bo'sh bo'lsa — GPS orqali to'ldirish."""

from django.core.management.base import BaseCommand

from salons.models import Salon
from salons.owner_setup import sync_owner_region_from_salon


class Command(BaseCommand):
    help = "owner_barber.region bo'sh salonlar uchun viloyatni GPS dan aniqlash"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Faqat hisobot — DB ga yozmaydi",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        qs = (
            Salon.objects.filter(is_published=True, owner_barber__isnull=False)
            .select_related("owner_barber")
            .filter(owner_barber__region="")
        )
        total = qs.count()
        filled = 0
        skipped = 0

        for salon in qs.iterator():
            owner = salon.owner_barber
            if not owner:
                skipped += 1
                continue
            before = (owner.region or "").strip()
            if dry_run:
                from geo.region_resolver import resolve_region_from_coords

                try:
                    lat = float(salon.latitude)
                    lng = float(salon.longitude)
                    code = (resolve_region_from_coords(lat, lng).region_code or "").strip()
                except (TypeError, ValueError):
                    code = ""
                if code:
                    filled += 1
                    self.stdout.write(f"  [dry-run] salon={salon.id} -> {code}")
                else:
                    skipped += 1
                continue
            sync_owner_region_from_salon(owner, salon)
            owner.refresh_from_db()
            after = (owner.region or "").strip()
            if after and after != before:
                filled += 1
            else:
                skipped += 1

        mode = "dry-run" if dry_run else "applied"
        self.stdout.write(
            self.style.SUCCESS(
                f"backfill_owner_regions ({mode}): total={total} filled={filled} skipped={skipped}"
            )
        )
