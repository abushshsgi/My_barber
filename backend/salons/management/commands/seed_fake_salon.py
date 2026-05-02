"""Test uchun published salon (+ ixtiyoriy egasi-barber) yaratish yoki yangilash."""

from decimal import Decimal

from django.core.management.base import BaseCommand

from accounts.uz_regions import UzRegion
from barbers.models import Barber
from salons.models import Salon


class Command(BaseCommand):
    help = (
        "Join / qidiruv UI testi uchun published salon. "
        "GPS: salon nuqtasi bilan bir xil yoki unga 100 m ichidagi lat/lng ishlating."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--name",
            default="TEST Fake Salon",
            help="Salon nomi (qidiruvda shu bo‘lak bilan topiladi).",
        )
        parser.add_argument(
            "--lat",
            type=str,
            default="41.299500",
            help="Salon kengligi (masalan Toshkent markazi atrofida).",
        )
        parser.add_argument(
            "--lng",
            type=str,
            default="69.240100",
            help="Salon uzunligi.",
        )
        parser.add_argument(
            "--address",
            default="Test manzil (faqat UI)",
            help="Manzil matni.",
        )
        parser.add_argument(
            "--region",
            default=UzRegion.TOSHKENT_SH,
            choices=[c[0] for c in UzRegion.choices],
            help="Egasi-barber viloyati (qidiruvda region filtri bilan moslash uchun).",
        )
        parser.add_argument(
            "--no-owner",
            action="store_true",
            help="owner_barber bo‘lmasin (faqat anonim qidiruv, region parametrisiz).",
        )

    def handle(self, *args, **options):
        name = (options["name"] or "").strip()
        if not name:
            self.stderr.write(self.style.ERROR("name bo‘sh bo‘lmasligi kerak."))
            return

        lat = Decimal(str(options["lat"]))
        lng = Decimal(str(options["lng"]))
        address = (options["address"] or "").strip()

        owner_barber = None
        if not options["no_owner"]:
            email = "fake-salon-owner@mybarber.test"
            username = "fake_salon_owner_mybarber_test"
            owner_barber, created = Barber.objects.get_or_create(
                email=email,
                defaults={
                    "username": username,
                    "full_name": "Fake salon egasi (test)",
                    "region": options["region"],
                },
            )
            if created:
                owner_barber.set_password("test-fake-salon-owner-9")
                owner_barber.save()
            else:
                owner_barber.region = options["region"]
                owner_barber.save(update_fields=["region"])

        salon, created = Salon.objects.update_or_create(
            name=name,
            defaults={
                "latitude": lat,
                "longitude": lng,
                "address": address,
                "description": "seed_fake_salon orqali test uchun.",
                "is_published": True,
                "owner_barber": owner_barber,
            },
        )
        action = "Yaratildi" if created else "Yangilandi"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action}: id={salon.id} name={salon.name!r}\n"
                f"  lat={salon.latitude} lng={salon.longitude}\n"
                "  Join testi: brauzer / qurilmada GPS nuqtasi shu koordinataga "
                "100 m ichida bo‘lsin (yoki devtools / mock)."
            )
        )
        if owner_barber:
            self.stdout.write(f"  owner_barber_id={owner_barber.id} region={owner_barber.region}")
