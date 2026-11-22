"""Evaluation sample types (no production DB writes)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

EvaluationMode = Literal["ocr_fixture", "barcode_string", "image_file", "live_ai"]
ScenarioTag = str


@dataclass
class LabeledSample:
    sample_id: str
    evaluation_mode: EvaluationMode
    scenario: ScenarioTag
    expected_catalog_presence: bool
    annotation_source: str
    annotation_verified: bool
    ground_truth_product_id: int | None = None
    ground_truth_product_slug: str | None = None
    brand: str = ""
    product_name: str = ""
    variant: str = ""
    volume_ml: int | None = None
    barcode: str | None = None
    image_path: str | None = None
    capture_device: str | None = None
    lighting_condition: str | None = None
    capture_angle: str | None = None
    image_quality_label: str | None = None
    gemini_payload: dict[str, Any] | None = None
    expect_status: str | None = None
    notes: str = ""

    def catalog_absent(self) -> bool:
        return not self.expected_catalog_presence


@dataclass
class SampleOutcome:
    sample_id: str
    scenario: str
    evaluation_mode: str
    recognition_status: str
    predicted_product_id: int | None
    candidate_ids: list[int]
    candidate_scores: dict[str, float]
    latency_ms: int
    failure_stage: str | None
    ai_fallback_used: bool
    barcode_lookup_found: bool | None
    dataset_issue: str | None = None
    ground_truth_product_id: int | None = None
    ground_truth_resolved: bool = False
    auto_attached: bool = False

    def top_k_contains_truth(self, k: int) -> bool:
        if not self.ground_truth_product_id:
            return False
        return self.ground_truth_product_id in self.candidate_ids[:k]


@dataclass
class MetricSummary:
    dataset_path: str
    total_samples: int
    evaluated_samples: int
    skipped_samples: int
    real_image_samples: int
    offline_fixture_samples: int
    catalog_present_samples: int
    auto_decision_samples: int
    false_match_count: int
    false_match_rate: float | None
    false_not_found_count: int
    false_not_found_rate: float | None
    exact_auto_accuracy: float | None
    recall_at_1: float | None
    recall_at_3: float | None
    recall_at_5: float | None
    ambiguous_rate: float | None
    insufficient_image_rate: float | None
    service_failure_rate: float | None
    ai_fallback_rate: float | None
    ai_requests_total: int
    latency_median_ms: float | None
    latency_p95_ms: float | None
    latency_max_ms: float | None
    barcode_decode_evaluated: int
    quality_gates_passed: bool | None
    quality_gate_notes: list[str] = field(default_factory=list)
    measurement_scope: str = ""
    raw_metrics: dict[str, Any] = field(default_factory=dict)