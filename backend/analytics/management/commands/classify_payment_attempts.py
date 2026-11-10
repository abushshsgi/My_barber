from django.core.management.base import BaseCommand

from analytics.outcomes import classify_abandoned
from subscriptions.models import SubscriptionPayment


class Command(BaseCommand):
    help = "Provider javobi kelmagan urinishlarni tashlab ketilgan deb belgilaydi. Status o'zgarmaydi."

    def handle(self, *args, **options):
        marked = 0
        qs = SubscriptionPayment.objects.filter(status=SubscriptionPayment.Status.PENDING, abandoned_at__isnull=True)
        for payment in qs.iterator():
            if classify_abandoned(payment):
                marked += 1
        self.stdout.write(f"{marked} urinish tashlab ketilgan deb belgilandi")
