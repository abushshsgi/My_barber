"""Offline Hybrid Scanner V3 accuracy evaluation."""

from __future__ import annotations

import os
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from ai.models import CareProduct
from hair_advisor.evaluation.confusion_analysis import build_confusion_report
from hair_advisor.evaluation.dataset_loader import count_manifest_stats, load_manifest, resolve_ground_truth_ids
from hair_advisor.evaluation.metrics import compute_metrics
from hair_advisor.evaluation.quality_gates import evaluate_gates
from hair_advisor.evaluation.report import export_csv, export_json, render_markdown
from hair_advisor.evaluation.runner import run_evaluation


class Command(BaseCommand):
    help = (
        "Run Hybrid Scanner V3 accuracy evaluation (offline fixtures by default). "
        "Use MYSALOON_FORCE_SQLITE_TESTS=1 for isolated SQLite (no production DB)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dataset",
            default="hair_advisor/evaluation/fixtures/offline_manifest.json",
            help="Path to JSON manifest (relative to backend/ or absolute).",
        )
        parser.add_argument(
            "--output-dir",
            default="hair_advisor/evaluation/reports",
            help="Directory for JSON/CSV/Markdown reports.",
        )
        parser.add_argument(
            "--markdown-out",
            default="",
            help="Optional path to write human report (e.g. docs/HAIR_ADVISOR_SCANNER_V3_ACCURACY_REPORT.md).",
        )
        parser.add_argument(
            "--live-ai",
            action="store_true",
            help="Allow live Gemini on image_file samples (requires HA_EVAL_LIVE_AI=1).",
        )
        parser.add_argument(
            "--seed-catalog",
            action="store_true",
            help="Create eval-clear-* CareProduct rows used by offline manifest (test DB only).",
        )
        parser.add_argument(
            "--enforce-gates",
            action="store_true",
            help="Exit with code 1 if quality gates fail (only when n>=30 catalog-present samples).",
        )

    def handle(self, *args, **options):
        live_ai = bool(options["live_ai"])
        if live_ai and os.environ.get("HA_EVAL_LIVE_AI") != "1":
            raise CommandError("Refusing --live-ai without HA_EVAL_LIVE_AI=1 (paid API guard).")

        dataset_arg = options["dataset"]
        dataset_path = Path(dataset_arg)
        if not dataset_path.is_file():
            backend = Path(__file__).resolve().parents[2]
            dataset_path = backend / dataset_arg
        if not dataset_path.is_file():
            raise CommandError(f"Dataset not found: {options['dataset']}")

        if options["seed_catalog"]:
            self._seed_eval_products()

        samples = load_manifest(dataset_path)
        samples, dataset_issues = resolve_ground_truth_ids(samples)
        manifest_stats = count_manifest_stats(samples)

        scope = "offline_ocr_and_barcode_fixtures"
        if manifest_stats.get("real_image_files_present", 0) > 0:
            scope = "mixed_offline_and_real_images"

        outcomes = run_evaluation(samples, live_ai=live_ai)
        summary = compute_metrics(
            outcomes,
            dataset_path=str(dataset_path),
            manifest_stats=manifest_stats,
            measurement_scope=scope,
        )
        gate_notes = evaluate_gates(summary)
        summary.quality_gate_notes = gate_notes
        confusion = build_confusion_report(outcomes)

        backend_root = Path(__file__).resolve().parents[3]
        out_dir = Path(options["output_dir"])
        if not out_dir.is_absolute():
            out_dir = backend_root / out_dir
        out_dir.mkdir(parents=True, exist_ok=True)

        export_json(summary, outcomes, confusion, out_dir / "accuracy_summary.json")
        export_csv(outcomes, out_dir / "accuracy_samples.csv")
        md = render_markdown(summary, outcomes, confusion, manifest_stats=manifest_stats, dataset_issues=dataset_issues)
        (out_dir / "accuracy_report.md").write_text(md, encoding="utf-8")

        md_target = options.get("markdown_out") or ""
        if md_target:
            md_path = Path(md_target)
            if not md_path.is_absolute():
                repo_root = Path(__file__).resolve().parents[4]
                md_path = repo_root / md_target
            md_path.parent.mkdir(parents=True, exist_ok=True)
            md_path.write_text(md, encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"Wrote {md_path}"))

        self.stdout.write(md)
        self.stdout.write(self.style.SUCCESS(f"Reports: {out_dir}"))

        if options["enforce_gates"] and summary.quality_gates_passed is False:
            raise CommandError("Quality gates failed")

    def _seed_eval_products(self):
        CareProduct.objects.get_or_create(
            slug="eval-clear-repair",
            defaults={
                "name": "Repair Shampoo",
                "brand": "Clear",
                "is_published": True,
                "ingredients": ["Aqua", "Glycerin"],
            },
        )
        CareProduct.objects.get_or_create(
            slug="eval-clear-volume",
            defaults={
                "name": "Volume Shampoo 300 ml",
                "brand": "Clear",
                "is_published": True,
                "ingredients": ["Aqua"],
            },
        )
        self.stdout.write(self.style.WARNING("Seeded eval-clear-* catalog rows (non-production QA slugs)."))