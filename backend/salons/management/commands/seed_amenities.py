"""Amenity katalogini seed qilish va salonlarga biriktirish."""

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection, transaction

from salons.amenity_catalog import AMENITY_CATALOG
from salons.models import Amenity, Salon, SalonAmenity

DEFAULT_AMENITIES = AMENITY_CATALOG

# Har bir salon slug/id bo'yicha default amenity kodlari (kamida 5 ta)
DEFAULT_SALON_AMENITY_CODES = [
    "wifi",
    "card_payment",
    "online_booking",
    "waiting_area",
    "sanitized_tools",
    "air_conditioning",
    "coffee_tea",
]


class Command(BaseCommand):
    help = "Amenity katalogini yaratadi va published salonlarga default qulayliklar biriktiradi."

    def _amenity_tables_ready(self) -> bool:
        tables = set(connection.introspection.table_names())
        return "salons_amenity" in tables and "salons_salonamenity" in tables

    def _ensure_migrations(self):
        if self._amenity_tables_ready():
            return
        self.stdout.write("Amenity tables missing; running salons migrations...")
        call_command("migrate", "salons", interactive=False, verbosity=1)
        if not self._amenity_tables_ready():
            raise RuntimeError(
                "salons_amenity tables still missing after migrate. "
                "Check django_migrations and deploy logs."
            )

    def handle(self, *args, **options):
        self._ensure_migrations()
        with transaction.atomic():
            for code, icon, labels in DEFAULT_AMENITIES:
                Amenity.objects.update_or_create(
                    code=code,
                    defaults={"icon": icon, "labels": labels},
                )

            amenities = {a.code: a for a in Amenity.objects.all()}
            salons = Salon.objects.filter(is_published=True)
            linked = 0
            for salon in salons:
                for code in DEFAULT_SALON_AMENITY_CODES:
                    amenity = amenities.get(code)
                    if not amenity:
                        continue
                    _, created = SalonAmenity.objects.get_or_create(salon=salon, amenity=amenity)
                    if created:
                        linked += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Amenities: {Amenity.objects.count()} catalog, {linked} new salon links."
            )
        )
