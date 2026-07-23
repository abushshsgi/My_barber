"""Irland personaj uslub rasmlarini lokal papkadan Postgres StoredMedia ga yuklash."""

from __future__ import annotations

import mimetypes
import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from ai.explore_personas import MEN_CATALOG_STYLE_SLUGS, normalize_persona_id
from ai.explore_published import (
    _load_manifest,
    _save_manifest,
    draft_asset_rel,
    live_asset_rel,
)
from ai.explore_views import explore_asset_storage_slug, normalize_explore_view
from media_store.models import StoredMedia
from media_store.utils import normalize_media_name

# Default: foydalanuvchi bergan papka
DEFAULT_SOURCE = Path("/home/abdu-dell/style for irland")

VIEW_DIR_ALIASES: dict[str, str] = {
    "old": "front",
    "old ": "front",
    "front": "front",
    "left": "left",
    "right": "right",
    "back": "back",
}

# irland-buzz-cut-1.webp → buzz-cut
_NAME_RE = re.compile(
    r"^irland-(?P<slug>[a-z0-9-]+?)(?:-(?P<dup>\d+))?(?:__(?P<view>left|right|back))?\.webp$",
    re.IGNORECASE,
)


def _parse_filename(name: str) -> tuple[str, str] | None:
    m = _NAME_RE.match(name.strip())
    if not m:
        return None
    slug = m.group("slug").lower()
    view = (m.group("view") or "front").lower()
    # Known slugs only (faol klassik katalog)
    if slug not in MEN_CATALOG_STYLE_SLUGS:
        # Try trimming accidental suffixes already handled
        return None
    return slug, normalize_explore_view(view)


def _store(rel: str, data: bytes) -> None:
    rel = normalize_media_name(rel)
    content_type = mimetypes.guess_type(rel)[0] or "image/webp"
    StoredMedia.objects.update_or_create(
        name=rel,
        defaults={
            "data": data,
            "content_type": content_type[:128],
            "size": len(data),
        },
    )


def _store_json(rel: str, data: dict) -> None:
    import json

    payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    StoredMedia.objects.update_or_create(
        name=normalize_media_name(rel),
        defaults={
            "data": payload,
            "content_type": "application/json",
            "size": len(payload),
        },
    )


class Command(BaseCommand):
    help = (
        "Irland uslub rasmlarini (front/left/right/back) Postgres StoredMedia ga yuklaydi "
        "va publish manifestini yangilaydi."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            type=str,
            default=str(DEFAULT_SOURCE),
            help="Lokal papka (default: /home/abdu-dell/style for irland)",
        )
        parser.add_argument(
            "--persona",
            type=str,
            default="irland",
            help="Persona id (default: irland)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Faqat ro'yxat — DB ga yozmaydi",
        )

    def handle(self, *args, **options):
        source = Path(options["source"])
        if not source.is_dir():
            raise CommandError(f"Papka topilmadi: {source}")

        persona = normalize_persona_id(options["persona"])
        if persona != "irland":
            raise CommandError("Hozircha faqat irland personaji qo'llab-quvvatlanadi.")

        dry = bool(options["dry_run"])
        imported = 0
        skipped = 0
        errors = 0
        storage_keys: set[str] = set()

        for path in sorted(source.rglob("*.webp")):
            if not path.is_file():
                continue
            # View papkadan (old/left/right/back)
            parent_key = path.parent.name
            dir_view = VIEW_DIR_ALIASES.get(parent_key) or VIEW_DIR_ALIASES.get(parent_key.strip())
            parsed = _parse_filename(path.name)
            if not parsed:
                self.stderr.write(f"skip name: {path}")
                skipped += 1
                continue
            slug, file_view = parsed
            view = dir_view or file_view
            # Papka view ustunlik qiladi
            if dir_view:
                view = dir_view

            try:
                data = path.read_bytes()
                if not data:
                    skipped += 1
                    continue
                live = live_asset_rel(persona_id=persona, slug=slug, view=view)
                draft = draft_asset_rel(persona_id=persona, slug=slug, view=view)
                storage = explore_asset_storage_slug(slug, view)
                if dry:
                    self.stdout.write(f"would import {slug}/{view} → {live} ({len(data)} B)")
                    imported += 1
                    storage_keys.add(storage)
                    continue
                _store(live, data)
                _store(draft, data)
                storage_keys.add(storage)
                imported += 1
                self.stdout.write(self.style.SUCCESS(f"ok {slug}/{view} ({len(data)} B)"))
            except Exception as exc:
                errors += 1
                self.stderr.write(f"fail {path}: {exc}")

        if not dry and storage_keys:
            from ai.explore_published import MANIFEST_NAME

            manifest = _load_manifest()
            existing = set(manifest.get(persona, []))
            existing |= storage_keys
            manifest[persona] = sorted(existing)
            _store_json(MANIFEST_NAME, manifest)
            # Disk mirror ham (local)
            try:
                _save_manifest(manifest)
            except Exception:
                pass
            self.stdout.write(self.style.SUCCESS(f"manifest updated: {len(storage_keys)} keys"))

        self.stdout.write(
            self.style.SUCCESS(
                f"done imported={imported} skipped={skipped} errors={errors} dry_run={dry}"
            )
        )
