"""Execute Hybrid V3 recognition against labeled samples."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from hair_advisor.services.hybrid_recognition.barcode import barcode_recognition_meta
from hair_advisor.services.hybrid_recognition.constants import AUTO_ATTACH_STATUSES
from hair_advisor.services.hybrid_recognition.pipeline import run_hybrid_image_recognition
from hair_advisor.services.product_recognition import lookup_by_barcode
from hair_advisor.services.barcode import validate_barcode_checksum

from .metrics import is_auto_attach_status
from .types import LabeledSample, SampleOutcome


def _failure_stage(sample: LabeledSample, status: str, meta: dict[str, Any]) -> str | None:
    if status == "insufficient_image_quality":
        return "image_quality"
    if status == "service_unavailable":
        return "backend_failure"
    if sample.evaluation_mode == "barcode_string":
        if status == "not_found":
            return "barcode_lookup"
        return "barcode_decode"
    if meta.get("ai_id_rejected"):
        return "ai_verification"
    if status == "not_found":
        if not meta.get("ocr_brand") and not meta.get("ocr_product_name"):
            return "ocr_extraction"
        if not meta.get("candidate_ids"):
            return "candidate_retrieval"
        return "candidate_ranking"
    if status in ("ambiguous", "probable_match"):
        return "product_confirmation"
    if status == "exact_match":
        return None
    return "candidate_ranking"


def run_ocr_fixture_sample(sample: LabeledSample, *, live_ai: bool) -> SampleOutcome:
    if live_ai:
        raise RuntimeError("live_ai mode requires image_file samples and explicit approval (HA_EVAL_LIVE_AI=1)")

    payload = sample.gemini_payload or {}
    t0 = time.perf_counter()
    products, meta = run_hybrid_image_recognition(payload, scan_method="evaluation_ocr_fixture", started_at=t0)
    latency = int((time.perf_counter() - t0) * 1000)
    status = str(meta.get("recognition_status") or "")
    candidate_ids = [p.pk for p in products]
    scores = meta.get("candidate_scores") if isinstance(meta.get("candidate_scores"), dict) else {}
    predicted = meta.get("verified_product_id") if isinstance(meta.get("verified_product_id"), int) else None
    auto = is_auto_attach_status(status) and (predicted is not None or len(products) == 1)
    if auto and predicted is None and products:
        predicted = products[0].pk

    return SampleOutcome(
        sample_id=sample.sample_id,
        scenario=sample.scenario,
        evaluation_mode=sample.evaluation_mode,
        recognition_status=status,
        predicted_product_id=predicted,
        candidate_ids=candidate_ids,
        candidate_scores={str(k): float(v) for k, v in scores.items()},
        latency_ms=meta.get("analytics", {}).get("recognition_latency_ms", latency)
        if isinstance(meta.get("analytics"), dict)
        else latency,
        failure_stage=_failure_stage(sample, status, meta),
        ai_fallback_used=bool(meta.get("analytics", {}).get("ai_fallback_used")) if isinstance(meta.get("analytics"), dict) else True,
        barcode_lookup_found=None,
        ground_truth_product_id=sample.ground_truth_product_id,
        ground_truth_resolved=bool(sample.ground_truth_product_id),
        auto_attached=auto,
    )


def run_barcode_sample(sample: LabeledSample) -> SampleOutcome:
    code = (sample.barcode or "").strip()
    valid, normalized = validate_barcode_checksum(code)
    t0 = time.perf_counter()
    if not valid:
        latency = int((time.perf_counter() - t0) * 1000)
        return SampleOutcome(
            sample_id=sample.sample_id,
            scenario=sample.scenario,
            evaluation_mode=sample.evaluation_mode,
            recognition_status="invalid_barcode",
            predicted_product_id=None,
            candidate_ids=[],
            candidate_scores={},
            latency_ms=latency,
            failure_stage="barcode_decode",
            ai_fallback_used=False,
            barcode_lookup_found=False,
            ground_truth_product_id=sample.ground_truth_product_id,
            ground_truth_resolved=bool(sample.ground_truth_product_id),
            auto_attached=False,
        )

    try:
        lookup = lookup_by_barcode(normalized)
    except Exception as exc:  # noqa: BLE001 — barcode stage isolation
        latency = int((time.perf_counter() - t0) * 1000)
        return SampleOutcome(
            sample_id=sample.sample_id,
            scenario=sample.scenario,
            evaluation_mode=sample.evaluation_mode,
            recognition_status="service_unavailable",
            predicted_product_id=None,
            candidate_ids=[],
            candidate_scores={},
            latency_ms=latency,
            failure_stage="backend_failure",
            ai_fallback_used=False,
            barcode_lookup_found=False,
            dataset_issue=str(exc),
            ground_truth_product_id=sample.ground_truth_product_id,
            ground_truth_resolved=bool(sample.ground_truth_product_id),
            auto_attached=False,
        )
    latency = int((time.perf_counter() - t0) * 1000)
    meta = barcode_recognition_meta(lookup, code=normalized, latency_ms=latency)
    status = str(meta.get("recognition_status") or "")
    care = lookup.get("care_product")
    predicted = care.pk if care and lookup.get("found") else None
    auto = bool(lookup.get("found")) and status in AUTO_ATTACH_STATUSES

    return SampleOutcome(
        sample_id=sample.sample_id,
        scenario=sample.scenario,
        evaluation_mode=sample.evaluation_mode,
        recognition_status=status,
        predicted_product_id=predicted,
        candidate_ids=[predicted] if predicted else [],
        candidate_scores={},
        latency_ms=latency,
        failure_stage=_failure_stage(sample, status, meta),
        ai_fallback_used=False,
        barcode_lookup_found=bool(lookup.get("found")),
        ground_truth_product_id=sample.ground_truth_product_id,
        ground_truth_resolved=bool(sample.ground_truth_product_id),
        auto_attached=auto,
    )


def run_image_file_sample(sample: LabeledSample, *, live_ai: bool) -> SampleOutcome:
    path = sample.image_path
    if not path or not Path(path).is_file():
        return SampleOutcome(
            sample_id=sample.sample_id,
            scenario=sample.scenario,
            evaluation_mode=sample.evaluation_mode,
            recognition_status="skipped",
            predicted_product_id=None,
            candidate_ids=[],
            candidate_scores={},
            latency_ms=0,
            failure_stage=None,
            ai_fallback_used=False,
            barcode_lookup_found=None,
            dataset_issue="image_file_missing",
            ground_truth_product_id=sample.ground_truth_product_id,
            ground_truth_resolved=bool(sample.ground_truth_product_id),
            auto_attached=False,
        )
    if not live_ai:
        return SampleOutcome(
            sample_id=sample.sample_id,
            scenario=sample.scenario,
            evaluation_mode=sample.evaluation_mode,
            recognition_status="skipped",
            predicted_product_id=None,
            candidate_ids=[],
            candidate_scores={},
            latency_ms=0,
            failure_stage=None,
            ai_fallback_used=False,
            barcode_lookup_found=None,
            dataset_issue="live_ai_required_for_image_file",
            ground_truth_product_id=sample.ground_truth_product_id,
            ground_truth_resolved=bool(sample.ground_truth_product_id),
            auto_attached=False,
        )
    raise RuntimeError("live_ai image pipeline not enabled in this command — implement when HA_EVAL_LIVE_AI=1")


def run_sample(sample: LabeledSample, *, live_ai: bool = False) -> SampleOutcome:
    if sample.evaluation_mode == "ocr_fixture":
        return run_ocr_fixture_sample(sample, live_ai=live_ai)
    if sample.evaluation_mode == "barcode_string":
        return run_barcode_sample(sample)
    if sample.evaluation_mode == "image_file":
        return run_image_file_sample(sample, live_ai=live_ai)
    raise ValueError(f"Unsupported evaluation_mode: {sample.evaluation_mode}")


def run_evaluation(
    samples: list[LabeledSample],
    *,
    live_ai: bool = False,
) -> list[SampleOutcome]:
    outcomes: list[SampleOutcome] = []
    for sample in samples:
        try:
            outcomes.append(run_sample(sample, live_ai=live_ai))
        except Exception as exc:  # noqa: BLE001 — evaluation must continue
            outcomes.append(
                SampleOutcome(
                    sample_id=sample.sample_id,
                    scenario=sample.scenario,
                    evaluation_mode=sample.evaluation_mode,
                    recognition_status="service_unavailable",
                    predicted_product_id=None,
                    candidate_ids=[],
                    candidate_scores={},
                    latency_ms=0,
                    failure_stage="backend_failure",
                    ai_fallback_used=False,
                    barcode_lookup_found=None,
                    dataset_issue=str(exc),
                    ground_truth_product_id=sample.ground_truth_product_id,
                    ground_truth_resolved=bool(sample.ground_truth_product_id),
                    auto_attached=False,
                )
            )
    return outcomes