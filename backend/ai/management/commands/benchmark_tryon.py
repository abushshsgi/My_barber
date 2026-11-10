"""Offline Try-On benchmark helper — no paid Runware calls by default."""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from ai.services.tryon_prompts import build_tryon_prompt, resolve_tryon_prompt_version
from ai.services.tryon_style_lock import resolve_style_lock
from ai.style_prompts import style_detail_for


DEFAULT_MATRIX = [
    ("men", "buzz-cut", "Buzz Cut"),
    ("men", "crew-cut", "Crew Cut"),
    ("men", "textured-crop", "Textured Crop"),
    ("men", "curly-fringe", "Curly Fringe"),
    ("men", "curly-slick-back", "Curly Slick Back"),
    ("men", "pompadour", "Pompadour"),
    ("men", "mid-fade", "Mid Fade"),
]


class Command(BaseCommand):
    help = (
        "Compare legacy vs v2 Try-On prompts and style locks. "
        "Live generation requires --execute and --approve-spend."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--matrix",
            default="",
            help="Optional JSON file: [{\"audience\",\"slug\",\"title\"}, ...]",
        )
        parser.add_argument("--output", default="", help="Write JSON report to this path")
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Call Runware (costs money). Implies you have RUNWARE_API_KEY set.",
        )
        parser.add_argument(
            "--approve-spend",
            action="store_true",
            help="Required with --execute to confirm paid benchmark runs.",
        )

    def handle(self, *args, **options):
        matrix = DEFAULT_MATRIX
        if options["matrix"]:
            matrix = json.loads(Path(options["matrix"]).read_text(encoding="utf-8"))

        if options["execute"] and not options["approve_spend"]:
            self.stderr.write(
                "Refusing paid benchmark: pass both --execute and --approve-spend "
                "(set a budget and authorized photos first)."
            )
            return

        rows: list[dict] = []
        for audience, slug, title in matrix:
            detail = style_detail_for(audience, slug)
            legacy = build_tryon_prompt(
                title=title,
                style_detail=detail,
                audience=audience,
                slug=slug,
                prompt_version="legacy",
            )
            v2 = build_tryon_prompt(
                title=title,
                style_detail=detail,
                audience=audience,
                slug=slug,
                prompt_version="v2",
            )
            lock = resolve_style_lock(audience=audience, slug=slug, title=title)
            rows.append(
                {
                    "audience": audience,
                    "slug": slug,
                    "title": title,
                    "active_version": resolve_tryon_prompt_version(),
                    "legacy_prompt_chars": len(legacy),
                    "v2_prompt_chars": len(v2),
                    "style_lock_id": lock.style_id,
                    "silhouette": lock.silhouette,
                    "curl_pattern": lock.curl_pattern,
                }
            )

        report = {"prompt_compare": rows, "live_runs": []}
        if options["execute"]:
            self.stderr.write(
                "Live Runware benchmark is not bundled here. "
                "Use authorized selfies + RUNWARE_TRYON_SEED_MODE=fixed for reproducibility."
            )

        payload = json.dumps(report, indent=2, ensure_ascii=False)
        if options["output"]:
            Path(options["output"]).write_text(payload, encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"Wrote {options['output']}"))
        else:
            self.stdout.write(payload)
