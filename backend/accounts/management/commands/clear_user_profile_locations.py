"""Mijoz profillaridagi GPS/region ni tozalash (bron joylashuv sahifasi o‘chiq payt)."""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db.models import Q

from accounts.models import User


class Command(BaseCommand):
    help = "USER rolli mijozlardan latitude, longitude va region ni olib tashlaydi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Faqat sonlar — hech narsa o‘zgarmaydi.",
        )

    def handle(self, *args, **options):
        qs = User.objects.filter(role=User.Role.USER).filter(
            Q(latitude__isnull=False) | Q(longitude__isnull=False) | ~Q(region="")
        )
        count = qs.count()
        if options["dry_run"]:
            self.stdout.write(f"dry-run: {count} user location tozalanadi")
            return
        updated = qs.update(latitude=None, longitude=None, region="")
        self.stdout.write(self.style.SUCCESS(f"tozalandi: {updated}"))
