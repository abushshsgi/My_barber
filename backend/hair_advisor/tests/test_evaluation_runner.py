from django.core.management import call_command
from django.test import TestCase

from ai.models import CareProduct
from hair_advisor.evaluation.dataset_loader import load_manifest
from hair_advisor.evaluation.runner import run_evaluation
from pathlib import Path


class EvaluationRunnerTests(TestCase):
    def setUp(self):
        CareProduct.objects.create(
            name="Repair Shampoo",
            brand="Clear",
            slug="eval-clear-repair",
            is_published=True,
            ingredients=["Aqua"],
        )
        CareProduct.objects.create(
            name="Volume Shampoo 300 ml",
            brand="Clear",
            slug="eval-clear-volume",
            is_published=True,
            ingredients=["Aqua"],
        )

    def test_offline_manifest_runs(self):
        manifest = Path(__file__).resolve().parents[1] / "evaluation" / "fixtures" / "offline_manifest.json"
        samples = load_manifest(manifest)
        outcomes = run_evaluation(samples, live_ai=False)
        self.assertEqual(len(outcomes), len(samples))
        self.assertTrue(any(o.recognition_status == "exact_match" for o in outcomes))

    def test_management_command_offline(self):
        call_command("evaluate_scanner", "--seed-catalog", verbosity=0)

    def test_generates_accuracy_report_artifact(self):
        repo_root = Path(__file__).resolve().parents[3]
        report_path = repo_root / "docs" / "HAIR_ADVISOR_SCANNER_V3_ACCURACY_REPORT.md"
        call_command(
            "evaluate_scanner",
            "--seed-catalog",
            f"--markdown-out={report_path}",
            verbosity=0,
        )
        self.assertTrue(report_path.is_file())
        text = report_path.read_text(encoding="utf-8")
        self.assertIn("NOT MEASURED", text)
        self.assertIn("offline", text.lower())