"""False-match and variant confusion reporting."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from .types import SampleOutcome


def build_confusion_report(outcomes: list[SampleOutcome]) -> dict[str, Any]:
    false_pairs: Counter[tuple[int | None, int | None]] = Counter()
    false_details: list[dict[str, Any]] = []
    not_found_misses: list[dict[str, Any]] = []

    for o in outcomes:
        if o.dataset_issue:
            continue
        gt = o.ground_truth_product_id
        if not gt:
            continue

        if o.auto_attached and o.predicted_product_id and o.predicted_product_id != gt:
            key = (gt, o.predicted_product_id)
            false_pairs[key] += 1
            false_details.append(
                {
                    "sample_id": o.sample_id,
                    "ground_truth_product_id": gt,
                    "predicted_product_id": o.predicted_product_id,
                    "recognition_status": o.recognition_status,
                    "scenario": o.scenario,
                    "failure_stage": o.failure_stage,
                    "candidate_ids": o.candidate_ids,
                    "candidate_scores": o.candidate_scores,
                }
            )

        if o.recognition_status in ("not_found", "none") and o.ground_truth_resolved:
            in_shortlist = gt in o.candidate_ids
            not_found_misses.append(
                {
                    "sample_id": o.sample_id,
                    "ground_truth_product_id": gt,
                    "in_candidate_shortlist": in_shortlist,
                    "candidate_ids": o.candidate_ids,
                    "failure_stage": o.failure_stage or "candidate_ranking",
                    "scenario": o.scenario,
                }
            )

    top_confusions = [
        {"ground_truth_product_id": gt, "predicted_product_id": pred, "count": count}
        for (gt, pred), count in false_pairs.most_common(25)
    ]

    by_stage: dict[str, int] = defaultdict(int)
    for row in false_details + not_found_misses:
        by_stage[str(row.get("failure_stage") or "unknown")] += 1

    return {
        "false_match_pairs": top_confusions,
        "false_match_details": false_details,
        "catalog_present_not_found": not_found_misses,
        "failure_stage_counts": dict(by_stage),
    }