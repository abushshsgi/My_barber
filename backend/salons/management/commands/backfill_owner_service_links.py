"""Mavjud salon Service (barber=null) qatorlarini owner_barber ga bog‘lash."""

from django.core.management.base import BaseCommand

from barbers.salon_service_sync import sync_all_barber_services_for_barber
from salons.models import Salon, Service


class Command(BaseCommand):
    help = "Salon xizmatlarini owner_barber ga bog‘lash va BarberService sinxronlash"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Faqat hisobot — DB ga yozmaydi",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        qs = (
            Salon.objects.filter(owner_barber__isnull=False)
            .select_related("owner_barber")
            .order_by("id")
        )
        linked = 0
        synced = 0
        skipped = 0

        for salon in qs.iterator():
            owner = salon.owner_barber
            if not owner:
                skipped += 1
                continue
            null_svc = Service.objects.filter(salon=salon, barber__isnull=True, is_active=True).count()
            if null_svc:
                if dry_run:
                    self.stdout.write(
                        f"  [dry-run] salon={salon.id} owner={owner.id} services_to_link={null_svc}"
                    )
                else:
                    Service.objects.filter(salon=salon, barber__isnull=True).update(barber=owner)
                linked += null_svc
            if dry_run:
                continue
            synced += sync_all_barber_services_for_barber(owner)

        mode = "dry-run" if dry_run else "applied"
        self.stdout.write(
            self.style.SUCCESS(
                f"backfill_owner_service_links ({mode}): salons={qs.count()} "
                f"linked_services={linked} barber_syncs={synced} skipped={skipped}"
            )
        )
