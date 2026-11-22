"""Release quality gates (provisional targets — not proof of production accuracy)."""

from __future__ import annotations

from dataclasses import dataclass

from .types import MetricSummary

MIN_LABELED_FOR_GATES = 30


@dataclass
class QualityGateConfig:
    false_match_rate_max: float = 0.01
    false_not_found_rate_max: float = 0.05
    recall_at_5_min: float = 0.95


def evaluate_gates(summary: MetricSummary, config: QualityGateConfig | None = None) -> list[str]:
    config = config or QualityGateConfig()
    notes: list[str] = []

    if summary.catalog_present_samples < MIN_LABELED_FOR_GATES:
        notes.append(
            f"Quality gates NOT APPLIED: catalog-present samples={summary.catalog_present_samples} "
            f"(minimum {MIN_LABELED_FOR_GATES} required for gate enforcement)."
        )
        summary.quality_gates_passed = None
        return notes

    passed = True
    if summary.false_match_rate is not None and summary.false_match_rate > config.false_match_rate_max:
        passed = False
        notes.append(
            f"FAIL false_match_rate={summary.false_match_rate} > max {config.false_match_rate_max} "
            f"(n={summary.raw_metrics.get('false_match_denominator_auto_decisions', 0)})"
        )
    if summary.false_not_found_rate is not None and summary.false_not_found_rate > config.false_not_found_rate_max:
        passed = False
        notes.append(
            f"FAIL false_not_found_rate={summary.false_not_found_rate} > max {config.false_not_found_rate_max}"
        )
    if summary.recall_at_5 is not None and summary.recall_at_5 < config.recall_at_5_min:
        passed = False
        notes.append(f"FAIL recall@5={summary.recall_at_5} < min {config.recall_at_5_min}")

    if passed:
        notes.append("All configured quality gates PASSED for this labeled dataset.")
    summary.quality_gates_passed = passed
    return notes