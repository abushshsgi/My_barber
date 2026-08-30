from django.core.management.base import BaseCommand

from ai.services.barcode_country import sync_gs1_country_codes


class Command(BaseCommand):
    help = "GS1 davlat kodlarini (114 ta) Gs1CountryCode jadvaliga yozadi."

    def handle(self, *args, **options):
        count = sync_gs1_country_codes()
        self.stdout.write(self.style.SUCCESS(f"{count} ta GS1 davlat kodi saqlandi."))
