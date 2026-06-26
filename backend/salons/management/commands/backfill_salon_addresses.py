"""Salon manzilini owner profilidagi location_text dan tiklash (noto'g'ri DB manzillar uchun)."""

from django.core.management.base import BaseCommand

from salons.models import Salon
from salons.owner_setup import sync_owner_profile_location_from_salon, sync_owner_region_from_salon


class Command(BaseCommand):
    help = "Salon address/lat/lng ni owner BarberProfile.location_text dan yangilash"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--salon-id", type=int, default=None)
        parser.add_argument(
            "--from-profile",
            action="store_true",
            help="Profil -> salon (default). Aksincha: salon -> profil",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        salon_id = options.get("salon_id")
        from_profile = options["from_profile"]

        qs = Salon.objects.filter(owner_barber__isnull=False).select_related(
            "owner_barber", "owner_barber__profile"
        )
        if salon_id:
            qs = qs.filter(pk=salon_id)

        updated = 0
        for salon in qs.iterator():
            owner = salon.owner_barber
            if not owner:
                continue
            prof = getattr(owner, "profile", None)
            if from_profile:
                loc = (getattr(prof, "location_text", None) or "").strip()
                if len(loc) < 5:
                    continue
                lat = getattr(prof, "latitude", None)
                lng = getattr(prof, "longitude", None)
                if dry_run:
                    self.stdout.write(
                        f"  [dry-run] salon={salon.id}: {salon.address!r} -> {loc!r}"
                    )
                    updated += 1
                    continue
                salon.address = loc
                fields = ["address"]
                if lat is not None:
                    salon.latitude = lat
                    fields.append("latitude")
                if lng is not None:
                    salon.longitude = lng
                    fields.append("longitude")
                salon.save(update_fields=fields)
                sync_owner_region_from_salon(owner, salon, force=True)
                updated += 1
            else:
                if dry_run:
                    self.stdout.write(f"  [dry-run] salon={salon.id} profile sync")
                    updated += 1
                    continue
                if sync_owner_profile_location_from_salon(owner, salon):
                    updated += 1

        mode = "dry-run" if dry_run else "applied"
        self.stdout.write(self.style.SUCCESS(f"backfill_salon_addresses ({mode}): updated={updated}"))
