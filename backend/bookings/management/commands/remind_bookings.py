"""Send 1-hour-before reminders for upcoming bookings (run via cron every 5–10 minutes)."""

from django.core.management.base import BaseCommand
from django.utils import timezone

from bookings.models import Booking
from notifications.utils import notify_user


class Command(BaseCommand):
    help = "Notify customers about bookings starting in ~1 hour"

    def handle(self, *args, **options):
        now = timezone.now()
        window_start = now + timezone.timedelta(minutes=55)
        window_end = now + timezone.timedelta(minutes=65)
        qs = Booking.objects.filter(
            status=Booking.Status.ACCEPTED,
            reminder_1h_sent=False,
            start_at__gte=window_start,
            start_at__lte=window_end,
        )
        count = 0
        for b in qs:
            notify_user(
                b.customer,
                "reminder_1h",
                "Bron eslatmasi",
                f"{b.salon.name}: {b.start_at.strftime('%H:%M')} da uchrashuv.",
                {"booking_id": b.id},
                send_email=True,
            )
            b.reminder_1h_sent = True
            b.save(update_fields=["reminder_1h_sent"])
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Sent {count} reminders"))
