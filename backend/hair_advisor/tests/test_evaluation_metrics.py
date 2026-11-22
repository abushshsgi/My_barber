from django.test import SimpleTestCase

from hair_advisor.evaluation.metrics import compute_metrics
from hair_advisor.evaluation.quality_gates import evaluate_gates
from hair_advisor.evaluation.types import SampleOutcome


class EvaluationMetricsTests(SimpleTestCase):
    def test_false_match_rate_denominator(self):
        outcomes = [
            SampleOutcome(
                sample_id="a",
                scenario="x",
                evaluation_mode="ocr_fixture",
                recognition_status="exact_match",
                predicted_product_id=2,
                candidate_ids=[2],
                candidate_scores={},
                latency_ms=10,
                failure_stage=None,
                ai_fallback_used=True,
                barcode_lookup_found=None,
                ground_truth_product_id=1,
                ground_truth_resolved=True,
                auto_attached=True,
            ),
            SampleOutcome(
                sample_id="b",
                scenario="x",
                evaluation_mode="ocr_fixture",
                recognition_status="exact_match",
                predicted_product_id=1,
                candidate_ids=[1],
                candidate_scores={},
                latency_ms=12,
                failure_stage=None,
                ai_fallback_used=True,
                barcode_lookup_found=None,
                ground_truth_product_id=1,
                ground_truth_resolved=True,
                auto_attached=True,
            ),
        ]
        summary = compute_metrics(
            outcomes,
            dataset_path="test",
            manifest_stats={"ocr_fixture": 2},
            measurement_scope="unit",
        )
        self.assertEqual(summary.false_match_count, 1)
        self.assertEqual(summary.auto_decision_samples, 2)
        self.assertAlmostEqual(summary.false_match_rate or 0, 0.5)

    def test_recall_at_k(self):
        outcomes = [
            SampleOutcome(
                sample_id="c",
                scenario="x",
                evaluation_mode="ocr_fixture",
                recognition_status="ambiguous",
                predicted_product_id=None,
                candidate_ids=[5, 1, 9],
                candidate_scores={},
                latency_ms=5,
                failure_stage="product_confirmation",
                ai_fallback_used=True,
                barcode_lookup_found=None,
                ground_truth_product_id=1,
                ground_truth_resolved=True,
                auto_attached=False,
            ),
        ]
        summary = compute_metrics(
            outcomes,
            dataset_path="test",
            manifest_stats={},
            measurement_scope="unit",
        )
        self.assertEqual(summary.raw_metrics["recall_at_3_numerator"], 1)
        self.assertEqual(summary.recall_at_3, 1.0)

    def test_gates_not_applied_small_n(self):
        summary = compute_metrics(
            [],
            dataset_path="test",
            manifest_stats={},
            measurement_scope="unit",
        )
        notes = evaluate_gates(summary)
        self.assertIsNone(summary.quality_gates_passed)
        self.assertTrue(any("NOT APPLIED" in n for n in notes))