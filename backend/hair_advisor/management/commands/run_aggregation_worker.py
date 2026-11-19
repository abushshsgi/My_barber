import time

from django.core.management.base import BaseCommand

from hair_advisor.tasks import process_pending_aggregation_jobs


class Command(BaseCommand):
    help = "Poll ProductAggregationJob queue (systemd worker)."

    def add_arguments(self, parser):
        parser.add_argument("--poll-seconds", type=int, default=10)
        parser.add_argument("--limit", type=int, default=25)

    def handle(self, *args, **options):
        poll = max(3, int(options["poll_seconds"]))
        limit = max(1, int(options["limit"]))
        self.stdout.write(self.style.SUCCESS(f"Aggregation worker started (poll={poll}s)"))
        while True:
            n = process_pending_aggregation_jobs(limit=limit)
            if n:
                self.stdout.write(f"Processed {n} job(s)")
            time.sleep(poll)