"""Pending bronlarni sartarosh javobsiz qoldirsa avtomatik bekor qilish (cron)."""

from django.core.management.base import BaseCommand

from bookings.expiry import expire_stale_pending_bookings


class Command(BaseCommand):
    help = (
        "Sartarosh 5 daqiqa ichida qabul qilmagan pending bronlarni bekor qiladi. "
        "Har 1–2 daqiqada cron orqali ishga tushiring."
    )

    def handle(self, *args, **options):
        count = expire_stale_pending_bookings()
        self.stdout.write(self.style.SUCCESS(f"Auto-cancelled {count} pending booking(s)"))
