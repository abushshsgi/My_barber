"""Ertaga yomg'ir/quruq kun uchun ertalab push (cron ~07:00 Asia/Tashkent)."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from ai.services.weather_care import build_weather_care_payload, resolve_region_coords
from notifications.models import UserPushToken
from notifications.utils import notify_user

User = get_user_model()


class Command(BaseCommand):
    help = "Send morning weather care alerts (rain/dry tomorrow)"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--limit", type=int, default=500)

    def handle(self, *args, **options):
        dry = bool(options["dry_run"])
        limit = max(1, int(options["limit"]))

        user_ids = list(
            UserPushToken.objects.filter(user_id__isnull=False)
            .values_list("user_id", flat=True)
            .distinct()[:limit]
        )
        sent = 0
        skipped = 0

        for uid in user_ids:
            user = User.objects.filter(id=uid).first()
            if not user:
                continue
            lat = getattr(user, "latitude", None)
            lon = getattr(user, "longitude", None)
            try:
                lat_f = float(lat) if lat not in (None, "") else None
                lon_f = float(lon) if lon not in (None, "") else None
            except (TypeError, ValueError):
                lat_f, lon_f = None, None

            # Prefer Tashkent if no coords
            region_id = None
            if lat_f is None or lon_f is None:
                region_id = "tashkent"
                resolved = resolve_region_coords(region_id)
                if resolved:
                    lat_f, lon_f, _ = resolved

            try:
                payload = build_weather_care_payload(
                    lat=lat_f,
                    lon=lon_f,
                    region_id=region_id,
                )
            except Exception as exc:
                self.stderr.write(f"user={uid} weather fail: {exc}")
                skipped += 1
                continue

            alert = payload.get("tomorrow_alert")
            if not alert:
                skipped += 1
                continue

            if dry:
                self.stdout.write(f"[dry-run] user={uid} {alert.get('title')}")
                sent += 1
                continue

            notify_user(
                user,
                "weather_morning",
                str(alert.get("title") or "Ob-havo eslatmasi"),
                str(alert.get("body") or ""),
                {
                    "kind": alert.get("kind"),
                    "screen": "CareWeather",
                },
            )
            sent += 1

        self.stdout.write(self.style.SUCCESS(f"weather morning alerts: sent={sent} skipped={skipped}"))
