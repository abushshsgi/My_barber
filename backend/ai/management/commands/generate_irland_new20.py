"""Irland uchun yangi 20 uslub rasmlarini explore-gen orqali yaratish + publish."""

from __future__ import annotations

import time

from django.core.management.base import BaseCommand, CommandError

from ai.explore_published import publish_explore_asset
from ai.explore_views import EXPLORE_VIEW_IDS
from ai.hairstyle_seed_new20 import NEW_MEN_STYLE_SLUGS
from ai.services.explore_image_gen import explore_gen_configured, generate_explore_asset
from ai.services.gemini_style import AiStyleError


class Command(BaseCommand):
    help = "Yangi 20 uslubni Irland personaji uchun generatsiya + publish (front → sides)."

    def add_arguments(self, parser):
        parser.add_argument("--persona", default="irland")
        parser.add_argument(
            "--slugs",
            nargs="*",
            default=list(NEW_MEN_STYLE_SLUGS),
            help="Faqat shu sluglar (default: barcha yangi 20)",
        )
        parser.add_argument(
            "--views",
            nargs="*",
            default=list(EXPLORE_VIEW_IDS),
            help="front left right back",
        )
        parser.add_argument("--force", action="store_true")
        parser.add_argument("--skip-publish", action="store_true")
        parser.add_argument(
            "--front-only",
            action="store_true",
            help="Faqat old (front) ko'rinish",
        )
        parser.add_argument(
            "--sleep",
            type=float,
            default=8.0,
            help="Har bir so'rovdan keyin kutish (soniya) — 429 dan qochish",
        )

    def handle(self, *args, **options):
        cfg = explore_gen_configured()
        if not cfg.get("vertex") and not cfg.get("studio_image") and not cfg.get("gemini_api_key"):
            raise CommandError(f"Image gen sozlanmagan: {cfg}")

        persona = options["persona"]
        slugs = options["slugs"] or list(NEW_MEN_STYLE_SLUGS)
        views = ["front"] if options["front_only"] else list(options["views"] or EXPLORE_VIEW_IDS)
        if "front" in views:
            views = ["front", *[v for v in views if v != "front"]]

        force = bool(options["force"])
        skip_publish = bool(options["skip_publish"])
        pause = max(0.0, float(options["sleep"] or 0))

        self.stdout.write(
            self.style.NOTICE(
                f"persona={persona} slugs={len(slugs)} views={views} force={force} sleep={pause}"
            )
        )
        self.stdout.flush()

        ok = 0
        skipped = 0
        failed = 0

        for slug in slugs:
            for view in views:
                label = f"{persona}/{slug}/{view}"
                try:
                    result = generate_explore_asset(
                        persona_id=persona,
                        slug=slug,
                        force=force,
                        view=view,
                    )
                except AiStyleError as exc:
                    self.stderr.write(self.style.ERROR(f"  FAIL {label}: {exc.message}"))
                    self.stderr.flush()
                    failed += 1
                    if pause:
                        time.sleep(pause)
                    continue
                except Exception as exc:
                    self.stderr.write(self.style.ERROR(f"  FAIL {label}: {exc}"))
                    self.stderr.flush()
                    failed += 1
                    if pause:
                        time.sleep(pause)
                    continue

                status = result.get("status")
                if status == "skipped":
                    self.stdout.write(f"  skip {label}")
                    skipped += 1
                else:
                    ms = result.get("elapsed_ms")
                    self.stdout.write(self.style.SUCCESS(f"  OK {label} ({ms}ms)"))
                    ok += 1
                self.stdout.flush()

                if not skip_publish:
                    try:
                        publish_explore_asset(persona_id=persona, slug=slug, view=view)
                        self.stdout.write(f"    published {label}")
                        self.stdout.flush()
                    except AiStyleError as exc:
                        self.stderr.write(
                            self.style.WARNING(f"    publish skip {label}: {exc.message}")
                        )
                        self.stderr.flush()

                if pause:
                    time.sleep(pause)

        self.stdout.write(
            self.style.NOTICE(f"Done: created={ok} skipped={skipped} failed={failed}")
        )
        self.stdout.flush()
        if failed:
            raise CommandError(f"{failed} ta generatsiya xato bilan tugadi.")
