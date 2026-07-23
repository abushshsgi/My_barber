"""Diskdagi media fayllarni Postgres StoredMedia ga ko‘chirish."""

from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from media_store.utils import normalize_media_name


class Command(BaseCommand):
    help = "MEDIA_ROOT dagi fayllarni StoredMedia (Postgres) ga import qiladi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Faqat hisoblaydi, yozmaydi.",
        )

    def handle(self, *args, **options):
        dry = bool(options.get("dry_run"))
        root = Path(settings.MEDIA_ROOT)
        if not root.is_dir():
            self.stdout.write(self.style.WARNING(f"MEDIA_ROOT yo‘q: {root}"))
            return

        imported = 0
        skipped = 0
        errors = 0

        for path in root.rglob("*"):
            if not path.is_file():
                continue
            try:
                rel = normalize_media_name(str(path.relative_to(root)))
            except ValueError:
                continue
            if not rel or rel.startswith("."):
                continue

            if dry:
                self.stdout.write(f"would import: {rel}")
                imported += 1
                continue

            try:
                # force path even if USE_DB_MEDIA false — command always writes DB
                from media_store.models import StoredMedia
                import mimetypes

                if StoredMedia.objects.filter(name=rel).exists():
                    skipped += 1
                    continue
                data = path.read_bytes()
                content_type = mimetypes.guess_type(rel)[0] or "application/octet-stream"
                StoredMedia.objects.update_or_create(
                    name=rel,
                    defaults={
                        "data": data,
                        "content_type": content_type[:128],
                        "size": len(data),
                    },
                )
                imported += 1
            except Exception as exc:
                errors += 1
                self.stderr.write(f"fail {rel}: {exc}")

        self.stdout.write(
            self.style.SUCCESS(
                f"done imported={imported} skipped={skipped} errors={errors} dry_run={dry}"
            )
        )
