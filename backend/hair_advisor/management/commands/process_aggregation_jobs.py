from django.core.management.base import BaseCommand

from hair_advisor.tasks import process_pending_aggregation_jobs


class Command(BaseCommand):
    help = "Process pending ProductAggregationJob rows (cron / deploy hook)."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=50)

    def handle(self, *args, **options):
        n = process_pending_aggregation_jobs(limit=options["limit"])
        self.stdout.write(self.style.SUCCESS(f"Processed {n} aggregation job(s)."))