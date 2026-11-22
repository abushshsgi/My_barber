"""Deterministic accuracy metrics for scanner evaluation."""

from __future__ import annotations

import statistics
from typing import Any

from hair_advisor.services.hybrid_recognition.constants import (
    AUTO_ATTACH_STATUSES,
    EXACT_MATCH,
    INSUFFICIENT_IMAGE_QUALITY,
    NOT_FOUND,
    SERVICE_UNAVAILABLE,
)

from .types import MetricSummary, SampleOutcome

NOT_FOUND_STATUSES = frozenset({NOT_FOUND, "none", "product_not_found"})
NON_NOT_FOUND_FAILURES = frozenset({INSUFFICIENT_IMAGE_QUALITY, SERVICE_UNAVAILABLE, "ocr_failed", "service_unavailable"})


def _rate(numerator: int, denominator: int) -> float | None:
    if denominator <= 0:
        return None
    return round(numerator / denominator, 6)


def compute_metrics(
    outcomes: list[SampleOutcome],
    *,
    dataset_path: str,
    manifest_stats: dict[str, int],
    measurement_scope: str,
) -> MetricSummary:
    evaluated = [o for o in outcomes if not o.dataset_issue]
    skipped = [o for o in outcomes if o.dataset_issue]

    catalog_present = [o for o in evaluated if o.ground_truth_resolved and o.ground_truth_product_id]
    auto_decisions = [o for o in evaluated if o.auto_attached and o.predicted_product_id is not None]

    false_matches = [
        o
        for o in auto_decisions
        if o.ground_truth_product_id and o.predicted_product_id != o.ground_truth_product_id
    ]

    false_not_found = [
        o
        for o in catalog_present
        if o.recognition_status in NOT_FOUND_STATUSES and o.recognition_status not in NON_NOT_FOUND_FAILURES
    ]

    exact_correct = [
        o
        for o in auto_decisions
        if o.ground_truth_product_id and o.predicted_product_id == o.ground_truth_product_id
    ]

    latencies = [o.latency_ms for o in evaluated if o.latency_ms >= 0]

    recall_denom = len(catalog_present)
    r1 = sum(1 for o in catalog_present if o.top_k_contains_truth(1))
    r3 = sum(1 for o in catalog_present if o.top_k_contains_truth(3))
    r5 = sum(1 for o in catalog_present if o.top_k_contains_truth(5))

    ambiguous = sum(1 for o in evaluated if o.recognition_status in ("ambiguous", "probable_match"))
    insufficient = sum(1 for o in evaluated if o.recognition_status == INSUFFICIENT_IMAGE_QUALITY)
    service_fail = sum(1 for o in evaluated if o.recognition_status in NON_NOT_FOUND_FAILURES)
    ai_used = sum(1 for o in evaluated if o.ai_fallback_used)

    raw: dict[str, Any] = {
        "false_match_denominator_auto_decisions": len(auto_decisions),
        "false_not_found_denominator_catalog_present": recall_denom,
        "exact_auto_correct": len(exact_correct),
        "recall_at_1_numerator": r1,
        "recall_at_3_numerator": r3,
        "recall_at_5_numerator": r5,
        "skipped_with_dataset_issue": len(skipped),
    }

    return MetricSummary(
        dataset_path=dataset_path,
        total_samples=len(outcomes),
        evaluated_samples=len(evaluated),
        skipped_samples=len(skipped),
        real_image_samples=manifest_stats.get("real_image_files_present", 0),
        offline_fixture_samples=manifest_stats.get("ocr_fixture", 0) + manifest_stats.get("barcode_string", 0),
        catalog_present_samples=recall_denom,
        auto_decision_samples=len(auto_decisions),
        false_match_count=len(false_matches),
        false_match_rate=_rate(len(false_matches), len(auto_decisions)),
        false_not_found_count=len(false_not_found),
        false_not_found_rate=_rate(len(false_not_found), recall_denom),
        exact_auto_accuracy=_rate(len(exact_correct), len(evaluated)) if evaluated else None,
        recall_at_1=_rate(r1, recall_denom),
        recall_at_3=_rate(r3, recall_denom),
        recall_at_5=_rate(r5, recall_denom),
        ambiguous_rate=_rate(ambiguous, len(evaluated)) if evaluated else None,
        insufficient_image_rate=_rate(insufficient, len(evaluated)) if evaluated else None,
        service_failure_rate=_rate(service_fail, len(evaluated)) if evaluated else None,
        ai_fallback_rate=_rate(ai_used, len(evaluated)) if evaluated else None,
        ai_requests_total=ai_used,
        latency_median_ms=round(statistics.median(latencies), 2) if latencies else None,
        latency_p95_ms=round(_percentile(latencies, 95), 2) if latencies else None,
        latency_max_ms=max(latencies) if latencies else None,
        barcode_decode_evaluated=sum(1 for o in evaluated if o.evaluation_mode == "barcode_string"),
        quality_gates_passed=None,
        measurement_scope=measurement_scope,
        raw_metrics=raw,
    )


def _percentile(values: list[int], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    k = (len(ordered) - 1) * (pct / 100.0)
    f = int(k)
    c = min(f + 1, len(ordered) - 1)
    if f == c:
        return float(ordered[f])
    return ordered[f] + (ordered[c] - ordered[f]) * (k - f)


def is_auto_attach_status(status: str) -> bool:
    return status in AUTO_ATTACH_STATUSES