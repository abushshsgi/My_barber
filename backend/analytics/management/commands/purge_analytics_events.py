from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from analytics.models import AnalyticsEvent
from control_panel.models import SiteVisitEvent


class Command(BaseCommand):
    help = "Eski xom voqealarni o'chiradi. Snapshot va to'lov qatorlari qoladi."

    def add_arguments(self, parser):
        parser.add_argument("--older-than-days", type=int, default=None)

    def handle(self, *args, **options):
        days = options["older_than_days"] or int(getattr(settings, "ANALYTICS_EVENT_RETENTION_DAYS", 180))
        cutoff = timezone.now() - timedelta(days=max(1, days))
        events, _ = AnalyticsEvent.objects.filter(occurred_at__lt=cutoff).delete()
        visits, _ = SiteVisitEvent.objects.filter(created_at__lt=cutoff).delete()
        self.stdout.write(f"o'chirildi: analytics={events}, visits={visits}")
