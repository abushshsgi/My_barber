"""DEPRECATED: endi cleanup_stale_data ishlating.

Avvalgi versiya barber=null xizmatlarni owner ga bog'lab, yangi katalog modelini buzardi.
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "DEPRECATED — o'rniga: python manage.py cleanup_stale_data"

    def handle(self, *args, **options):
        self.stderr.write(
            self.style.ERROR(
                "Bu buyruq eskirgan. Ishlating: python manage.py cleanup_stale_data"
            )
        )
