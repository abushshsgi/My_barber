from django.core.management.base import BaseCommand

from geo.currency import RATES_MAX_AGE, sync_exchange_rates


class Command(BaseCommand):
    help = "Valyuta kurslarini open.er-api.com dan yangilash (kunlik cron)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Oxirgi yangilanish vaqtidan qat'i nazar majburan yangilash.",
        )
        parser.add_argument(
            "--if-stale",
            action="store_true",
            help=f"Faqat {RATES_MAX_AGE} dan eski bo'lsa yangilash.",
        )

    def handle(self, *args, **options):
        force = bool(options["force"])
        if_stale = bool(options["if_stale"])
        if if_stale and not force:
            from geo.models import ExchangeRateSnapshot
            from django.utils import timezone

            latest = ExchangeRateSnapshot.objects.order_by("-fetched_at").first()
            if latest and timezone.now() - latest.fetched_at < RATES_MAX_AGE:
                self.stdout.write(self.style.SUCCESS(f"Kurslar yangi: {latest.fetched_at.isoformat()}"))
                return

        snap = sync_exchange_rates(force=force or if_stale)
        self.stdout.write(
            self.style.SUCCESS(
                f"Kurslar yangilandi ({snap.source}) — {snap.fetched_at.isoformat()}"
            )
        )
