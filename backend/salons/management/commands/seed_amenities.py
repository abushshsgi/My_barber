"""Amenity katalogini seed qilish va salonlarga biriktirish."""

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection, transaction

from salons.models import Amenity, Salon, SalonAmenity

DEFAULT_AMENITIES = [
    ("wifi", "wifi", {"uz": "Wi‑Fi", "ru": "Wi‑Fi", "en": "Wi‑Fi"}),
    ("parking", "car", {"uz": "Avtoturargoh", "ru": "Парковка", "en": "Parking"}),
    ("card_payment", "credit-card", {"uz": "Karta orqali to'lov", "ru": "Оплата картой", "en": "Card payment"}),
    ("air_conditioning", "air-vent", {"uz": "Konditsioner", "ru": "Кондиционер", "en": "Air conditioning"}),
    ("waiting_area", "sofa", {"uz": "Kutish zonasi", "ru": "Зона ожидания", "en": "Waiting area"}),
    ("coffee_tea", "coffee", {"uz": "Choy va kofe", "ru": "Чай и кофе", "en": "Coffee & tea"}),
    ("online_booking", "calendar-check", {"uz": "Onlayn bron", "ru": "Онлайн-запись", "en": "Online booking"}),
    ("sanitized_tools", "sparkles", {"uz": "Dezinfeksiya", "ru": "Стерильность", "en": "Sanitized tools"}),
    ("premium_products", "gem", {"uz": "Premium mahsulotlar", "ru": "Премиум средства", "en": "Premium products"}),
    ("kids_friendly", "baby", {"uz": "Bolalar uchun", "ru": "Для детей", "en": "Kids friendly"}),
    ("wheelchair", "accessibility", {"uz": "Imkoniyati cheklanganlar", "ru": "Доступная среда", "en": "Accessible"}),
    ("tv", "tv", {"uz": "Televizor", "ru": "ТВ", "en": "TV"}),
    ("music", "music", {"uz": "Musiqa", "ru": "Музыка", "en": "Music"}),
    ("private_room", "door-closed", {"uz": "Alohida xona", "ru": "Отдельная комната", "en": "Private room"}),
    ("loyalty_program", "gift", {"uz": "Bonus dasturi", "ru": "Бонусная программа", "en": "Loyalty program"}),
]

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
