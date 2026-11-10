from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from analytics.snapshots import write_snapshot


class Command(BaseCommand):
    help = "Yopilgan kunlar uchun analitika snapshotini qayta hisoblaydi."

    def add_arguments(self, parser):
        parser.add_argument("--date", help="YYYY-MM-DD")
        parser.add_argument("--backfill-from", help="YYYY-MM-DD")

    def handle(self, *args, **options):
        today = timezone.localdate()
        if options["date"]:
            day = datetime.strptime(options["date"], "%Y-%m-%d").date()
            row = write_snapshot(day)
            self.stdout.write(f"{day.isoformat()} {'yozildi' if row else 'bugun tashlab ketildi'}")
            return
        start = datetime.strptime(options["backfill_from"], "%Y-%m-%d").date() if options["backfill_from"] else today - timedelta(days=30)
        day = start
        written = 0
        while day < today:
            if write_snapshot(day):
                written += 1
            day += timedelta(days=1)
        self.stdout.write(f"{written} kun yangilandi")
