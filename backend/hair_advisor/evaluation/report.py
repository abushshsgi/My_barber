"""Markdown / JSON / CSV evaluation reports."""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .confusion_analysis import build_confusion_report
from .types import MetricSummary, SampleOutcome


def _fmt_rate(value: float | None) -> str:
    if value is None:
        return "NOT MEASURED"
    return f"{value * 100:.2f}%"


def export_json(
    summary: MetricSummary,
    outcomes: list[SampleOutcome],
    confusion: dict[str, Any],
    output_path: Path,
) -> None:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "measurement_scope": summary.measurement_scope,
        "summary": summary.__dict__,
        "outcomes": [o.__dict__ for o in outcomes],
        "confusion": confusion,
    }
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def export_csv(outcomes: list[SampleOutcome], output_path: Path) -> None:
    fields = [
        "sample_id",
        "scenario",
        "evaluation_mode",
        "recognition_status",
        "predicted_product_id",
        "ground_truth_product_id",
        "candidate_ids",
        "latency_ms",
        "failure_stage",
        "auto_attached",
        "dataset_issue",
    ]
    with output_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for o in outcomes:
            writer.writerow(
                {
                    "sample_id": o.sample_id,
                    "scenario": o.scenario,
                    "evaluation_mode": o.evaluation_mode,
                    "recognition_status": o.recognition_status,
                    "predicted_product_id": o.predicted_product_id,
                    "ground_truth_product_id": o.ground_truth_product_id,
                    "candidate_ids": "|".join(str(x) for x in o.candidate_ids),
                    "latency_ms": o.latency_ms,
                    "failure_stage": o.failure_stage,
                    "auto_attached": o.auto_attached,
                    "dataset_issue": o.dataset_issue or "",
                }
            )


def render_markdown(
    summary: MetricSummary,
    outcomes: list[SampleOutcome],
    confusion: dict[str, Any],
    *,
    manifest_stats: dict[str, int],
    dataset_issues: list[str],
) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    real_world = summary.real_image_samples > 0

    lines = [
        "# Hair Advisor Scanner V3 — Accuracy Report",
        "",
        f"_Generated: {ts}_",
        "",
        "## Executive summary",
        "",
    ]
    if not real_world:
        lines.extend(
            [
                "**Real-world camera accuracy: NOT MEASURED.**",
                "No verified on-disk product photograph samples were present in the evaluation manifest.",
                "Figures below reflect **offline OCR/barcode fixtures only** — not production recognition accuracy.",
                "",
            ]
        )
    else:
        lines.append(
            f"Evaluation includes **{summary.real_image_samples}** real image file(s); "
            "interpret metrics in context of dataset size and verification status."
        )
        lines.append("")

    lines.extend(
        [
            "## Test environment",
            "",
            f"- Dataset: `{summary.dataset_path}`",
            f"- Scope: {summary.measurement_scope}",
            f"- Total manifest rows: {manifest_stats.get('total', 0)}",
            f"- OCR/barcode fixtures: {summary.offline_fixture_samples}",
            f"- Real image files on disk: {summary.real_image_samples}",
            f"- Target collection goal: 50 products × 3–5 images (150–250) — **not yet collected in repo**",
            "",
            "## Ground-truth verification",
            "",
            "- Offline fixtures: `annotation_source=qa_synthetic_fixture` unless otherwise noted.",
            "- Independent human verification required before treating metrics as release evidence.",
            "",
        ]
    )

    if dataset_issues:
        lines.append("### Dataset inconsistencies")
        for issue in dataset_issues:
            lines.append(f"- {issue}")
        lines.append("")

    lines.extend(
        [
            "## Accuracy metrics (explicit denominators)",
            "",
            "| Metric | Value | Denominator / notes |",
            "|--------|-------|---------------------|",
            f"| False Match Rate | {_fmt_rate(summary.false_match_rate)} | "
            f"incorrect auto IDs / auto decisions ({summary.raw_metrics.get('false_match_denominator_auto_decisions', 0)}) |",
            f"| False Not Found Rate | {_fmt_rate(summary.false_not_found_rate)} | "
            f"catalog-present samples ({summary.raw_metrics.get('false_not_found_denominator_catalog_present', 0)}) |",
            f"| Exact auto accuracy | {_fmt_rate(summary.exact_auto_accuracy)} | evaluated={summary.evaluated_samples} |",
            f"| Recall@1 | {_fmt_rate(summary.recall_at_1)} | catalog-present |",
            f"| Recall@3 | {_fmt_rate(summary.recall_at_3)} | catalog-present |",
            f"| Recall@5 | {_fmt_rate(summary.recall_at_5)} | catalog-present |",
            f"| Ambiguous rate | {_fmt_rate(summary.ambiguous_rate)} | evaluated |",
            f"| Insufficient image rate | {_fmt_rate(summary.insufficient_image_rate)} | evaluated |",
            f"| Service failure rate | {_fmt_rate(summary.service_failure_rate)} | evaluated |",
            f"| AI fallback (fixture) | {_fmt_rate(summary.ai_fallback_rate)} | OCR fixtures use mocked Gemini payload |",
            f"| AI cost | NOT MEASURED | no billed live AI calls in default offline mode |",
            "",
            "## Latency (recognition engine only)",
            "",
            f"- Median: {summary.latency_median_ms if summary.latency_median_ms is not None else 'N/A'} ms",
            f"- P95: {summary.latency_p95_ms if summary.latency_p95_ms is not None else 'N/A'} ms",
            f"- Max: {summary.latency_max_ms if summary.latency_max_ms is not None else 'N/A'} ms",
            "",
            "## Quality gates",
            "",
        ]
    )

    if summary.quality_gates_passed is None:
        lines.append("_Gates not enforced (insufficient catalog-present labeled samples)._")
    elif summary.quality_gates_passed:
        lines.append("**Gates: PASSED** (for this dataset only).")
    else:
        lines.append("**Gates: FAILED** (for this dataset only).")
    for note in summary.quality_gate_notes:
        lines.append(f"- {note}")
    lines.append("")

    lines.extend(["## False match details", ""])
    fm = confusion.get("false_match_details") or []
    if not fm:
        lines.append("_No automatic false matches in this run._")
    else:
        for row in fm:
            lines.append(
                f"- `{row['sample_id']}` gt={row['ground_truth_product_id']} "
                f"pred={row['predicted_product_id']} ({row['scenario']})"
            )
    lines.append("")

    lines.extend(["## False not-found (catalog present)", ""])
    nf = confusion.get("catalog_present_not_found") or []
    if not nf:
        lines.append("_None in this run._")
    else:
        for row in nf:
            lines.append(
                f"- `{row['sample_id']}` gt={row['ground_truth_product_id']} "
                f"in_shortlist={row['in_candidate_shortlist']} stage={row['failure_stage']}"
            )
    lines.append("")

    lines.extend(["## Per-sample outcomes", ""])
    for o in outcomes:
        flag = f" **[{o.dataset_issue}]**" if o.dataset_issue else ""
        lines.append(
            f"- `{o.sample_id}` {o.scenario} → {o.recognition_status} "
            f"pred={o.predicted_product_id} gt={o.ground_truth_product_id} {o.latency_ms}ms{flag}"
        )

    lines.extend(
        [
            "",
            "## Deployment recommendation",
            "",
            "Do **not** treat unit/E2E pass rates as recognition accuracy.",
            "Collect the real-product image dataset, re-run `evaluate_scanner`, then reassess gates.",
            "",
        ]
    )
    return "\n".join(lines)