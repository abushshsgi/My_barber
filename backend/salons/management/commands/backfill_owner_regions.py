"""Salon egasi barber.region bo'sh bo'lsa — GPS orqali to'ldirish."""

from django.core.management.base import BaseCommand

from salons.models import Salon
from salons.owner_setup import (
    sync_owner_profile_location_from_salon,
    sync_owner_region_from_salon,
)


class Command(BaseCommand):
    help = "owner_barber.region va profil joylashuvini salon GPS/manzilidan yangilash"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Faqat hisobot — DB ga yozmaydi",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Region allaqachon to'ldirilgan bo'lsa ham GPS dan qayta yozish",
        )
        parser.add_argument(
            "--sync-address",
            action="store_true",
            help="Barber profil location_text ni salon address bilan sinxronlash",
        )
        parser.add_argument(
            "--salon-id",
            type=int,
            default=None,
            help="Faqat bitta salon (masalan 357)",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        force = options["force"]
        sync_address = options["sync_address"]
        salon_id = options.get("salon_id")

        qs = Salon.objects.filter(is_published=True, owner_barber__isnull=False).select_related(
            "owner_barber"
        )
        if not force:
            qs = qs.filter(owner_barber__region="")
        if salon_id:
            qs = qs.filter(pk=salon_id)

        total = qs.count()
        filled = 0
        skipped = 0
        address_synced = 0

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
                if code or force:
                    filled += 1
                    self.stdout.write(
                        f"  [dry-run] salon={salon.id} region {before!r} -> {code!r} address={salon.address!r}"
                    )
                else:
                    skipped += 1
                continue

            if sync_owner_region_from_salon(owner, salon, force=force):
                filled += 1
            else:
                owner.refresh_from_db()
                after = (owner.region or "").strip()
                if after and (force or not before):
                    filled += 1
                else:
                    skipped += 1

            if sync_address and sync_owner_profile_location_from_salon(owner, salon):
                address_synced += 1

        mode = "dry-run" if dry_run else "applied"
        self.stdout.write(
            self.style.SUCCESS(
                f"backfill_owner_regions ({mode}): total={total} region_updated={filled} "
                f"skipped={skipped} profile_address_synced={address_synced}"
            )
        )
